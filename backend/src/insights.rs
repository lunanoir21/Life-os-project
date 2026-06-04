use axum::extract::State;
use axum::Json;
use sqlx::Row;

use crate::error::AppError;
use crate::utils::now_ms;
use crate::AppState;

fn insight_id() -> String {
    format!("insight-{}", now_ms())
}

fn calc_trend(current: f64, previous: f64) -> &'static str {
    if previous == 0.0 {
        return if current > 0.0 { "up" } else { "stable" };
    }
    let change = (current - previous) / previous * 100.0;
    if change > 5.0 {
        "up"
    } else if change < -5.0 {
        "down"
    } else {
        "stable"
    }
}

pub async fn get_insights(State(st): State<AppState>) -> Result<Json<serde_json::Value>, AppError> {
    let now = now_ms();
    let today_ms = {
        let s = now / 1000;
        (s - s % 86400) * 1000
    };
    let today_end = today_ms + 86_400_000 - 1;

    // Week boundaries (Mon-based)
    let days_since_epoch = today_ms / 86_400_000;
    let day_of_week = (days_since_epoch + 3) % 7; // 0=Mon
    let this_week_start = today_ms - day_of_week * 86_400_000;
    let last_week_start = this_week_start - 7 * 86_400_000;
    let last_week_end = this_week_start - 1;

    // Month boundaries
    let (this_month_start, last_month_start, last_month_end) = {
        use chrono::{Datelike, TimeZone, Utc};
        let dt = Utc
            .timestamp_millis_opt(now)
            .single()
            .unwrap_or_else(Utc::now);
        let tms = Utc
            .with_ymd_and_hms(dt.year(), dt.month(), 1, 0, 0, 0)
            .single()
            .unwrap_or_else(Utc::now)
            .timestamp_millis();
        let (lmy, lmm) = if dt.month() == 1 {
            (dt.year() - 1, 12u32)
        } else {
            (dt.year(), dt.month() - 1)
        };
        let lms = Utc
            .with_ymd_and_hms(lmy, lmm, 1, 0, 0, 0)
            .single()
            .unwrap_or_else(Utc::now)
            .timestamp_millis();
        let lme = tms - 1;
        (tms, lms, lme)
    };

    let mut insights: Vec<serde_json::Value> = Vec::new();

    // Tasks
    let all_tasks = sqlx::query(
        "SELECT id, status, priority, completedAt, createdAt, dueDate FROM Task WHERE archived = 0",
    )
    .fetch_all(&st.db)
    .await?;
    let total_tasks = all_tasks.len() as f64;
    let done_tasks = all_tasks
        .iter()
        .filter(|r| {
            r.try_get::<String, _>("status")
                .map(|s| s == "done")
                .unwrap_or(false)
        })
        .count() as f64;
    let task_completion_rate = if total_tasks > 0.0 {
        done_tasks / total_tasks * 100.0
    } else {
        0.0
    };

    let tasks_this_week = all_tasks
        .iter()
        .filter(|r| {
            if r.try_get::<String, _>("status")
                .map(|s| s != "done")
                .unwrap_or(true)
            {
                return false;
            }
            r.try_get::<Option<i64>, _>("completedAt")
                .ok()
                .flatten()
                .map(|t| t >= this_week_start)
                .unwrap_or(false)
        })
        .count() as f64;
    let tasks_last_week = all_tasks
        .iter()
        .filter(|r| {
            if r.try_get::<String, _>("status")
                .map(|s| s != "done")
                .unwrap_or(true)
            {
                return false;
            }

            r.try_get::<Option<i64>, _>("completedAt")
                .ok()
                .flatten()
                .map(|t| t >= last_week_start && t <= last_week_end)
                .unwrap_or(false)
        })
        .count() as f64;
    let task_trend = calc_trend(tasks_this_week, tasks_last_week);

    let overdue = all_tasks
        .iter()
        .filter(|r| {
            if r.try_get::<String, _>("status")
                .map(|s| s == "done")
                .unwrap_or(false)
            {
                return false;
            }
            r.try_get::<Option<i64>, _>("dueDate")
                .ok()
                .flatten()
                .map(|d| d < today_ms)
                .unwrap_or(false)
        })
        .count() as i64;

    if overdue > 0 {
        insights.push(serde_json::json!({
            "id": insight_id(), "category": "productivity",
            "title": "Overdue Tasks Need Attention",
            "description": format!("You have {} overdue task{}. Consider reprioritizing or breaking them into smaller steps.", overdue, if overdue > 1 { "s" } else { "" }),
            "trend": "down", "trendValue": overdue.to_string(), "module": "tasks"
        }));
    }

    if tasks_last_week > 0.0 || tasks_this_week > 0.0 {
        let change = if tasks_last_week > 0.0 {
            ((tasks_this_week - tasks_last_week) / tasks_last_week * 100.0) as i64
        } else if tasks_this_week > 0.0 {
            100
        } else {
            0
        };
        insights.push(serde_json::json!({
            "id": insight_id(), "category": "productivity",
            "title": "Weekly Task Progress",
            "description": format!("You've completed {:.0} task{} this week, {} {}% from last week's {:.0}. {}",
                tasks_this_week, if tasks_this_week != 1.0 { "s" } else { "" },
                if change >= 0 { "up" } else { "down" }, change.abs(), tasks_last_week,
                if change >= 0 { "Keep up the great momentum!" } else { "Try to pick up the pace this week." }),
            "trend": task_trend,
            "trendValue": format!("{}{}%", if change >= 0 { "+" } else { "" }, change),
            "module": "tasks"
        }));
    }

    // Habits
    let habits = sqlx::query("SELECT id, name, icon FROM Habit WHERE archived = 0")
        .fetch_all(&st.db)
        .await?;
    let total_habits = habits.len() as f64;
    let mut completed_today = 0f64;
    for h in &habits {
        let hid: String = h.try_get("id").unwrap_or_default();
        let c: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM HabitLog WHERE habitId = ? AND date >= ? AND date <= ?",
        )
        .bind(&hid)
        .bind(today_ms)
        .bind(today_end)
        .fetch_one(&st.db)
        .await?;
        if c > 0 {
            completed_today += 1.0;
        }
    }
    let habit_consistency = if total_habits > 0.0 {
        completed_today / total_habits * 100.0
    } else {
        0.0
    };

    // Best habit streak
    let mut max_streak = 0i64;
    let mut max_streak_name = String::new();
    for h in &habits {
        let hid: String = h.try_get("id").unwrap_or_default();
        let logs =
            sqlx::query("SELECT date FROM HabitLog WHERE habitId = ? ORDER BY date DESC LIMIT 100")
                .bind(&hid)
                .fetch_all(&st.db)
                .await?;
        let mut streak = 0i64;
        let mut check = today_ms;
        for _ in 0..60 {
            let day_end = check + 86_400_000 - 1;
            let has = logs.iter().any(|l| {
                let d = l.try_get::<i64, _>("date").unwrap_or(-1);
                d >= check && d <= day_end
            });
            if has {
                streak += 1;
                check -= 86_400_000;
            } else {
                break;
            }
        }
        if streak > max_streak {
            max_streak = streak;
            max_streak_name = h.try_get("name").unwrap_or_default();
        }
    }

    if max_streak >= 3 {
        insights.push(serde_json::json!({
            "id": insight_id(), "category": "wellness",
            "title": "Habit Streak Achievement",
            "description": format!("You've maintained a {}-day streak on \"{}\" — {}",
                max_streak, max_streak_name,
                if max_streak >= 14 { "your longest yet! Incredible consistency!" }
                else if max_streak >= 7 { "that's a full week! Keep going!" }
                else { "great start, keep it up!" }),
            "trend": if max_streak >= 7 { "up" } else { "stable" },
            "trendValue": format!("{} days", max_streak),
            "module": "habits"
        }));
    }

    if total_habits > 0.0 {
        insights.push(serde_json::json!({
            "id": insight_id(), "category": "wellness",
            "title": "Habit Consistency",
            "description": format!("You've completed {:.0} of {:.0} habits today ({:.0}%). {}",
                completed_today, total_habits, habit_consistency,
                if habit_consistency >= 80.0 { "Outstanding consistency!" }
                else if habit_consistency >= 50.0 { "Good progress — try to complete the remaining ones!" }
                else { "Focus on building momentum by completing at least one more habit today." }),
            "trend": "stable", "trendValue": format!("{:.0}%", habit_consistency), "module": "habits"
        }));
    }

    // Goals
    let active_goals = sqlx::query(
        "SELECT id, title, progress, startDate, targetDate FROM Goal WHERE status = 'in-progress' AND archived = 0"
    ).fetch_all(&st.db).await?;
    if !active_goals.is_empty() {
        let total_g = active_goals.len() as f64;
        let avg_progress: f64 = active_goals
            .iter()
            .map(|r| r.try_get::<i64, _>("progress").unwrap_or(0) as f64)
            .sum::<f64>()
            / total_g;
        let goals_ahead = active_goals
            .iter()
            .filter(|r| {
                let (sd, td) = (
                    r.try_get::<Option<i64>, _>("startDate").ok().flatten(),
                    r.try_get::<Option<i64>, _>("targetDate").ok().flatten(),
                );
                let prog = r.try_get::<i64, _>("progress").unwrap_or(0) as f64;
                if let (Some(s), Some(t)) = (sd, td) {
                    let total_dur = (t - s) as f64;
                    let elapsed = (now - s) as f64;
                    total_dur > 0.0 && elapsed / total_dur < 0.5 && prog > 50.0
                } else {
                    false
                }
            })
            .count() as i64;
        let goals_at_risk = active_goals
            .iter()
            .filter(|r| {
                let (sd, td) = (
                    r.try_get::<Option<i64>, _>("startDate").ok().flatten(),
                    r.try_get::<Option<i64>, _>("targetDate").ok().flatten(),
                );
                let prog = r.try_get::<i64, _>("progress").unwrap_or(0) as f64;
                if let (Some(s), Some(t)) = (sd, td) {
                    let total_dur = (t - s) as f64;
                    let elapsed = (now - s) as f64;
                    total_dur > 0.0 && elapsed / total_dur > 0.5 && prog < 50.0
                } else {
                    false
                }
            })
            .count() as i64;

        insights.push(serde_json::json!({
            "id": insight_id(), "category": "goals",
            "title": "Goal Progress Overview",
            "description": format!("Across {} active goal{}, average progress is {:.0}%. {}",
                total_g as i64, if total_g > 1.0 { "s" } else { "" }, avg_progress,
                if goals_ahead > 0 { format!("{} goal{} ahead of schedule!", goals_ahead, if goals_ahead > 1 { "s are" } else { " is" }) }
                else if goals_at_risk > 0 { format!("{} goal{} need{} attention — behind schedule.", goals_at_risk, if goals_at_risk > 1 { "s" } else { "" }, if goals_at_risk > 1 { "" } else { "s" }) }
                else { "All goals are on track.".to_string() }),
            "trend": if goals_ahead > goals_at_risk { "up" } else if goals_at_risk > 0 { "down" } else { "stable" },
            "trendValue": format!("{:.0}%", avg_progress), "module": "goals"
        }));
    }

    // Finance
    let this_month_expenses: f64 = sqlx::query_scalar(
        "SELECT CAST(COALESCE(SUM(amount), 0) AS REAL) FROM \"Transaction\" WHERE type = 'expense' AND date >= ?"
    ).bind(this_month_start).fetch_one(&st.db).await?;
    let last_month_expenses: f64 = sqlx::query_scalar(
        "SELECT CAST(COALESCE(SUM(amount), 0) AS REAL) FROM \"Transaction\" WHERE type = 'expense' AND date >= ? AND date <= ?"
    ).bind(last_month_start).bind(last_month_end).fetch_one(&st.db).await?;
    let this_month_income: f64 = sqlx::query_scalar(
        "SELECT CAST(COALESCE(SUM(amount), 0) AS REAL) FROM \"Transaction\" WHERE type = 'income' AND date >= ?"
    ).bind(this_month_start).fetch_one(&st.db).await?;

    if this_month_expenses > 0.0 || last_month_expenses > 0.0 {
        let change = if last_month_expenses > 0.0 {
            ((this_month_expenses - last_month_expenses) / last_month_expenses * 100.0) as i64
        } else {
            if this_month_expenses > 0.0 {
                100
            } else {
                0
            }
        };
        let savings_rate = if this_month_income > 0.0 {
            ((this_month_income - this_month_expenses) / this_month_income * 100.0) as i64
        } else {
            0
        };
        insights.push(serde_json::json!({
            "id": insight_id(), "category": "finance",
            "title": "Spending Pattern Analysis",
            "description": format!("{} {}% compared to last month. {} {}",
                if change > 0 { "Your spending is up" } else if change < 0 { "Your spending is down" } else { "Your spending is stable" },
                change.abs(),
                if this_month_income > 0.0 { format!("Savings rate: {}%.", savings_rate.max(0)) } else { String::new() },
                if savings_rate >= 20 { "Great savings discipline!" } else if savings_rate >= 0 { "Consider ways to increase your savings rate." } else { "Spending exceeds income — review your budget carefully." }),
            "trend": if change > 10 { "down" } else if change < -5 { "up" } else { "stable" },
            "trendValue": format!("{}{}%", if change >= 0 { "+" } else { "" }, change),
            "module": "finance"
        }));
    }

    // Mood (journal)
    let journal_scores = sqlx::query_scalar::<_, i64>(
        "SELECT moodScore FROM JournalEntry WHERE moodScore IS NOT NULL AND date >= ? LIMIT 14",
    )
    .bind(now - 14 * 86_400_000)
    .fetch_all(&st.db)
    .await
    .unwrap_or_default();
    let avg_mood = if !journal_scores.is_empty() {
        journal_scores.iter().sum::<i64>() as f64 / journal_scores.len() as f64
    } else {
        0.0
    };
    if journal_scores.len() >= 3 {
        insights.push(serde_json::json!({
            "id": insight_id(), "category": "wellness",
            "title": "Mood Patterns",
            "description": format!("Your average mood over the past 2 weeks is {:.1}/5. {}",
                avg_mood,
                if avg_mood >= 3.5 { "You seem to be in a positive headspace!" }
                else if avg_mood >= 2.5 { "Your mood has been moderate. Consider activities that boost your well-being." }
                else { "It seems like a tough period. Remember to practice self-care and reach out if needed." }),
            "trend": if avg_mood >= 3.5 { "up" } else if avg_mood >= 2.5 { "stable" } else { "down" },
            "trendValue": format!("{:.1}/5", avg_mood),
            "module": "journal"
        }));
    }

    // Scores
    let productivity_score = (task_completion_rate * 0.4
        + habit_consistency * 0.3
        + if !active_goals.is_empty() {
            active_goals
                .iter()
                .map(|r| r.try_get::<i64, _>("progress").unwrap_or(0) as f64)
                .sum::<f64>()
                / active_goals.len() as f64
                * 0.3
        } else {
            0.0
        })
    .min(100.0) as i64;
    let mood_score = (avg_mood / 5.0 * 100.0).min(100.0);
    let wellness_score = (mood_score * 0.5 + habit_consistency * 0.3 + 0.0).min(100.0) as i64;

    let task_trend_val = calc_trend(tasks_this_week, tasks_last_week);
    let productivity_trend = task_trend_val;
    let wellness_trend = if avg_mood >= 3.5 {
        "up"
    } else if avg_mood >= 2.5 {
        "stable"
    } else {
        "down"
    };

    // Ensure at least 4 insights
    if total_tasks == 0.0 {
        insights.push(serde_json::json!({ "id": insight_id(), "category": "productivity", "title": "Start Tracking Tasks", "description": "No tasks found yet. Start adding tasks to get personalized productivity insights.", "trend": "stable", "module": "tasks" }));
    }
    if total_habits == 0.0 {
        insights.push(serde_json::json!({ "id": insight_id(), "category": "wellness", "title": "Build Healthy Habits", "description": "No habits tracked yet. Create daily habits to build consistency.", "trend": "stable", "module": "habits" }));
    }
    if active_goals.is_empty() {
        insights.push(serde_json::json!({ "id": insight_id(), "category": "goals", "title": "Set Meaningful Goals", "description": "No active goals found. Setting clear, measurable goals is the first step toward achieving them.", "trend": "stable", "module": "goals" }));
    }
    if this_month_expenses == 0.0 && this_month_income == 0.0 {
        insights.push(serde_json::json!({ "id": insight_id(), "category": "finance", "title": "Track Your Finances", "description": "No financial transactions recorded yet. Start tracking income and expenses.", "trend": "stable", "module": "finance" }));
    }

    // Pick 1 per category, then fill up to 6
    let categories = ["productivity", "wellness", "finance", "goals"];
    let mut selected: Vec<serde_json::Value> = Vec::new();
    for cat in &categories {
        if let Some(i) = insights
            .iter()
            .find(|i| i["category"].as_str() == Some(cat))
        {
            selected.push(i.clone());
        }
    }
    for i in &insights {
        if selected.len() >= 6 {
            break;
        }
        if !selected.iter().any(|s| s["id"] == i["id"]) {
            selected.push(i.clone());
        }
    }
    let selected: Vec<serde_json::Value> = selected.into_iter().take(6).collect();

    Ok(Json(serde_json::json!({
        "productivityScore": productivity_score,
        "wellnessScore": wellness_score,
        "productivityTrend": productivity_trend,
        "wellnessTrend": wellness_trend,
        "insights": selected,
        "generatedAt": crate::prisma_dt::PrismaDateTime(now).to_iso(),
    })))
}

