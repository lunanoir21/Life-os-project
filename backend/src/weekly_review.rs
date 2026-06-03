use axum::extract::State;
use axum::Json;
use sqlx::Row;

use crate::error::AppError;
use crate::utils::now_ms;
use crate::AppState;

pub async fn get_weekly_review(State(st): State<AppState>) -> Result<Json<serde_json::Value>, AppError> {
    let now = now_ms();
    let today_ms = { let s = now / 1000; (s - s % 86400) * 1000 };
    let week_end = today_ms + 86_400_000 - 1;
    let week_start = today_ms - 6 * 86_400_000;
    let prev_week_start = week_start - 7 * 86_400_000;
    let prev_week_end = week_start - 1;

    // Tasks
    let tasks_completed = sqlx::query(
        "SELECT id, title, priority, completedAt FROM Task WHERE status = 'done' AND completedAt >= ? AND completedAt <= ?"
    ).bind(week_start).bind(week_end).fetch_all(&st.db).await?;

    let tasks_created: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM Task WHERE createdAt >= ? AND createdAt <= ?"
    ).bind(week_start).bind(week_end).fetch_one(&st.db).await?;

    let all_active: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Task WHERE archived = 0")
        .fetch_one(&st.db).await?;
    let all_done: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Task WHERE status = 'done' AND archived = 0")
        .fetch_one(&st.db).await?;
    let task_completion_rate = if all_active > 0 { (all_done * 100) / all_active } else { 0 };

    let priority_order = |p: &str| match p { "urgent" => 4, "high" => 3, "medium" => 2, _ => 1 };
    let mut sorted_tasks: Vec<_> = tasks_completed.iter().collect();
    sorted_tasks.sort_by(|a, b| {
        let pa = a.try_get::<String, _>("priority").unwrap_or_default();
        let pb = b.try_get::<String, _>("priority").unwrap_or_default();
        priority_order(&pb).cmp(&priority_order(&pa))
    });
    let top_completed: Vec<serde_json::Value> = sorted_tasks.iter().take(5).map(|r| serde_json::json!({
        "id": r.try_get::<String, _>("id").unwrap_or_default(),
        "title": r.try_get::<String, _>("title").unwrap_or_default(),
        "priority": r.try_get::<String, _>("priority").unwrap_or_default(),
    })).collect();

    // Habits
    let habits = sqlx::query("SELECT id, name FROM Habit WHERE archived = 0").fetch_all(&st.db).await?;
    let mut total_habit_logs: i64 = 0;
    let total_possible = (habits.len() as i64) * 7;
    for h in &habits {
        let hid: String = h.try_get("id").unwrap_or_default();
        let c: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM HabitLog WHERE habitId = ? AND date >= ? AND date <= ?"
        ).bind(&hid).bind(week_start).bind(week_end).fetch_one(&st.db).await?;
        total_habit_logs += c;
    }
    let habit_completion_rate = if total_possible > 0 { (total_habit_logs * 100) / total_possible } else { 0 };

    // Longest streak
    let mut max_streak = 0i64;
    let mut max_streak_name = String::new();
    for h in &habits {
        let hid: String = h.try_get("id").unwrap_or_default();
        let logs = sqlx::query("SELECT date FROM HabitLog WHERE habitId = ? ORDER BY date DESC LIMIT 100")
            .bind(&hid).fetch_all(&st.db).await?;
        let mut streak = 0i64;
        let mut check = today_ms;
        for _ in 0..60 {
            let day_end = check + 86_400_000 - 1;
            let has = logs.iter().any(|l| {
                let d = l.try_get::<i64, _>("date").unwrap_or(-1);
                d >= check && d <= day_end
            });
            if has { streak += 1; check -= 86_400_000; } else { break; }
        }
        if streak > max_streak {
            max_streak = streak;
            max_streak_name = h.try_get("name").unwrap_or_default();
        }
    }

    // Time tracking
    let time_entries = sqlx::query(
        "SELECT duration FROM TimeEntry WHERE startTime >= ? AND startTime <= ? AND duration IS NOT NULL"
    ).bind(week_start).bind(week_end).fetch_all(&st.db).await?;
    let total_focus_time: i64 = time_entries.iter().map(|r| r.try_get::<i64, _>("duration").unwrap_or(0)).sum();

    let pomodoro_sessions: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM PomodoroSession WHERE startedAt >= ? AND startedAt <= ? AND completed = 1 AND type = 'focus'"
    ).bind(week_start).bind(week_end).fetch_one(&st.db).await?;

    // Journal mood/energy
    let journal_entries = sqlx::query(
        "SELECT moodScore, energy, date FROM JournalEntry WHERE date >= ? AND date <= ? ORDER BY date ASC"
    ).bind(week_start).bind(week_end).fetch_all(&st.db).await?;

    let moods: Vec<i64> = journal_entries.iter().filter_map(|r| r.try_get::<Option<i64>, _>("moodScore").ok().flatten()).collect();
    let energies: Vec<i64> = journal_entries.iter().filter_map(|r| r.try_get::<Option<i64>, _>("energy").ok().flatten()).collect();

    let avg_mood = if !moods.is_empty() { moods.iter().sum::<i64>() as f64 / moods.len() as f64 } else { 0.0 };
    let avg_energy = if !energies.is_empty() { energies.iter().sum::<i64>() as f64 / energies.len() as f64 } else { 0.0 };
    let avg_sleep = avg_energy;

    let mood_trend = if moods.len() >= 4 {
        let half = moods.len() / 2;
        let first_avg = moods[..half].iter().sum::<i64>() as f64 / half as f64;
        let second_avg = moods[half..].iter().sum::<i64>() as f64 / (moods.len() - half) as f64;
        if second_avg > first_avg + 0.3 { "improving" } else if second_avg < first_avg - 0.3 { "declining" } else { "stable" }
    } else { "stable" };

    // Finance
    let transactions = sqlx::query(
        "SELECT CAST(amount AS REAL) as amount, type, categoryId FROM \"Transaction\" WHERE date >= ? AND date <= ?"
    ).bind(week_start).bind(week_end).fetch_all(&st.db).await?;

    let income: f64 = transactions.iter().filter(|r| r.try_get::<String, _>("type").map(|s| s == "income").unwrap_or(false)).map(|r| crate::utils::row_f64(r, "amount")).sum();
    let expenses: f64 = transactions.iter().filter(|r| r.try_get::<String, _>("type").map(|s| s == "expense").unwrap_or(false)).map(|r| crate::utils::row_f64(r, "amount")).sum();

    // Top expense category
    let mut cat_totals: std::collections::HashMap<String, f64> = std::collections::HashMap::new();
    for r in transactions.iter().filter(|r| r.try_get::<String, _>("type").map(|s| s == "expense").unwrap_or(false)) {
        if let Ok(Some(cid)) = r.try_get::<Option<String>, _>("categoryId") {
            *cat_totals.entry(cid).or_default() += crate::utils::row_f64(r, "amount");
        }
    }
    let top_cat_id = cat_totals.iter().max_by(|a, b| a.1.partial_cmp(b.1).unwrap_or(std::cmp::Ordering::Equal)).map(|(k, _)| k.clone());
    let top_expense_category = if let Some(cid) = top_cat_id {
        let row = sqlx::query("SELECT name FROM TransactionCategory WHERE id = ?")
            .bind(&cid).fetch_optional(&st.db).await?;
        row.and_then(|r| r.try_get::<String, _>("name").ok()).unwrap_or_else(|| "N/A".to_string())
    } else { "N/A".to_string() };

    // Goals progress
    let active_goals = sqlx::query(
        "SELECT id, title, progress, updatedAt FROM Goal WHERE status = 'in-progress' AND archived = 0"
    ).fetch_all(&st.db).await?;
    let goals_progress: Vec<serde_json::Value> = active_goals.iter()
        .filter(|r| r.try_get::<i64, _>("updatedAt").unwrap_or(0) >= week_start)
        .map(|r| {
            let prog = r.try_get::<i64, _>("progress").unwrap_or(0);
            let days_since = ((now - r.try_get::<i64, _>("updatedAt").unwrap_or(now)) / 86_400_000).max(0);
            let change = if days_since <= 7 { (prog as f64 * 0.1).max(5.0) as i64 } else { 0 };
            serde_json::json!({ "id": r.try_get::<String, _>("id").unwrap_or_default(), "title": r.try_get::<String, _>("title").unwrap_or_default(), "progressChange": change })
        }).collect();

    // Highlights
    let mut highlights: Vec<String> = Vec::new();
    if !tasks_completed.is_empty() {
        highlights.push(format!("Completed {} task{} this week{}", tasks_completed.len(), if tasks_completed.len() > 1 { "s" } else { "" }, if tasks_completed.len() >= 5 { " — great productivity!" } else { "" }));
    }
    if habit_completion_rate >= 80 { highlights.push(format!("Habit completion rate of {}% — outstanding consistency!", habit_completion_rate)); }
    else if habit_completion_rate >= 50 { highlights.push(format!("Habit completion at {}% — keep building that momentum!", habit_completion_rate)); }
    if max_streak >= 7 { highlights.push(format!("\"{}\" streak reached {} days 🔥", max_streak_name, max_streak)); }
    if total_focus_time > 0 { highlights.push(format!("Logged {:.1} hours of focused work", total_focus_time as f64 / 60.0)); }
    if pomodoro_sessions > 0 { highlights.push(format!("Completed {} pomodoro focus session{}", pomodoro_sessions, if pomodoro_sessions > 1 { "s" } else { "" })); }
    if income > expenses { let net = income - expenses; highlights.push(format!("Net savings of ${:.2} this week", net)); }
    if mood_trend == "improving" { highlights.push("Mood trending upward this week 😊".to_string()); }
    if highlights.len() < 3 {
        if tasks_completed.is_empty() { highlights.push("No tasks completed this week — set a goal for next week!".to_string()); }
        if highlights.len() < 3 { highlights.push("A new week is ahead — plan your priorities and set intentions".to_string()); }
    }
    let highlights: Vec<String> = highlights.into_iter().take(4).collect();

    // Week score
    let task_s = (task_completion_rate as f64).min(100.0) * 0.25;
    let habit_s = (habit_completion_rate as f64).min(100.0) * 0.25;
    let focus_s = (total_focus_time as f64 / 60.0 / 20.0 * 100.0).min(100.0) * 0.15;
    let mood_s = (avg_mood / 5.0 * 100.0).min(100.0) * 0.15;
    let energy_s = (avg_sleep / 5.0 * 100.0).min(100.0) * 0.1;
    let finance_s = if income > expenses { ((income - expenses) / income.max(1.0) * 100.0).min(100.0) * 0.1 } else { 0.0 };
    let week_score = (task_s + habit_s + focus_s + mood_s + energy_s + finance_s).min(100.0) as i64;

    let week_start_str = crate::prisma_dt::PrismaDateTime(week_start).to_iso().split('T').next().unwrap_or("").to_string();
    let week_end_str = crate::prisma_dt::PrismaDateTime(week_end).to_iso().split('T').next().unwrap_or("").to_string();

    Ok(Json(serde_json::json!({
        "weekRange": { "start": week_start_str, "end": week_end_str },
        "tasksCompleted": tasks_completed.len(),
        "tasksCreated": tasks_created,
        "taskCompletionRate": task_completion_rate,
        "topCompletedTasks": top_completed,
        "habitsCompleted": total_habit_logs,
        "habitCompletionRate": habit_completion_rate,
        "longestHabitStreak": { "name": max_streak_name, "streak": max_streak },
        "totalFocusTime": total_focus_time,
        "pomodoroSessions": pomodoro_sessions,
        "moodTrend": mood_trend,
        "avgMoodScore": (avg_mood * 10.0).round() / 10.0,
        "avgEnergyScore": (avg_energy * 10.0).round() / 10.0,
        "avgSleepQuality": (avg_sleep * 10.0).round() / 10.0,
        "totalCaloriesBurned": 0,
        "financialSummary": {
            "income": (income * 100.0).round() / 100.0,
            "expenses": (expenses * 100.0).round() / 100.0,
            "netSavings": ((income - expenses) * 100.0).round() / 100.0,
            "topExpenseCategory": top_expense_category,
        },
        "goalsProgress": goals_progress,
        "highlights": highlights,
        "weekScore": week_score,
    })))
}
