use axum::{
    extract::{Query, State},
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
pub(crate) struct HabitMini {
    id: String,
    name: String,
    icon: Option<String>,
    color: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct HabitLogFull {
    id: String,
    habit_id: String,
    date: PrismaDateTime,
    count: i64,
    note: Option<String>,
    created_at: PrismaDateTime,
    habit: HabitMini,
}

pub async fn list_habit_logs(
    State(st): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Vec<HabitLogFull>>, AppError> {
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new(
        "SELECT hl.*, h.id AS hid, h.name AS hname, h.icon AS hicon, h.color AS hcolor \
         FROM HabitLog hl JOIN Habit h ON h.id = hl.habitId WHERE 1=1",
    );
    if let Some(hid) = params.get("habitId") {
        qb.push(" AND hl.habitId = ").push_bind(hid.clone());
    }
    if let Some(d) = params.get("date") {
        if let Some(day_ms) = parse_day_ms(d) {
            let day_end = day_ms + 86_400_000 - 1;
            qb.push(" AND hl.date >= ")
                .push_bind(day_ms)
                .push(" AND hl.date <= ")
                .push_bind(day_end);
        }
    }
    qb.push(" ORDER BY hl.date DESC");
    let rows = qb.build().fetch_all(&st.db).await?;
    let out = rows
        .iter()
        .map(|r| {
            Ok(HabitLogFull {
                id: r.try_get("id")?,
                habit_id: r.try_get("habitId")?,
                date: PrismaDateTime(r.try_get::<i64, _>("date")?),
                count: r.try_get("count")?,
                note: r.try_get("note")?,
                created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
                habit: HabitMini {
                    id: r.try_get("hid")?,
                    name: r.try_get("hname")?,
                    icon: r.try_get("hicon")?,
                    color: r.try_get("hcolor")?,
                },
            })
        })
        .collect::<Result<Vec<_>, sqlx::Error>>()?;
    Ok(Json(out))
}

pub async fn create_habit_log(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<HabitLogFull>), AppError> {
    let habit_id = body
        .get("habitId")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::BadRequest("habitId is required".to_string()))?
        .to_string();
    let date_str = body
        .get("date")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::BadRequest("date is required".to_string()))?
        .to_string();
    let date_ms = parse_day_ms(&date_str)
        .ok_or_else(|| AppError::BadRequest("Invalid date format".to_string()))?;
    let count = body.get("count").and_then(|v| v.as_i64()).unwrap_or(1);
    let note = truthy_str(&body, "note");
    let now = now_ms();

    // Upsert: preserve existing id/createdAt if the (habitId, date) pair already exists.
    // Use ON CONFLICT to update only count and note.
    let exists_row = sqlx::query("SELECT id FROM HabitLog WHERE habitId = ? AND date = ?")
        .bind(&habit_id)
        .bind(date_ms)
        .fetch_optional(&st.db)
        .await?;

    let log_id = if let Some(r) = exists_row {
        let eid: String = r.try_get("id")?;
        sqlx::query("UPDATE HabitLog SET count = ?, note = ? WHERE id = ?")
            .bind(count)
            .bind(&note)
            .bind(&eid)
            .execute(&st.db)
            .await?;
        eid
    } else {
        let new_id = gen_id();
        sqlx::query(
            "INSERT INTO HabitLog (id, habitId, date, count, note, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
        ).bind(&new_id).bind(&habit_id).bind(date_ms).bind(count).bind(&note).bind(now)
        .execute(&st.db).await?;
        new_id
    };

    let row = sqlx::query(
        "SELECT hl.*, h.id AS hid, h.name AS hname, h.icon AS hicon, h.color AS hcolor \
         FROM HabitLog hl JOIN Habit h ON h.id = hl.habitId WHERE hl.id = ?",
    )
    .bind(&log_id)
    .fetch_one(&st.db)
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(HabitLogFull {
            id: row.try_get("id")?,
            habit_id: row.try_get("habitId")?,
            date: PrismaDateTime(row.try_get::<i64, _>("date")?),
            count: row.try_get("count")?,
            note: row.try_get("note")?,
            created_at: PrismaDateTime(row.try_get::<i64, _>("createdAt")?),
            habit: HabitMini {
                id: row.try_get("hid")?,
                name: row.try_get("hname")?,
                icon: row.try_get("hicon")?,
                color: row.try_get("hcolor")?,
            },
        }),
    ))
}
