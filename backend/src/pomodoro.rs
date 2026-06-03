use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Serialize;
use serde_json::Value;
use sqlx::{QueryBuilder, Row, Sqlite};
use std::collections::HashMap;

use crate::error::AppError;
use crate::prisma_dt::PrismaDateTime;
use crate::utils::*;
use crate::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TaskMini { id: String, title: String, status: String }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PomodoroSession {
    id: String, r#type: String, duration: i64, completed: bool,
    task_id: Option<String>,
    started_at: PrismaDateTime, completed_at: Option<PrismaDateTime>,
    created_at: PrismaDateTime, updated_at: PrismaDateTime,
    task: Option<TaskMini>,
}

fn session_from_row(r: &sqlx::sqlite::SqliteRow, task: Option<TaskMini>) -> Result<PomodoroSession, sqlx::Error> {
    Ok(PomodoroSession {
        id: r.try_get("id")?,
        r#type: r.try_get("type")?,
        duration: r.try_get("duration")?,
        completed: r.try_get::<i64, _>("completed")? != 0,
        task_id: r.try_get("taskId")?,
        started_at: PrismaDateTime(r.try_get::<i64, _>("startedAt")?),
        completed_at: r.try_get::<Option<i64>, _>("completedAt")?.map(PrismaDateTime),
        created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
        updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
        task,
    })
}

async fn fetch_task(db: &sqlx::SqlitePool, id: &str) -> Result<Option<TaskMini>, sqlx::Error> {
    let row = sqlx::query("SELECT id, title, status FROM Task WHERE id = ?")
        .bind(id).fetch_optional(db).await?;
    Ok(row.map(|r| TaskMini {
        id: r.try_get("id").unwrap_or_default(),
        title: r.try_get("title").unwrap_or_default(),
        status: r.try_get("status").unwrap_or_default(),
    }))
}

pub async fn list_pomodoro(
    State(st): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Vec<PomodoroSession>>, AppError> {
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("SELECT * FROM PomodoroSession WHERE 1=1");
    if let Some(t) = params.get("type") { qb.push(" AND type = ").push_bind(t.clone()); }
    if let Some(c) = params.get("completed") {
        qb.push(" AND completed = ").push_bind(if c == "true" { 1_i64 } else { 0_i64 });
    }
    if let Some(tid) = params.get("taskId") { qb.push(" AND taskId = ").push_bind(tid.clone()); }
    if let Some(d) = params.get("date") {
        if let Some(day_ms) = parse_day_ms(d) {
            let day_end = day_ms + 86_400_000 - 1;
            qb.push(" AND startedAt >= ").push_bind(day_ms).push(" AND startedAt <= ").push_bind(day_end);
        }
    }
    qb.push(" ORDER BY startedAt DESC");
    let rows = qb.build().fetch_all(&st.db).await?;
    let mut out = Vec::with_capacity(rows.len());
    for r in &rows {
        let task_id: Option<String> = r.try_get("taskId")?;
        let task = if let Some(ref tid) = task_id { fetch_task(&st.db, tid).await? } else { None };
        out.push(session_from_row(r, task)?);
    }
    Ok(Json(out))
}

pub async fn create_pomodoro(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<PomodoroSession>), AppError> {
    let duration = body.get("duration").and_then(|v| v.as_i64()).filter(|&d| d > 0)
        .ok_or_else(|| AppError::BadRequest("Duration is required and must be positive".to_string()))?;
    let id = gen_id(); let now = now_ms();
    let started_ms = opt_ms(&body, "startedAt").unwrap_or(now);

    sqlx::query(
        "INSERT INTO PomodoroSession (id, type, duration, completed, taskId, startedAt, completedAt, createdAt, updatedAt) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(body.get("type").and_then(|v| v.as_str()).unwrap_or("focus"))
    .bind(duration).bind(0_i64)
    .bind(truthy_str(&body, "taskId"))
    .bind(started_ms).bind(Option::<i64>::None)
    .bind(now).bind(now)
    .execute(&st.db).await?;

    let row = sqlx::query("SELECT * FROM PomodoroSession WHERE id = ?").bind(&id).fetch_one(&st.db).await?;
    let task_id: Option<String> = row.try_get("taskId")?;
    let task = if let Some(ref tid) = task_id { fetch_task(&st.db, tid).await? } else { None };
    Ok((StatusCode::CREATED, Json(session_from_row(&row, task)?)))
}

pub async fn update_pomodoro(
    State(st): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<PomodoroSession>, AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM PomodoroSession WHERE id = ?")
        .bind(&id).fetch_one(&st.db).await?;
    if exists == 0 { return Err(AppError::NotFound("Pomodoro session not found".to_string())); }
    let now = now_ms();
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("UPDATE PomodoroSession SET ");
    let mut first = true;
    if let Some(v) = patch_bool(&body, "completed") { crate::push_set!(qb, first, "completed = ", if v {1_i64} else {0_i64}); }
    if let Some(v) = patch_ms(&body, "completedAt") { crate::push_set!(qb, first, "completedAt = ", v); }
    if let Some(v) = body.get("duration").and_then(|v| v.as_i64()) { crate::push_set!(qb, first, "duration = ", v); }
    crate::push_set!(qb, first, "updatedAt = ", now);
    qb.push(" WHERE id = ").push_bind(&id);
    qb.build().execute(&st.db).await?;

    let row = sqlx::query("SELECT * FROM PomodoroSession WHERE id = ?").bind(&id).fetch_one(&st.db).await?;
    let task_id: Option<String> = row.try_get("taskId")?;
    let task = if let Some(ref tid) = task_id { fetch_task(&st.db, tid).await? } else { None };
    Ok(Json(session_from_row(&row, task)?))
}

pub async fn delete_pomodoro(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM PomodoroSession WHERE id = ?")
        .bind(&id).fetch_one(&st.db).await?;
    if exists == 0 { return Err(AppError::NotFound("Pomodoro session not found".to_string())); }
    sqlx::query("DELETE FROM PomodoroSession WHERE id = ?").bind(&id).execute(&st.db).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}
