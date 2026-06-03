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
pub(crate) struct TagMini { id: String, name: String, color: String }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct JournalTagFull {
    id: String,
    entry_id: String,
    tag_id: String,
    tag: TagMini,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct JournalEntry {
    id: String,
    title: Option<String>,
    content: String,
    mood: Option<String>,
    mood_score: Option<i64>,
    energy: Option<i64>,
    stress: Option<i64>,
    gratitude: Option<String>,
    tags: Option<String>,
    is_favorite: bool,
    date: PrismaDateTime,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct JournalEntryFull {
    #[serde(flatten)]
    entry: JournalEntry,
    entry_tags: Vec<JournalTagFull>,
}

#[derive(Serialize)]
pub(crate) struct JournalList {
    entries: Vec<JournalEntryFull>,
    total: i64,
}

fn entry_from_row(r: &sqlx::sqlite::SqliteRow) -> Result<JournalEntry, sqlx::Error> {
    Ok(JournalEntry {
        id: r.try_get("id")?,
        title: r.try_get("title")?,
        content: r.try_get("content")?,
        mood: r.try_get("mood")?,
        mood_score: r.try_get("moodScore")?,
        energy: r.try_get("energy")?,
        stress: r.try_get("stress")?,
        gratitude: r.try_get("gratitude")?,
        tags: r.try_get("tags")?,
        is_favorite: r.try_get::<i64, _>("isFavorite")? != 0,
        date: PrismaDateTime(r.try_get::<i64, _>("date")?),
        created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
        updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
    })
}

async fn fetch_entry_tags(db: &SqlitePool, entry_id: &str) -> Result<Vec<JournalTagFull>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT jt.id, jt.entryId, jt.tagId, t.id AS tid, t.name AS tname, t.color AS tcolor \
         FROM JournalTag jt JOIN Tag t ON t.id = jt.tagId WHERE jt.entryId = ?",
    ).bind(entry_id).fetch_all(db).await?;
    rows.iter().map(|r| Ok(JournalTagFull {
        id: r.try_get("id")?,
        entry_id: r.try_get("entryId")?,
        tag_id: r.try_get("tagId")?,
        tag: TagMini { id: r.try_get("tid")?, name: r.try_get("tname")?, color: r.try_get("tcolor")? },
    })).collect()
}

