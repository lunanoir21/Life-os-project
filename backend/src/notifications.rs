use axum::extract::State;
use axum::Json;
use serde::Serialize;
use sqlx::Row;

use crate::error::AppError;
use crate::utils::now_ms;
use crate::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Notification {
    id: String,
    r#type: String,
    title: String,
    description: String,
    module: String,
    priority: String,
    created_at: String,
    read: bool,
}

fn notif_id() -> String {
    format!("notif-{}-{:x}", now_ms(), rand_suffix())
}

fn rand_suffix() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_nanos() as u64)
        .unwrap_or(0)
}

fn ms_to_iso(ms: i64) -> String {
    crate::prisma_dt::PrismaDateTime(ms).to_iso()
}

pub async fn get_notifications(
    State(st): State<AppState>,
) -> Result<Json<serde_json::Value>, AppError> {
    let now = now_ms();
    let today_ms = {
        let s = now / 1000;
        (s - s % 86400) * 1000
    };
    let today_end = today_ms + 86_400_000 - 1;
    let yesterday_ms = today_ms - 86_400_000;
    let yesterday_end = today_ms - 1;

    let mut notifications: Vec<Notification> = Vec::new();
    let now_iso = ms_to_iso(now);

    // 1. Overdue tasks
    let overdue = sqlx::query(
        "SELECT id, title, priority, dueDate FROM Task WHERE status != 'done' AND dueDate < ? AND archived = 0 LIMIT 10"
    ).bind(today_ms).fetch_all(&st.db).await?;
    for r in &overdue {
        let due: i64 = r.try_get::<i64, _>("dueDate").unwrap_or(0);
        let days_over = ((today_ms - due) / 86_400_000).max(1);
        let priority: String = r.try_get("priority").unwrap_or_default();
        notifications.push(Notification {
            id: notif_id(),
            r#type: "overdue-task".to_string(),
            title: "Overdue Task".to_string(),
            description: format!(
                "\"{}\" is {} day{} overdue",
                r.try_get::<String, _>("title").unwrap_or_default(),
                days_over,
                if days_over > 1 { "s" } else { "" }
            ),
            module: "tasks".to_string(),
            priority: if priority == "urgent" || priority == "high" {
                "high".to_string()
            } else {
                "medium".to_string()
            },
            created_at: ms_to_iso(due),
            read: false,
        });
    }

    // 2. Tasks due today
    let due_today = sqlx::query(
        "SELECT id, title, priority FROM Task WHERE status != 'done' AND dueDate >= ? AND dueDate <= ? AND archived = 0 LIMIT 5"
    ).bind(today_ms).bind(today_end).fetch_all(&st.db).await?;
    if !due_today.is_empty() {
        let names: Vec<String> = due_today
            .iter()
            .take(2)
            .map(|r| r.try_get::<String, _>("title").unwrap_or_default())
            .collect();
        let remaining = if due_today.len() > 2 {
            format!(" and {} more", due_today.len() - 2)
        } else {
            String::new()
        };
        notifications.push(Notification {
            id: notif_id(),
            r#type: "task-due-today".to_string(),
            title: "Tasks Due Today".to_string(),
            description: format!(
                "{} task{} due today: {}{}",
                due_today.len(),
                if due_today.len() > 1 { "s" } else { "" },
                names.join(", "),
                remaining
            ),
            module: "tasks".to_string(),
            priority: "medium".to_string(),
            created_at: now_iso.clone(),
            read: false,
        });
    }

    // 3. Recently completed tasks
    let completed: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM Task WHERE status = 'done' AND updatedAt >= ? AND archived = 0",
    )
    .bind(today_ms)
    .fetch_one(&st.db)
    .await?;
    if completed > 0 {
        notifications.push(Notification {
            id: notif_id(),
            r#type: "task-completed".to_string(),
            title: "Tasks Completed! 🎉".to_string(),
            description: format!(
                "Great job! You completed {} task{} today.",
                completed,
                if completed > 1 { "s" } else { "" }
            ),
            module: "tasks".to_string(),
            priority: "low".to_string(),
            created_at: now_iso.clone(),
            read: false,
        });
    }

    // 4. Habit reminders (if hour >= 10)
    let hour = (now / 3_600_000) % 24;
    if hour >= 10 {
        let habits = sqlx::query("SELECT id, name FROM Habit WHERE archived = 0")
            .fetch_all(&st.db)
            .await?;
        let mut incomplete = 0i64;
        let mut names = Vec::new();
        for h in &habits {
            let hid: String = h.try_get("id").unwrap_or_default();
            let logged: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM HabitLog WHERE habitId = ? AND date >= ? AND date <= ?",
            )
            .bind(&hid)
            .bind(today_ms)
            .bind(today_end)
            .fetch_one(&st.db)
            .await?;
            if logged == 0 {
                incomplete += 1;
                if names.len() < 3 {
                    names.push(h.try_get::<String, _>("name").unwrap_or_default());
                }
            }
        }
        if incomplete > 0 {
            let remaining = if incomplete > 3 {
                format!(" and {} more", incomplete - 3)
            } else {
                String::new()
            };
            notifications.push(Notification {
                id: notif_id(),
                r#type: "habit-reminder".to_string(),
                title: "Habits Pending".to_string(),
                description: format!(
                    "{} habit{} not completed today: {}{}",
                    incomplete,
                    if incomplete > 1 { "s" } else { "" },
                    names.join(", "),
                    remaining
                ),
                module: "habits".to_string(),
                priority: if incomplete >= 3 {
                    "medium".to_string()
                } else {
                    "low".to_string()
                },
                created_at: now_iso.clone(),
                read: false,
            });
        }
    }

    // 5. Missed habits yesterday
    let all_habits = sqlx::query("SELECT id FROM Habit WHERE archived = 0")
        .fetch_all(&st.db)
        .await?;
    let mut missed_count = 0i64;
    for h in &all_habits {
        let hid: String = h.try_get("id").unwrap_or_default();
        let logged: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM HabitLog WHERE habitId = ? AND date >= ? AND date <= ?",
        )
        .bind(&hid)
        .bind(yesterday_ms)
        .bind(yesterday_end)
        .fetch_one(&st.db)
        .await?;
        if logged == 0 {
            missed_count += 1;
        }
    }
    if missed_count > 0 {
        notifications.push(Notification {
            id: notif_id(),
            r#type: "habit-missed".to_string(),
            title: "Missed Habits Yesterday".to_string(),
            description: format!(
                "You missed {} habit{} yesterday. Try to get back on track today!",
                missed_count,
                if missed_count > 1 { "s" } else { "" }
            ),
            module: "habits".to_string(),
            priority: "medium".to_string(),
            created_at: ms_to_iso(yesterday_end),
            read: false,
        });
    }

    // 6. Streak milestones
    let habit_rows = sqlx::query("SELECT id, name FROM Habit WHERE archived = 0")
        .fetch_all(&st.db)
        .await?;
    for h in &habit_rows {
        let hid: String = h.try_get("id").unwrap_or_default();
        let hname: String = h.try_get("name").unwrap_or_default();
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
                let d: i64 = l.try_get::<i64, _>("date").unwrap_or(-1);
                d >= check && d <= day_end
            });
            if has {
                streak += 1;
                check -= 86_400_000;
            } else {
                break;
            }
        }
        if [7, 14, 30, 60, 90].contains(&streak) {
            let label = match streak {
                7 => "One week",
                14 => "Two weeks",
                30 => "One month",
                60 => "Two months",
                _ => "Three months",
            };
            notifications.push(Notification {
                id: notif_id(),
                r#type: "streak-milestone".to_string(),
                title: format!("{} Streak! 🔥", label),
                description: format!(
                    "\"{}\" has reached a {}-day streak — keep it going!",
                    hname, streak
                ),
                module: "habits".to_string(),
                priority: if streak >= 30 {
                    "high".to_string()
                } else if streak >= 14 {
                    "medium".to_string()
                } else {
                    "low".to_string()
                },
                created_at: now_iso.clone(),
                read: false,
            });
        }
    }

    // 7. Goal deadlines (within 7 days)
    let seven_days = now + 7 * 86_400_000;
    let approaching_goals = sqlx::query(
        "SELECT id, title, targetDate, progress FROM Goal WHERE status = 'in-progress' AND targetDate >= ? AND targetDate <= ? AND archived = 0"
    ).bind(now).bind(seven_days).fetch_all(&st.db).await?;
    for g in &approaching_goals {
        let target: i64 = g.try_get::<i64, _>("targetDate").unwrap_or(0);
        let days_left = ((target - now) / 86_400_000 + 1).max(0);
        let progress: i64 = g.try_get("progress").unwrap_or(0);
        notifications.push(Notification {
            id: notif_id(),
            r#type: "goal-deadline".to_string(),
            title: "Goal Deadline Approaching".to_string(),
            description: format!(
                "\"{}\" is due in {} day{} ({}% complete)",
                g.try_get::<String, _>("title").unwrap_or_default(),
                days_left,
                if days_left > 1 { "s" } else { "" },
                progress
            ),
            module: "goals".to_string(),
            priority: if days_left <= 2 {
                "high".to_string()
            } else if days_left <= 4 {
                "medium".to_string()
            } else {
                "low".to_string()
            },
            created_at: now_iso.clone(),
            read: false,
        });
    }

    // 8. Goal progress milestones
    let progress_goals = sqlx::query(
        "SELECT id, title, progress FROM Goal WHERE status = 'in-progress' AND progress IN (25, 50, 75) AND archived = 0"
    ).fetch_all(&st.db).await?;
    for g in &progress_goals {
        let progress: i64 = g.try_get("progress").unwrap_or(0);
        notifications.push(Notification {
            id: notif_id(),
            r#type: "goal-progress".to_string(),
            title: format!("{}% Progress! 🎯", progress),
            description: format!(
                "\"{}\" is {}% complete. Keep pushing!",
                g.try_get::<String, _>("title").unwrap_or_default(),
                progress
            ),
            module: "goals".to_string(),
            priority: if progress >= 75 {
                "medium".to_string()
            } else {
                "low".to_string()
            },
            created_at: now_iso.clone(),
            read: false,
        });
    }

    // 9. Goal completed today
    let completed_goals = sqlx::query(
        "SELECT id, title FROM Goal WHERE status = 'completed' AND updatedAt >= ? AND archived = 0 LIMIT 5"
    ).bind(today_ms).fetch_all(&st.db).await?;
    for g in &completed_goals {
        notifications.push(Notification {
            id: notif_id(),
            r#type: "goal-completed".to_string(),
            title: "Goal Achieved! 🏆".to_string(),
            description: format!(
                "Congratulations! You completed \"{}\"",
                g.try_get::<String, _>("title").unwrap_or_default()
            ),
            module: "goals".to_string(),
            priority: "high".to_string(),
            created_at: now_iso.clone(),
            read: false,
        });
    }

    // 10. Budget alerts
    let budget_items = sqlx::query(
        "SELECT bi.amount, bi.spent, tc.name FROM BudgetItem bi \
         JOIN Budget b ON b.id = bi.budgetId \
         JOIN TransactionCategory tc ON tc.id = bi.categoryId \
         WHERE b.startDate <= ? AND (b.endDate IS NULL OR b.endDate >= ?)",
    )
    .bind(now)
    .bind(now)
    .fetch_all(&st.db)
    .await?;
    for bi in &budget_items {
        let amount: f64 = bi.try_get("amount").unwrap_or(0.0);
        let spent: f64 = bi.try_get("spent").unwrap_or(0.0);
        if amount > 0.0 && spent / amount > 0.8 {
            let pct = (spent / amount * 100.0) as i64;
            let over = spent > amount;
            notifications.push(Notification {
                id: notif_id(),
                r#type: "budget-alert".to_string(),
                title: if over {
                    "Budget Exceeded".to_string()
                } else {
                    "Budget Warning".to_string()
                },
                description: format!(
                    "{}: ${:.0} of ${:.0} ({}%)",
                    bi.try_get::<String, _>("name").unwrap_or_default(),
                    spent,
                    amount,
                    pct
                ),
                module: "finance".to_string(),
                priority: if over {
                    "high".to_string()
                } else {
                    "medium".to_string()
                },
                created_at: now_iso.clone(),
                read: false,
            });
        }
    }

    // 11. Large transactions today
    let large_txns = sqlx::query(
        "SELECT id, description, amount FROM \"Transaction\" WHERE type = 'expense' AND amount >= 100 AND date >= ? LIMIT 5"
    ).bind(today_ms).fetch_all(&st.db).await?;
    for txn in &large_txns {
        let amount: f64 = txn.try_get("amount").unwrap_or(0.0);
        notifications.push(Notification {
            id: notif_id(),
            r#type: "large-transaction".to_string(),
            title: "Large Transaction".to_string(),
            description: format!(
                "${:.0} expense: {}",
                amount,
                txn.try_get::<String, _>("description")
                    .unwrap_or_else(|_| "Unnamed transaction".to_string())
            ),
            module: "finance".to_string(),
            priority: if amount >= 500.0 {
                "high".to_string()
            } else {
                "medium".to_string()
            },
            created_at: now_iso.clone(),
            read: false,
        });
    }

    // 12. Writing reminder (if hour >= 18 and no journal today)
    if hour >= 18 {
        let today_journal: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM JournalEntry WHERE date >= ? AND date <= ?")
                .bind(today_ms)
                .bind(today_end)
                .fetch_one(&st.db)
                .await?;
        if today_journal == 0 {
            notifications.push(Notification {
                id: notif_id(),
                r#type: "writing-reminder".to_string(),
                title: "Daily Journal ✍️".to_string(),
                description: "You haven't journalized today. Take a moment to reflect!".to_string(),
                module: "journal".to_string(),
                priority: "low".to_string(),
                created_at: now_iso.clone(),
                read: false,
            });
        }
    }

    // 13. Mood insight (if low average over last 7 days)
    let recent_moods =
        sqlx::query("SELECT mood FROM JournalEntry WHERE mood IS NOT NULL AND date >= ? LIMIT 7")
            .bind(now - 7 * 86_400_000)
            .fetch_all(&st.db)
            .await?;
    if recent_moods.len() >= 3 {
        // mood column is text; try moodScore instead
        let scores = sqlx::query_scalar::<_, i64>(
            "SELECT moodScore FROM JournalEntry WHERE moodScore IS NOT NULL AND date >= ? LIMIT 7",
        )
        .bind(now - 7 * 86_400_000)
        .fetch_all(&st.db)
        .await
        .unwrap_or_default();
        if scores.len() >= 3 {
            let avg = scores.iter().sum::<i64>() as f64 / scores.len() as f64;
            if avg <= 2.0 {
                notifications.push(Notification {
                    id: notif_id(), r#type: "mood-insight".to_string(),
                    title: "Mood Insight 🧠".to_string(),
                    description: "Your mood has been lower than usual this week. Consider self-care activities or reaching out.".to_string(),
                    module: "journal".to_string(), priority: "medium".to_string(),
                    created_at: now_iso.clone(), read: false,
                });
            }
        }
    }

    // 14. Sunday backup reminder
    let day_of_week = {
        let days_since_epoch = (now / 86_400_000) as i64;
        ((days_since_epoch + 4) % 7)
    }; // 0=Mon..6=Sun
    if day_of_week == 6 && hour >= 10 {
        notifications.push(Notification {
            id: notif_id(),
            r#type: "data-backup".to_string(),
            title: "Weekly Backup Reminder".to_string(),
            description: "It's Sunday! Consider backing up your data in Settings → Data."
                .to_string(),
            module: "settings".to_string(),
            priority: "low".to_string(),
            created_at: now_iso.clone(),
            read: false,
        });
    }

    // Sort: high > medium > low, then newest first
    notifications.sort_by(|a, b| {
        let porder = |p: &str| match p {
            "high" => 3,
            "medium" => 2,
            _ => 1,
        };
        let pd = porder(&b.priority).cmp(&porder(&a.priority));
        if pd != std::cmp::Ordering::Equal {
            return pd;
        }
        b.created_at.cmp(&a.created_at)
    });

    Ok(Json(serde_json::json!(notifications)))
}
