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
pub(crate) struct CalendarEvent {
    id: String, title: String, description: Option<String>,
    start_date: PrismaDateTime, end_date: Option<PrismaDateTime>,
    all_day: bool, color: String, location: Option<String>,
    recurrence: Option<String>, recurrence_config: Option<String>,
    task_id: Option<String>,
    created_at: PrismaDateTime, updated_at: PrismaDateTime,
    task: Option<TaskMini>,
}

#[derive(Serialize)]
pub(crate) struct EventList { events: Vec<CalendarEvent>, total: i64 }

fn event_from_row(r: &sqlx::sqlite::SqliteRow, task: Option<TaskMini>) -> Result<CalendarEvent, sqlx::Error> {
    Ok(CalendarEvent {
        id: r.try_get("id")?,
        title: r.try_get("title")?,
        description: r.try_get("description")?,
        start_date: PrismaDateTime(r.try_get::<i64, _>("startDate")?),
        end_date: r.try_get::<Option<i64>, _>("endDate")?.map(PrismaDateTime),
        all_day: r.try_get::<i64, _>("allDay")? != 0,
        color: r.try_get("color")?,
        location: r.try_get("location")?,
        recurrence: r.try_get("recurrence")?,
        recurrence_config: r.try_get("recurrenceConfig")?,
        task_id: r.try_get("taskId")?,
        created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
        updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
        task,
    })
}

async fn fetch_task_mini(db: &sqlx::SqlitePool, task_id: &str) -> Result<Option<TaskMini>, sqlx::Error> {
    let row = sqlx::query("SELECT id, title, status FROM Task WHERE id = ?")
        .bind(task_id).fetch_optional(db).await?;
    Ok(row.map(|r| TaskMini {
        id: r.try_get("id").unwrap_or_default(),
        title: r.try_get("title").unwrap_or_default(),
        status: r.try_get("status").unwrap_or_default(),
    }))
}