pub async fn list_journal(
    State(st): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<JournalList>, AppError> {
    let limit = params.get("limit").and_then(|v| v.parse::<i64>().ok()).unwrap_or(50);
    let offset = params.get("offset").and_then(|v| v.parse::<i64>().ok()).unwrap_or(0);

    let mut count_qb: QueryBuilder<Sqlite> = QueryBuilder::new("SELECT COUNT(*) FROM JournalEntry WHERE 1=1");
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("SELECT * FROM JournalEntry WHERE 1=1");
    if let Some(m) = params.get("mood") {
        qb.push(" AND mood = ").push_bind(m.clone());
        count_qb.push(" AND mood = ").push_bind(m.clone());
    }
    if let Some(f) = params.get("isFavorite") {
        let b: i64 = if f == "true" { 1 } else { 0 };
        qb.push(" AND isFavorite = ").push_bind(b);
        count_qb.push(" AND isFavorite = ").push_bind(b);
    }
    let total: i64 = count_qb.build_query_scalar().fetch_one(&st.db).await?;
    qb.push(" ORDER BY date DESC LIMIT ").push_bind(limit).push(" OFFSET ").push_bind(offset);
    let rows = qb.build().fetch_all(&st.db).await?;

    let mut entries = Vec::with_capacity(rows.len());
    for r in &rows {
        let entry = entry_from_row(r)?;
        let entry_tags = fetch_entry_tags(&st.db, &entry.id).await?;
        entries.push(JournalEntryFull { entry, entry_tags });
    }
    Ok(Json(JournalList { entries, total }))
}

pub async fn create_journal(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<JournalEntryFull>), AppError> {
    let id = gen_id();
    let now = now_ms();
    let date = opt_ms(&body, "date").unwrap_or(now);

    sqlx::query(
        "INSERT INTO JournalEntry (id, title, content, mood, moodScore, energy, stress, gratitude, tags, isFavorite, date, createdAt, updatedAt) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(truthy_str(&body, "title"))
    .bind(body.get("content").and_then(|v| v.as_str()).unwrap_or("").to_string())
    .bind(truthy_str(&body, "mood"))
    .bind(body.get("moodScore").and_then(|v| v.as_i64()))
    .bind(body.get("energy").and_then(|v| v.as_i64()))
    .bind(body.get("stress").and_then(|v| v.as_i64()))
    .bind(truthy_str(&body, "gratitude"))
    .bind(truthy_str(&body, "tags"))
    .bind(if body.get("isFavorite").and_then(|v| v.as_bool()).unwrap_or(false) { 1_i64 } else { 0_i64 })
    .bind(date).bind(now).bind(now)
    .execute(&st.db).await?;

    let r = sqlx::query("SELECT * FROM JournalEntry WHERE id = ?").bind(&id).fetch_one(&st.db).await?;
    let entry = entry_from_row(&r)?;
    let entry_tags = fetch_entry_tags(&st.db, &id).await?;
    Ok((StatusCode::CREATED, Json(JournalEntryFull { entry, entry_tags })))
}

pub async fn get_journal(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<JournalEntryFull>, AppError> {
    let r = sqlx::query("SELECT * FROM JournalEntry WHERE id = ?")
        .bind(&id).fetch_optional(&st.db).await?
        .ok_or_else(|| AppError::NotFound("Journal entry not found".to_string()))?;
    let entry = entry_from_row(&r)?;
    let entry_tags = fetch_entry_tags(&st.db, &id).await?;
    Ok(Json(JournalEntryFull { entry, entry_tags }))
}

pub async fn update_journal(
    State(st): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<JournalEntryFull>, AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM JournalEntry WHERE id = ?")
        .bind(&id).fetch_one(&st.db).await?;
    if exists == 0 { return Err(AppError::NotFound("Journal entry not found".to_string())); }
    let now = now_ms();
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("UPDATE JournalEntry SET ");
    let mut first = true;
    if let Some(v) = patch_str(&body, "title") { crate::push_set!(qb, first, "title = ", v); }
    if let Some(v) = body.get("content").and_then(|v| v.as_str()) { crate::push_set!(qb, first, "content = ", v.to_string()); }
    if let Some(v) = patch_str(&body, "mood") { crate::push_set!(qb, first, "mood = ", v); }
    if let Some(v) = patch_i64(&body, "moodScore") { crate::push_set!(qb, first, "moodScore = ", v); }
    if let Some(v) = patch_i64(&body, "energy") { crate::push_set!(qb, first, "energy = ", v); }
    if let Some(v) = patch_i64(&body, "stress") { crate::push_set!(qb, first, "stress = ", v); }
    if let Some(v) = patch_str(&body, "gratitude") { crate::push_set!(qb, first, "gratitude = ", v); }
    if let Some(v) = patch_str(&body, "tags") { crate::push_set!(qb, first, "tags = ", v); }
    if let Some(v) = patch_bool(&body, "isFavorite") { crate::push_set!(qb, first, "isFavorite = ", if v {1_i64} else {0_i64}); }
    if let Some(v) = patch_ms(&body, "date") { crate::push_set!(qb, first, "date = ", v); }
    crate::push_set!(qb, first, "updatedAt = ", now);
    qb.push(" WHERE id = ").push_bind(&id);
    qb.build().execute(&st.db).await?;

    let r = sqlx::query("SELECT * FROM JournalEntry WHERE id = ?").bind(&id).fetch_one(&st.db).await?;
    let entry = entry_from_row(&r)?;
    let entry_tags = fetch_entry_tags(&st.db, &id).await?;
    Ok(Json(JournalEntryFull { entry, entry_tags }))
}

pub async fn delete_journal(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM JournalEntry WHERE id = ?")
        .bind(&id).fetch_one(&st.db).await?;
    if exists == 0 { return Err(AppError::NotFound("Journal entry not found".to_string())); }
    sqlx::query("DELETE FROM JournalEntry WHERE id = ?").bind(&id).execute(&st.db).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}
