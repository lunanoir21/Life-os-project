use axum::{extract::State, http::StatusCode, Json};
use serde::Serialize;
use serde_json::Value;
use sqlx::Row;

use crate::error::AppError;
use crate::prisma_dt::PrismaDateTime;
use crate::utils::*;
use crate::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TagCount {
    task_tags: i64,
    note_tags: i64,
    journal_tags: i64,
    goal_tags: i64,
    habit_tags: i64,
    bookmark_tags: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Tag {
    id: String,
    name: String,
    color: String,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
    #[serde(rename = "_count")]
    count: TagCount,
}

pub async fn list_tags(State(st): State<AppState>) -> Result<Json<Vec<Tag>>, AppError> {
    let rows = sqlx::query("SELECT * FROM Tag ORDER BY name ASC")
        .fetch_all(&st.db)
        .await?;

    let mut out = Vec::with_capacity(rows.len());
    for r in &rows {
        let id: String = r.try_get("id")?;
        let task_tags: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM TaskTag WHERE tagId = ?")
            .bind(&id)
            .fetch_one(&st.db)
            .await?;
        let note_tags: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM NoteTag WHERE tagId = ?")
            .bind(&id)
            .fetch_one(&st.db)
            .await?;
        let journal_tags: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM JournalTag WHERE tagId = ?")
                .bind(&id)
                .fetch_one(&st.db)
                .await?;
        let goal_tags: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM GoalTag WHERE tagId = ?")
            .bind(&id)
            .fetch_one(&st.db)
            .await?;
        let habit_tags: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM HabitTag WHERE tagId = ?")
            .bind(&id)
            .fetch_one(&st.db)
            .await?;
        let bookmark_tags: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM BookmarkTag WHERE tagId = ?")
                .bind(&id)
                .fetch_one(&st.db)
                .await?;

        out.push(Tag {
            id,
            name: r.try_get("name")?,
            color: r.try_get("color")?,
            created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
            updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
            count: TagCount {
                task_tags,
                note_tags,
                journal_tags,
                goal_tags,
                habit_tags,
                bookmark_tags,
            },
        });
    }
    Ok(Json(out))
}

pub async fn create_tag(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<Value>), AppError> {
    let name = body
        .get("name")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::BadRequest("Name is required".to_string()))?
        .to_string();
    let color = str_or(&body, "color", "#6b7280");
    let id = gen_id();
    let now = now_ms();

    sqlx::query("INSERT INTO Tag (id, name, color, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)")
        .bind(&id)
        .bind(&name)
        .bind(&color)
        .bind(now)
        .bind(now)
        .execute(&st.db)
        .await?;

    let row = sqlx::query("SELECT * FROM Tag WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    let tag = serde_json::json!({
        "id": id,
        "name": row.try_get::<String,_>("name")?,
        "color": row.try_get::<String,_>("color")?,
        "createdAt": PrismaDateTime(row.try_get::<i64,_>("createdAt")?),
        "updatedAt": PrismaDateTime(row.try_get::<i64,_>("updatedAt")?),
    });
    Ok((StatusCode::CREATED, Json(tag)))
}
