use axum::extract::{Query, State};
use axum::Json;
use serde::Serialize;
use serde_json::Value;
use sqlx::Row;
use std::collections::HashMap;

use crate::error::AppError;
use crate::prisma_dt::PrismaDateTime;
use crate::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SearchResult {
    id: String,
    r#type: String,
    title: String,
    description: String,
    updated_at: PrismaDateTime,
    module: String,
    icon: String,
    color: String,
}

#[derive(Serialize)]
#[allow(dead_code)]
pub(crate) struct SearchResponse {
    results: Vec<SearchResult>,
    query: String,
}

pub async fn search(
    State(st): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Value>, AppError> {
    let q = params
        .get("q")
        .map(|s| s.trim().to_string())
        .unwrap_or_default();
    if q.len() < 2 {
        return Ok(Json(serde_json::json!({ "results": [], "query": q })));
    }
    let pat = format!("%{}%", q);
    let mut results: Vec<SearchResult> = Vec::new();

    // Tasks
    let task_rows = sqlx::query(
        "SELECT id, title, description, updatedAt, priority, status FROM Task WHERE archived = 0 AND (title LIKE ? OR description LIKE ?) ORDER BY updatedAt DESC LIMIT 5"
    ).bind(&pat).bind(&pat).fetch_all(&st.db).await.unwrap_or_default();
    for r in &task_rows {
        let desc: Option<String> = r.try_get("description").ok();
        let status: String = r.try_get("status").unwrap_or_default();
        let priority: String = r.try_get("priority").unwrap_or_default();
        results.push(SearchResult {
            id: r.try_get("id").unwrap_or_default(),
            r#type: "Task".to_string(),
            title: r.try_get("title").unwrap_or_default(),
            description: desc
                .unwrap_or_else(|| format!("Status: {} · Priority: {}", status, priority)),
            updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt").unwrap_or(0)),
            module: "tasks".to_string(),
            icon: "CheckSquare".to_string(),
            color: "orange".to_string(),
        });
    }

    // Notes
    let note_rows = sqlx::query(
        "SELECT id, title, content, updatedAt, type FROM Note WHERE archived = 0 AND (title LIKE ? OR content LIKE ?) ORDER BY updatedAt DESC LIMIT 5"
    ).bind(&pat).bind(&pat).fetch_all(&st.db).await.unwrap_or_default();
    for r in &note_rows {
        let content: String = r.try_get("content").unwrap_or_default();
        let snippet: String = content
            .chars()
            .take(120)
            .collect::<String>()
            .replace(['#', '*', '_', '\n'], " ")
            .trim()
            .to_string();
        let note_type: String = r.try_get("type").unwrap_or_default();
        results.push(SearchResult {
            id: r.try_get("id").unwrap_or_default(),
            r#type: "Note".to_string(),
            title: r.try_get("title").unwrap_or_default(),
            description: if snippet.is_empty() {
                format!("Type: {}", note_type)
            } else {
                snippet
            },
            updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt").unwrap_or(0)),
            module: "notes".to_string(),
            icon: "StickyNote".to_string(),
            color: "amber".to_string(),
        });
    }

    // Journal
    let journal_rows = sqlx::query(
        "SELECT id, title, content, updatedAt, mood FROM JournalEntry WHERE title LIKE ? OR content LIKE ? ORDER BY updatedAt DESC LIMIT 5"
    ).bind(&pat).bind(&pat).fetch_all(&st.db).await.unwrap_or_default();
    for r in &journal_rows {
        let content: String = r.try_get("content").unwrap_or_default();
        let snippet: String = content
            .chars()
            .take(120)
            .collect::<String>()
            .replace(['#', '*', '_', '\n'], " ")
            .trim()
            .to_string();
        let mood: Option<String> = r.try_get("mood").ok();
        let title: Option<String> = r.try_get("title").ok();
        results.push(SearchResult {
            id: r.try_get("id").unwrap_or_default(),
            r#type: "Journal".to_string(),
            title: title.unwrap_or_else(|| "Journal entry".to_string()),
            description: if !snippet.is_empty() {
                snippet
            } else {
                mood.map(|m| format!("Mood: {}", m))
                    .unwrap_or_else(|| "Journal entry".to_string())
            },
            updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt").unwrap_or(0)),
            module: "journal".to_string(),
            icon: "BookOpen".to_string(),
            color: "rose".to_string(),
        });
    }

    // Habits
    let habit_rows = sqlx::query(
        "SELECT id, name, description, updatedAt, icon FROM Habit WHERE archived = 0 AND name LIKE ? ORDER BY updatedAt DESC LIMIT 5"
    ).bind(&pat).fetch_all(&st.db).await.unwrap_or_default();
    for r in &habit_rows {
        let desc: Option<String> = r.try_get("description").ok();
        let icon: Option<String> = r.try_get("icon").ok();
        results.push(SearchResult {
            id: r.try_get("id").unwrap_or_default(),
            r#type: "Habit".to_string(),
            title: r.try_get("name").unwrap_or_default(),
            description: desc.unwrap_or_else(|| {
                icon.map(|i| format!("Icon: {}", i))
                    .unwrap_or_else(|| "Habit".to_string())
            }),
            updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt").unwrap_or(0)),
            module: "habits".to_string(),
            icon: "Repeat".to_string(),
            color: "teal".to_string(),
        });
    }

    // Goals
    let goal_rows = sqlx::query(
        "SELECT id, title, description, updatedAt, progress, category FROM Goal WHERE archived = 0 AND title LIKE ? ORDER BY updatedAt DESC LIMIT 5"
    ).bind(&pat).fetch_all(&st.db).await.unwrap_or_default();
    for r in &goal_rows {
        let desc: Option<String> = r.try_get("description").ok();
        let progress: i64 = r.try_get("progress").unwrap_or(0);
        let category: String = r.try_get("category").unwrap_or_default();
        results.push(SearchResult {
            id: r.try_get("id").unwrap_or_default(),
            r#type: "Goal".to_string(),
            title: r.try_get("title").unwrap_or_default(),
            description: desc
                .unwrap_or_else(|| format!("Progress: {}% · Category: {}", progress, category)),
            updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt").unwrap_or(0)),
            module: "goals".to_string(),
            icon: "Target".to_string(),
            color: "violet".to_string(),
        });
    }

    // Events
    let event_rows = sqlx::query(
        "SELECT id, title, description, updatedAt, startDate, color FROM CalendarEvent WHERE title LIKE ? ORDER BY updatedAt DESC LIMIT 5"
    ).bind(&pat).fetch_all(&st.db).await.unwrap_or_default();
    for r in &event_rows {
        let desc: Option<String> = r.try_get("description").ok();
        let start_ms: i64 = r.try_get("startDate").unwrap_or(0);
        let start_dt = PrismaDateTime(start_ms);
        results.push(SearchResult {
            id: r.try_get("id").unwrap_or_default(),
            r#type: "Event".to_string(),
            title: r.try_get("title").unwrap_or_default(),
            description: desc.unwrap_or_else(|| format!("Starts: {}", start_dt.to_iso())),
            updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt").unwrap_or(0)),
            module: "calendar".to_string(),
            icon: "CalendarDays".to_string(),
            color: "sky".to_string(),
        });
    }

    // Courses
    let course_rows = sqlx::query(
        "SELECT id, title, description, updatedAt, progress, provider FROM Course WHERE title LIKE ? ORDER BY updatedAt DESC LIMIT 5"
    ).bind(&pat).fetch_all(&st.db).await.unwrap_or_default();
    for r in &course_rows {
        let desc: Option<String> = r.try_get("description").ok();
        let progress: i64 = r.try_get("progress").unwrap_or(0);
        let provider: Option<String> = r.try_get("provider").ok();
        results.push(SearchResult {
            id: r.try_get("id").unwrap_or_default(),
            r#type: "Course".to_string(),
            title: r.try_get("title").unwrap_or_default(),
            description: desc.unwrap_or_else(|| {
                let p = provider.map(|p| format!(" · {}", p)).unwrap_or_default();
                format!("Progress: {}%{}", progress, p)
            }),
            updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt").unwrap_or(0)),
            module: "learning".to_string(),
            icon: "GraduationCap".to_string(),
            color: "cyan".to_string(),
        });
    }

    results.sort_by(|a, b| b.updated_at.0.cmp(&a.updated_at.0));
    Ok(Json(serde_json::json!({ "results": results, "query": q })))
}