pub async fn get_ai_insights(
    State(st): State<AppState>,
) -> Result<Json<serde_json::Value>, AppError> {
    let now = now_ms();
    let hour = (now / 3_600_000) % 24;

    let task_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Task WHERE archived = 0")
        .fetch_one(&st.db)
        .await?;
    let completed: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM Task WHERE status = 'done' AND archived = 0")
            .fetch_one(&st.db)
            .await?;
    let pending = task_count - completed;
    let habit_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Habit WHERE archived = 0")
        .fetch_one(&st.db)
        .await?;

    let mut insights = Vec::<serde_json::Value>::new();

    if pending > 5 {
        insights.push(serde_json::json!({ "title": "Focus Priority", "text": format!("You have {} pending tasks. Start with the highest priority one and work through them systematically.", pending) }));
    } else if pending > 0 {
        insights.push(serde_json::json!({ "title": "Task Momentum", "text": format!("{} task{} remaining. You're making great progress — keep the momentum going!", pending, if pending > 1 { "s" } else { "" }) }));
    } else if task_count == 0 {
        insights.push(serde_json::json!({ "title": "Get Started", "text": "No tasks yet? Start by adding your top 3 priorities for the day." }));
    }

    if completed > 0 {
        insights.push(serde_json::json!({ "title": "Progress Check", "text": format!("You've completed {} task{}. {}", completed, if completed > 1 { "s" } else { "" }, if completed >= 5 { "Outstanding productivity today!" } else { "Keep building on this momentum!" }) }));
    }

    if habit_count == 0 {
        insights.push(serde_json::json!({ "title": "Build Habits", "text": "Start building positive habits today. Even one small daily habit can create big changes over time." }));
    } else {
        insights.push(serde_json::json!({ "title": "Habit Power", "text": format!("You're tracking {} habit{}. Consistency is the key — try to complete them at the same time each day.", habit_count, if habit_count > 1 { "s" } else { "" }) }));
    }

    if hour < 10 {
        insights.push(serde_json::json!({ "title": "Morning Focus", "text": "Start your day by tackling the most important task first. Morning hours are peak productivity time." }));
    } else if hour < 14 {
        insights.push(serde_json::json!({ "title": "Midday Check", "text": "How's your day going? Take a moment to review your progress and adjust priorities if needed." }));
    } else if hour < 18 {
        insights.push(serde_json::json!({ "title": "Afternoon Push", "text": "Keep the energy up! Break remaining tasks into smaller steps to maintain focus." }));
    } else {
        insights.push(serde_json::json!({ "title": "Evening Reflection", "text": "Wind down by reflecting on today's accomplishments and planning tomorrow's priorities." }));
    }

    let insights: Vec<serde_json::Value> = insights.into_iter().take(3).collect();
    Ok(Json(serde_json::json!({ "insights": insights })))
}
