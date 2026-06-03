use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Serialize;
use serde_json::Value;
use sqlx::{QueryBuilder, Row, Sqlite, SqlitePool};
use std::collections::HashMap;

use crate::error::AppError;
use crate::prisma_dt::PrismaDateTime;
use crate::utils::*;
use crate::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TagMini {
    id: String,
    name: String,
    color: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct HabitTagFull {
    id: String,
    habit_id: String,
    tag_id: String,
    tag: TagMini,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct HabitLog {
    id: String,
    habit_id: String,
    date: PrismaDateTime,
    count: i64,
    note: Option<String>,
    created_at: PrismaDateTime,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct HabitLogCount {
    logs: i64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Habit {
    id: String,
    name: String,
    description: Option<String>,
    icon: Option<String>,
    color: String,
    frequency: String,
    frequency_config: Option<String>,
    target_count: i64,
    unit: Option<String>,
    reminder_enabled: bool,
    reminder_time: Option<String>,
    archived: bool,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct HabitFull {
    #[serde(flatten)]
    habit: Habit,
    tags: Vec<HabitTagFull>,
    logs: Vec<HabitLog>,
    #[serde(rename = "_count")]
    count: HabitLogCount,
}

fn habit_from_row(r: &sqlx::sqlite::SqliteRow) -> Result<Habit, sqlx::Error> {
    Ok(Habit {
        id: r.try_get("id")?,
        name: r.try_get("name")?,
        description: r.try_get("description")?,
        icon: r.try_get("icon")?,
        color: r.try_get("color")?,
        frequency: r.try_get("frequency")?,
        frequency_config: r.try_get("frequencyConfig")?,
        target_count: r.try_get("targetCount")?,
        unit: r.try_get("unit")?,
        reminder_enabled: r.try_get::<i64, _>("reminderEnabled")? != 0,
        reminder_time: r.try_get("reminderTime")?,
        archived: r.try_get::<i64, _>("archived")? != 0,
        created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
        updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
    })
}

async fn habit_tags(db: &SqlitePool, habit_id: &str) -> Result<Vec<HabitTagFull>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT ht.id, ht.habitId, ht.tagId, t.id AS tid, t.name AS tname, t.color AS tcolor \
         FROM HabitTag ht JOIN Tag t ON t.id = ht.tagId WHERE ht.habitId = ?",
    )
    .bind(habit_id)
    .fetch_all(db)
    .await?;
    rows.iter()
        .map(|r| {
            Ok(HabitTagFull {
                id: r.try_get("id")?,
                habit_id: r.try_get("habitId")?,
                tag_id: r.try_get("tagId")?,
                tag: TagMini {
                    id: r.try_get("tid")?,
                    name: r.try_get("tname")?,
                    color: r.try_get("tcolor")?,
                },
            })
        })
        .collect()
}

async fn habit_logs(
    db: &SqlitePool,
    habit_id: &str,
    take: Option<i64>,
) -> Result<Vec<HabitLog>, sqlx::Error> {
    let sql = match take {
        Some(n) => format!("SELECT * FROM HabitLog WHERE habitId = ? ORDER BY date DESC LIMIT {n}"),
        None => "SELECT * FROM HabitLog WHERE habitId = ? ORDER BY date DESC".to_string(),
    };
    let rows = sqlx::query(&sql).bind(habit_id).fetch_all(db).await?;
    rows.iter()
        .map(|r| {
            Ok(HabitLog {
                id: r.try_get("id")?,
                habit_id: r.try_get("habitId")?,
                date: PrismaDateTime(r.try_get::<i64, _>("date")?),
                count: r.try_get("count")?,
                note: r.try_get("note")?,
                created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
            })
        })
        .collect()
}

async fn build_habit_full(
    db: &SqlitePool,
    habit: Habit,
    log_limit: Option<i64>,
) -> Result<HabitFull, sqlx::Error> {
    let tags = habit_tags(db, &habit.id).await?;
    let log_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM HabitLog WHERE habitId = ?")
        .bind(&habit.id)
        .fetch_one(db)
        .await?;
    let logs = habit_logs(db, &habit.id, log_limit).await?;
    Ok(HabitFull {
        habit,
        tags,
        logs,
        count: HabitLogCount { logs: log_count },
    })
}

pub async fn list_habits(
    State(st): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Vec<HabitFull>>, AppError> {
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("SELECT * FROM Habit WHERE 1=1");
    if let Some(a) = params.get("archived") {
        qb.push(" AND archived = ")
            .push_bind(if a == "true" { 1_i64 } else { 0_i64 });
    }
    qb.push(" ORDER BY createdAt DESC");
    let rows = qb.build().fetch_all(&st.db).await?;
    let mut out = Vec::with_capacity(rows.len());
    for r in &rows {
        let h = habit_from_row(r)?;
        out.push(build_habit_full(&st.db, h, Some(30)).await?);
    }
    Ok(Json(out))
}

pub async fn create_habit(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<HabitFull>), AppError> {
    let name = body
        .get("name")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::BadRequest("Name is required".to_string()))?
        .to_string();
    let id = gen_id();
    let now = now_ms();
    sqlx::query(
        "INSERT INTO Habit (id, name, description, icon, color, frequency, frequencyConfig, targetCount, unit, reminderEnabled, reminderTime, archived, createdAt, updatedAt) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id).bind(&name).bind(truthy_str(&body, "description"))
    .bind(truthy_str(&body, "icon")).bind(str_or(&body, "color", "#6b7280"))
    .bind(str_or(&body, "frequency", "daily")).bind(truthy_str(&body, "frequencyConfig"))
    .bind(body.get("targetCount").and_then(|v| v.as_i64()).unwrap_or(1))
    .bind(truthy_str(&body, "unit"))
    .bind(if body.get("reminderEnabled").and_then(|v| v.as_bool()).unwrap_or(false) { 1_i64 } else { 0_i64 })
    .bind(truthy_str(&body, "reminderTime")).bind(0_i64).bind(now).bind(now)
    .execute(&st.db).await?;
    let row = sqlx::query("SELECT * FROM Habit WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    let h = habit_from_row(&row)?;
    Ok((
        StatusCode::CREATED,
        Json(build_habit_full(&st.db, h, None).await?),
    ))
}

pub async fn get_habit(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<HabitFull>, AppError> {
    let row = sqlx::query("SELECT * FROM Habit WHERE id = ?")
        .bind(&id)
        .fetch_optional(&st.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Habit not found".to_string()))?;
    Ok(Json(
        build_habit_full(&st.db, habit_from_row(&row)?, None).await?,
    ))
}

pub async fn update_habit(
    State(st): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<HabitFull>, AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Habit WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    if exists == 0 {
        return Err(AppError::NotFound("Habit not found".to_string()));
    }
    let now = now_ms();
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("UPDATE Habit SET ");
    let mut first = true;
    if let Some(v) = body.get("name").and_then(|v| v.as_str()) {
        crate::push_set!(qb, first, "name = ", v.to_string());
    }
    if let Some(v) = patch_str(&body, "description") {
        crate::push_set!(qb, first, "description = ", v);
    }
    if let Some(v) = patch_str(&body, "icon") {
        crate::push_set!(qb, first, "icon = ", v);
    }
    if let Some(v) = patch_str(&body, "color") {
        crate::push_set!(qb, first, "color = ", v);
    }
    if let Some(v) = body.get("frequency").and_then(|v| v.as_str()) {
        crate::push_set!(qb, first, "frequency = ", v.to_string());
    }
    if let Some(v) = patch_str(&body, "frequencyConfig") {
        crate::push_set!(qb, first, "frequencyConfig = ", v);
    }
    if let Some(v) = body.get("targetCount").and_then(|v| v.as_i64()) {
        crate::push_set!(qb, first, "targetCount = ", v);
    }
    if let Some(v) = patch_str(&body, "unit") {
        crate::push_set!(qb, first, "unit = ", v);
    }
    if let Some(v) = patch_bool(&body, "reminderEnabled") {
        crate::push_set!(
            qb,
            first,
            "reminderEnabled = ",
            if v { 1_i64 } else { 0_i64 }
        );
    }
    if let Some(v) = patch_str(&body, "reminderTime") {
        crate::push_set!(qb, first, "reminderTime = ", v);
    }
    if let Some(v) = patch_bool(&body, "archived") {
        crate::push_set!(qb, first, "archived = ", if v { 1_i64 } else { 0_i64 });
    }
    crate::push_set!(qb, first, "updatedAt = ", now);
    qb.push(" WHERE id = ").push_bind(&id);
    qb.build().execute(&st.db).await?;
    let row = sqlx::query("SELECT * FROM Habit WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    Ok(Json(
        build_habit_full(&st.db, habit_from_row(&row)?, Some(30)).await?,
    ))
}
