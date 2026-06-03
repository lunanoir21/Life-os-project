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
pub(crate) struct TaskMini {
    id: String,
    title: String,
    status: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TimeEntry {
    id: String,
    description: String,
    start_time: PrismaDateTime,
    end_time: Option<PrismaDateTime>,
    duration: Option<i64>,
    billable: bool,
    task_id: Option<String>,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
    task: Option<TaskMini>,
}

fn entry_from_row(
    r: &sqlx::sqlite::SqliteRow,
    task: Option<TaskMini>,
) -> Result<TimeEntry, sqlx::Error> {
    Ok(TimeEntry {
        id: r.try_get("id")?,
        description: r.try_get("description")?,
        start_time: PrismaDateTime(r.try_get::<i64, _>("startTime")?),
        end_time: r.try_get::<Option<i64>, _>("endTime")?.map(PrismaDateTime),
        duration: r.try_get("duration")?,
        billable: r.try_get::<i64, _>("billable")? != 0,
        task_id: r.try_get("taskId")?,
        created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
        updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
        task,
    })
}

async fn fetch_task(db: &sqlx::SqlitePool, id: &str) -> Result<Option<TaskMini>, sqlx::Error> {
    let row = sqlx::query("SELECT id, title, status FROM Task WHERE id = ?")
        .bind(id)
        .fetch_optional(db)
        .await?;
    Ok(row.map(|r| TaskMini {
        id: r.try_get("id").unwrap_or_default(),
        title: r.try_get("title").unwrap_or_default(),
        status: r.try_get("status").unwrap_or_default(),
    }))
}

pub async fn list_time_entries(
    State(st): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Vec<TimeEntry>>, AppError> {
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("SELECT * FROM TimeEntry WHERE 1=1");
    if let Some(tid) = params.get("taskId") {
        qb.push(" AND taskId = ").push_bind(tid.clone());
    }
    if let Some(r) = params.get("isRunning") {
        if r == "true" {
            qb.push(" AND endTime IS NULL");
        }
    }
    qb.push(" ORDER BY startTime DESC");
    let rows = qb.build().fetch_all(&st.db).await?;
    let mut out = Vec::with_capacity(rows.len());
    for r in &rows {
        let task_id: Option<String> = r.try_get("taskId")?;
        let task = if let Some(ref tid) = task_id {
            fetch_task(&st.db, tid).await?
        } else {
            None
        };
        out.push(entry_from_row(r, task)?);
    }
    Ok(Json(out))
}

pub async fn create_time_entry(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<TimeEntry>), AppError> {
    let description = body
        .get("description")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::BadRequest("Description is required".to_string()))?
        .to_string();
    let id = gen_id();
    let now = now_ms();
    let start_ms = opt_ms(&body, "startTime").unwrap_or(now);

    sqlx::query(
        "INSERT INTO TimeEntry (id, description, startTime, endTime, duration, billable, taskId, createdAt, updatedAt) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id).bind(&description).bind(start_ms)
    .bind(opt_ms(&body, "endTime"))
    .bind(body.get("duration").and_then(|v| v.as_i64()))
    .bind(if body.get("billable").and_then(|v| v.as_bool()).unwrap_or(false) { 1_i64 } else { 0_i64 })
    .bind(truthy_str(&body, "taskId"))
    .bind(now).bind(now)
    .execute(&st.db).await?;

    let row = sqlx::query("SELECT * FROM TimeEntry WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    let task_id: Option<String> = row.try_get("taskId")?;
    let task = if let Some(ref tid) = task_id {
        fetch_task(&st.db, tid).await?
    } else {
        None
    };
    Ok((StatusCode::CREATED, Json(entry_from_row(&row, task)?)))
}

// PATCH on collection: stop a running entry by id in body
pub async fn stop_time_entry(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<Json<TimeEntry>, AppError> {
    let id = body
        .get("id")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::BadRequest("id is required".to_string()))?
        .to_string();
    let row = sqlx::query("SELECT * FROM TimeEntry WHERE id = ?")
        .bind(&id)
        .fetch_optional(&st.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Time entry not found".to_string()))?;

    let start_ms: i64 = row.try_get::<i64, _>("startTime")?;
    let now = now_ms();
    let stop_ms = opt_ms(&body, "endTime").unwrap_or(now);
    let calc_duration = body
        .get("duration")
        .and_then(|v| v.as_i64())
        .unwrap_or_else(|| (stop_ms - start_ms) / 60_000);

    sqlx::query("UPDATE TimeEntry SET endTime = ?, duration = ?, updatedAt = ? WHERE id = ?")
        .bind(stop_ms)
        .bind(calc_duration)
        .bind(now)
        .bind(&id)
        .execute(&st.db)
        .await?;

    let row = sqlx::query("SELECT * FROM TimeEntry WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    let task_id: Option<String> = row.try_get("taskId")?;
    let task = if let Some(ref tid) = task_id {
        fetch_task(&st.db, tid).await?
    } else {
        None
    };
    Ok(Json(entry_from_row(&row, task)?))
}

pub async fn delete_time_entry(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM TimeEntry WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    if exists == 0 {
        return Err(AppError::NotFound("Time entry not found".to_string()));
    }
    sqlx::query("DELETE FROM TimeEntry WHERE id = ?")
        .bind(&id)
        .execute(&st.db)
        .await?;
    Ok(Json(serde_json::json!({ "success": true })))
}