pub async fn list_events(
    State(st): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<EventList>, AppError> {
    let limit = params.get("limit").and_then(|v| v.parse::<i64>().ok()).unwrap_or(50);
    let offset = params.get("offset").and_then(|v| v.parse::<i64>().ok()).unwrap_or(0);

    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("SELECT * FROM CalendarEvent WHERE 1=1");
    let mut count_qb: QueryBuilder<Sqlite> = QueryBuilder::new("SELECT COUNT(*) FROM CalendarEvent WHERE 1=1");

    if let Some(sd) = params.get("startDate") {
        if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(sd) {
            let ms = dt.timestamp_millis();
            qb.push(" AND startDate >= ").push_bind(ms);
            count_qb.push(" AND startDate >= ").push_bind(ms);
        }
    }
    if let Some(ed) = params.get("endDate") {
        if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(ed) {
            let ms = dt.timestamp_millis();
            qb.push(" AND startDate <= ").push_bind(ms);
            count_qb.push(" AND startDate <= ").push_bind(ms);
        }
    }

    let total: i64 = count_qb.build_query_scalar().fetch_one(&st.db).await?;
    qb.push(" ORDER BY startDate ASC LIMIT ").push_bind(limit).push(" OFFSET ").push_bind(offset);
    let rows = qb.build().fetch_all(&st.db).await?;

    let mut events = Vec::with_capacity(rows.len());
    for r in &rows {
        let task_id: Option<String> = r.try_get("taskId")?;
        let task = if let Some(ref tid) = task_id {
            fetch_task_mini(&st.db, tid).await?
        } else { None };
        events.push(event_from_row(r, task)?);
    }
    Ok(Json(EventList { events, total }))
}

pub async fn create_event(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<CalendarEvent>), AppError> {
    let title = body.get("title").and_then(|v| v.as_str()).map(str::trim).filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::BadRequest("Title is required".to_string()))?.to_string();
    let start_ms = opt_ms(&body, "startDate")
        .ok_or_else(|| AppError::BadRequest("startDate is required".to_string()))?;
    let id = gen_id(); let now = now_ms();

    sqlx::query(
        "INSERT INTO CalendarEvent (id, title, description, startDate, endDate, allDay, color, location, recurrence, recurrenceConfig, taskId, createdAt, updatedAt) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id).bind(&title).bind(truthy_str(&body, "description"))
    .bind(start_ms).bind(opt_ms(&body, "endDate"))
    .bind(if body.get("allDay").and_then(|v| v.as_bool()).unwrap_or(false) { 1_i64 } else { 0_i64 })
    .bind(str_or(&body, "color", "#6b7280"))
    .bind(truthy_str(&body, "location"))
    .bind(truthy_str(&body, "recurrence"))
    .bind(truthy_str(&body, "recurrenceConfig"))
    .bind(truthy_str(&body, "taskId"))
    .bind(now).bind(now)
    .execute(&st.db).await?;

    let row = sqlx::query("SELECT * FROM CalendarEvent WHERE id = ?").bind(&id).fetch_one(&st.db).await?;
    let task_id: Option<String> = row.try_get("taskId")?;
    let task = if let Some(ref tid) = task_id { fetch_task_mini(&st.db, tid).await? } else { None };
    Ok((StatusCode::CREATED, Json(event_from_row(&row, task)?)))
}

pub async fn get_event(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<CalendarEvent>, AppError> {
    let row = sqlx::query("SELECT * FROM CalendarEvent WHERE id = ?")
        .bind(&id).fetch_optional(&st.db).await?
        .ok_or_else(|| AppError::NotFound("Event not found".to_string()))?;
    let task_id: Option<String> = row.try_get("taskId")?;
    let task = if let Some(ref tid) = task_id { fetch_task_mini(&st.db, tid).await? } else { None };
    Ok(Json(event_from_row(&row, task)?))
}

pub async fn update_event(
    State(st): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<CalendarEvent>, AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM CalendarEvent WHERE id = ?")
        .bind(&id).fetch_one(&st.db).await?;
    if exists == 0 { return Err(AppError::NotFound("Event not found".to_string())); }
    let now = now_ms();
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("UPDATE CalendarEvent SET ");
    let mut first = true;
    if let Some(v) = body.get("title").and_then(|v| v.as_str()) { crate::push_set!(qb, first, "title = ", v.to_string()); }
    if let Some(v) = patch_str(&body, "description") { crate::push_set!(qb, first, "description = ", v); }
    if let Some(v) = patch_ms(&body, "startDate") { crate::push_set!(qb, first, "startDate = ", v); }
    if let Some(v) = patch_ms(&body, "endDate") { crate::push_set!(qb, first, "endDate = ", v); }
    if let Some(v) = patch_bool(&body, "allDay") { crate::push_set!(qb, first, "allDay = ", if v {1_i64} else {0_i64}); }
    if let Some(v) = patch_str(&body, "color") { crate::push_set!(qb, first, "color = ", v); }
    if let Some(v) = patch_str(&body, "location") { crate::push_set!(qb, first, "location = ", v); }
    if let Some(v) = patch_str(&body, "recurrence") { crate::push_set!(qb, first, "recurrence = ", v); }
    if let Some(v) = patch_str(&body, "recurrenceConfig") { crate::push_set!(qb, first, "recurrenceConfig = ", v); }
    if let Some(v) = patch_str(&body, "taskId") { crate::push_set!(qb, first, "taskId = ", v); }
    crate::push_set!(qb, first, "updatedAt = ", now);
    qb.push(" WHERE id = ").push_bind(&id);
    qb.build().execute(&st.db).await?;

    let row = sqlx::query("SELECT * FROM CalendarEvent WHERE id = ?").bind(&id).fetch_one(&st.db).await?;
    let task_id: Option<String> = row.try_get("taskId")?;
    let task = if let Some(ref tid) = task_id { fetch_task_mini(&st.db, tid).await? } else { None };
    Ok(Json(event_from_row(&row, task)?))
}

pub async fn delete_event(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM CalendarEvent WHERE id = ?")
        .bind(&id).fetch_one(&st.db).await?;
    if exists == 0 { return Err(AppError::NotFound("Event not found".to_string())); }
    sqlx::query("DELETE FROM CalendarEvent WHERE id = ?").bind(&id).execute(&st.db).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}
