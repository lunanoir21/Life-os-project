use axum::extract::State;
use axum::Json;
use serde::Serialize;
use sqlx::Row;

use crate::error::AppError;
use crate::prisma_dt::PrismaDateTime;
use crate::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ActivityItem {
    id: String,
    r#type: String,
    title: String,
    description: String,
    timestamp: PrismaDateTime,
    module: String,
}

pub async fn get_activity(State(st): State<AppState>) -> Result<Json<serde_json::Value>, AppError> {
    let mut items: Vec<(i64, ActivityItem)> = Vec::new();

    // Tasks
    let task_rows = sqlx::query(
        "SELECT id, title, status, updatedAt FROM Task ORDER BY updatedAt DESC LIMIT 10"
    ).fetch_all(&st.db).await?;
    for r in &task_rows {
        let status: String = r.try_get("status").unwrap_or_default();
        let ts: i64 = r.try_get::<i64, _>("updatedAt").unwrap_or(0);
        items.push((ts, ActivityItem {
            id: r.try_get("id").unwrap_or_default(),
            r#type: "task".to_string(),
            title: r.try_get("title").unwrap_or_default(),
            description: if status == "done" { "Task completed".to_string() } else { format!("Task {}", status) },
            timestamp: PrismaDateTime(ts),
            module: "tasks".to_string(),
        }));
    }

    // Notes
    let note_rows = sqlx::query(
        "SELECT id, title, type, updatedAt FROM Note ORDER BY updatedAt DESC LIMIT 10"
    ).fetch_all(&st.db).await?;
    for r in &note_rows {
        let note_type: String = r.try_get("type").unwrap_or_default();
        let ts: i64 = r.try_get::<i64, _>("updatedAt").unwrap_or(0);
        items.push((ts, ActivityItem {
            id: r.try_get("id").unwrap_or_default(),
            r#type: "note".to_string(),
            title: r.try_get("title").unwrap_or_default(),
            description: format!("{} updated", note_type),
            timestamp: PrismaDateTime(ts),
            module: "notes".to_string(),
        }));
    }

    // Journal
    let journal_rows = sqlx::query(
        "SELECT id, title, mood, createdAt FROM JournalEntry ORDER BY createdAt DESC LIMIT 10"
    ).fetch_all(&st.db).await?;
    for r in &journal_rows {
        let mood: Option<String> = r.try_get("mood").ok();
        let title: Option<String> = r.try_get("title").ok();
        let ts: i64 = r.try_get::<i64, _>("createdAt").unwrap_or(0);
        items.push((ts, ActivityItem {
            id: r.try_get("id").unwrap_or_default(),
            r#type: "journal".to_string(),
            title: title.unwrap_or_else(|| "Journal entry".to_string()),
            description: mood.map(|m| format!("Mood: {}", m)).unwrap_or_else(|| "New entry".to_string()),
            timestamp: PrismaDateTime(ts),
            module: "journal".to_string(),
        }));
    }

    // Habit logs
    let hl_rows = sqlx::query(
        "SELECT hl.id, hl.count, hl.createdAt, h.name FROM HabitLog hl JOIN Habit h ON h.id = hl.habitId ORDER BY hl.createdAt DESC LIMIT 10"
    ).fetch_all(&st.db).await?;
    for r in &hl_rows {
        let count: i64 = r.try_get("count").unwrap_or(1);
        let ts: i64 = r.try_get::<i64, _>("createdAt").unwrap_or(0);
        items.push((ts, ActivityItem {
            id: r.try_get("id").unwrap_or_default(),
            r#type: "habit".to_string(),
            title: r.try_get("name").unwrap_or_default(),
            description: format!("Completed {}x", count),
            timestamp: PrismaDateTime(ts),
            module: "habits".to_string(),
        }));
    }

    // Transactions
    let txn_rows = sqlx::query(
        "SELECT id, description, amount, type, createdAt FROM \"Transaction\" ORDER BY createdAt DESC LIMIT 10"
    ).fetch_all(&st.db).await?;
    for r in &txn_rows {
        let amount: f64 = crate::utils::row_f64(r, "amount");
        let txn_type: String = r.try_get("type").unwrap_or_default();
        let ts: i64 = r.try_get::<i64, _>("createdAt").unwrap_or(0);
        let sign = if txn_type == "income" { "+" } else { "-" };
        items.push((ts, ActivityItem {
            id: r.try_get("id").unwrap_or_default(),
            r#type: "transaction".to_string(),
            title: r.try_get("description").unwrap_or_default(),
            description: format!("{}${:.2}", sign, amount.abs()),
            timestamp: PrismaDateTime(ts),
            module: "finance".to_string(),
        }));
    }

    items.sort_by(|a, b| b.0.cmp(&a.0));
    let activities: Vec<ActivityItem> = items.into_iter().take(15).map(|(_, item)| item).collect();

    Ok(Json(serde_json::json!({ "activities": activities })))
}
