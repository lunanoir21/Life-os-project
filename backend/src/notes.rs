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
pub(crate) struct FolderMini {
    id: String,
    name: String,
    icon: Option<String>,
    color: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TagMini {
    id: String,
    name: String,
    color: String,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct NoteTagFull {
    id: String,
    note_id: String,
    tag_id: String,
    tag: TagMini,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct NoteMini {
    id: String,
    title: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct NoteLinkOut {
    id: String,
    source_note_id: String,
    target_note_id: String,
    target: NoteMini,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct NoteBacklinkOut {
    id: String,
    source_note_id: String,
    target_note_id: String,
    source: NoteMini,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BookmarkOut {
    id: String,
    url: String,
    title: String,
    description: Option<String>,
    favicon: Option<String>,
    note_id: Option<String>,
    created_at: PrismaDateTime,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct NoteBacklinksCount {
    backlinks: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    id: String,
    title: String,
    content: String,
    r#type: String,
    icon: Option<String>,
    color: Option<String>,
    is_pinned: bool,
    is_favorite: bool,
    word_count: i64,
    archived: bool,
    folder_id: Option<String>,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct NoteList {
    #[serde(flatten)]
    note: Note,
    folder: Option<FolderMini>,
    tags: Vec<NoteTagFull>,
    #[serde(rename = "_count")]
    count: NoteBacklinksCount,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct NoteDetail {
    #[serde(flatten)]
    note: Note,
    folder: Option<FolderMini>,
    tags: Vec<NoteTagFull>,
    links: Vec<NoteLinkOut>,
    backlinks: Vec<NoteBacklinkOut>,
    bookmarks: Vec<BookmarkOut>,
}

fn note_from_row(r: &sqlx::sqlite::SqliteRow) -> Result<Note, sqlx::Error> {
    Ok(Note {
        id: r.try_get("id")?,
        title: r.try_get("title")?,
        content: r.try_get("content")?,
        r#type: r.try_get("type")?,
        icon: r.try_get("icon")?,
        color: r.try_get("color")?,
        is_pinned: r.try_get::<i64, _>("isPinned")? != 0,
        is_favorite: r.try_get::<i64, _>("isFavorite")? != 0,
        word_count: r.try_get("wordCount")?,
        archived: r.try_get::<i64, _>("archived")? != 0,
        folder_id: r.try_get("folderId")?,
        created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
        updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
    })
}

async fn fetch_folder(db: &SqlitePool, id: &str) -> Result<Option<FolderMini>, sqlx::Error> {
    let row = sqlx::query("SELECT id,name,icon,color FROM NoteFolder WHERE id = ?")
        .bind(id).fetch_optional(db).await?;
    Ok(row.map(|r| FolderMini {
        id: r.try_get("id").unwrap_or_default(),
        name: r.try_get("name").unwrap_or_default(),
        icon: r.try_get("icon").unwrap_or_default(),
        color: r.try_get("color").unwrap_or_default(),
    }))
}

async fn fetch_note_tags(db: &SqlitePool, note_id: &str) -> Result<Vec<NoteTagFull>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT nt.id AS nt_id, nt.noteId AS nt_noteId, nt.tagId AS nt_tagId, \
         t.id AS t_id, t.name AS t_name, t.color AS t_color, \
         t.createdAt AS t_createdAt, t.updatedAt AS t_updatedAt \
         FROM NoteTag nt JOIN Tag t ON t.id = nt.tagId WHERE nt.noteId = ?",
    )
    .bind(note_id).fetch_all(db).await?;
    rows.iter().map(|r| Ok(NoteTagFull {
        id: r.try_get("nt_id")?,
        note_id: r.try_get("nt_noteId")?,
        tag_id: r.try_get("nt_tagId")?,
        tag: TagMini {
            id: r.try_get("t_id")?,
            name: r.try_get("t_name")?,
            color: r.try_get("t_color")?,
            created_at: PrismaDateTime(r.try_get::<i64, _>("t_createdAt")?),
            updated_at: PrismaDateTime(r.try_get::<i64, _>("t_updatedAt")?),
        },
    })).collect()
}

fn count_words(s: &str) -> i64 {
    s.split_whitespace().count() as i64
}

pub async fn list_notes(
    State(st): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Vec<NoteList>>, AppError> {
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("SELECT * FROM Note WHERE 1=1");
    if let Some(fid) = params.get("folderId") {
        qb.push(" AND folderId = ").push_bind(fid.clone());
    }
    if let Some(t) = params.get("type") {
        qb.push(" AND type = ").push_bind(t.clone());
    }
    if let Some(arch) = params.get("archived") {
        let b: i64 = if arch == "true" { 1 } else { 0 };
        qb.push(" AND archived = ").push_bind(b);
    }
    if let Some(q) = params.get("search") {
        let pat = format!("%{}%", q);
        qb.push(" AND (title LIKE ").push_bind(pat.clone())
          .push(" OR content LIKE ").push_bind(pat).push(")");
    }
    qb.push(" ORDER BY isPinned DESC, updatedAt DESC");

    let rows = qb.build().fetch_all(&st.db).await?;
    let mut out = Vec::with_capacity(rows.len());
    for r in &rows {
        let note = note_from_row(r)?;
        let folder = match &note.folder_id {
            Some(fid) => fetch_folder(&st.db, fid).await?,
            None => None,
        };
        let tags = fetch_note_tags(&st.db, &note.id).await?;
        let backlinks: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM NoteLink WHERE targetNoteId = ?",
        ).bind(&note.id).fetch_one(&st.db).await?;
        out.push(NoteList { note, folder, tags, count: NoteBacklinksCount { backlinks } });
    }
    Ok(Json(out))
}

pub async fn create_note(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<NoteDetail>), AppError> {
    let title = body
        .get("title").and_then(|v| v.as_str()).map(str::trim).filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::BadRequest("Title is required".to_string()))?
        .to_string();
    let content = body.get("content").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let word_count = count_words(&content);
    let id = gen_id();
    let now = now_ms();

    sqlx::query(
        "INSERT INTO Note (id, title, content, type, icon, color, isPinned, isFavorite, wordCount, archived, folderId, createdAt, updatedAt) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id).bind(&title).bind(&content)
    .bind(str_or(&body, "type", "note"))
    .bind(truthy_str(&body, "icon")).bind(truthy_str(&body, "color"))
    .bind(if body.get("isPinned").and_then(|v| v.as_bool()).unwrap_or(false) { 1_i64 } else { 0_i64 })
    .bind(if body.get("isFavorite").and_then(|v| v.as_bool()).unwrap_or(false) { 1_i64 } else { 0_i64 })
    .bind(word_count)
    .bind(0_i64) // archived = false
    .bind(truthy_str(&body, "folderId"))
    .bind(now).bind(now)
    .execute(&st.db).await?;

    let detail = get_note_detail(&st.db, &id).await?
        .ok_or_else(|| AppError::Internal("note vanished".to_string()))?;
    Ok((StatusCode::CREATED, Json(detail)))
}

async fn get_note_detail(db: &SqlitePool, id: &str) -> Result<Option<NoteDetail>, sqlx::Error> {
    let row = sqlx::query("SELECT * FROM Note WHERE id = ?").bind(id).fetch_optional(db).await?;
    match row {
        None => Ok(None),
        Some(r) => {
            let note = note_from_row(&r)?;
            let folder = match &note.folder_id {
                Some(fid) => fetch_folder(db, fid).await?,
                None => None,
            };
            let tags = fetch_note_tags(db, id).await?;
            let link_rows = sqlx::query(
                "SELECT nl.id, nl.sourceNoteId, nl.targetNoteId, n.id AS tid, n.title AS ttitle \
                 FROM NoteLink nl JOIN Note n ON n.id = nl.targetNoteId WHERE nl.sourceNoteId = ?",
            ).bind(id).fetch_all(db).await?;
            let links = link_rows.iter().map(|r| Ok(NoteLinkOut {
                id: r.try_get("id")?,
                source_note_id: r.try_get("sourceNoteId")?,
                target_note_id: r.try_get("targetNoteId")?,
                target: NoteMini { id: r.try_get("tid")?, title: r.try_get("ttitle")? },
            })).collect::<Result<Vec<_>, sqlx::Error>>()?;
            let bl_rows = sqlx::query(
                "SELECT nl.id, nl.sourceNoteId, nl.targetNoteId, n.id AS sid, n.title AS stitle \
                 FROM NoteLink nl JOIN Note n ON n.id = nl.sourceNoteId WHERE nl.targetNoteId = ?",
            ).bind(id).fetch_all(db).await?;
            let backlinks = bl_rows.iter().map(|r| Ok(NoteBacklinkOut {
                id: r.try_get("id")?,
                source_note_id: r.try_get("sourceNoteId")?,
                target_note_id: r.try_get("targetNoteId")?,
                source: NoteMini { id: r.try_get("sid")?, title: r.try_get("stitle")? },
            })).collect::<Result<Vec<_>, sqlx::Error>>()?;
            let bm_rows = sqlx::query("SELECT * FROM Bookmark WHERE noteId = ?").bind(id).fetch_all(db).await?;
            let bookmarks = bm_rows.iter().map(|r| Ok(BookmarkOut {
                id: r.try_get("id")?,
                url: r.try_get("url")?,
                title: r.try_get("title")?,
                description: r.try_get("description")?,
                favicon: r.try_get("favicon")?,
                note_id: r.try_get("noteId")?,
                created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
            })).collect::<Result<Vec<_>, sqlx::Error>>()?;
            Ok(Some(NoteDetail { note, folder, tags, links, backlinks, bookmarks }))
        }
    }
}

pub async fn get_note(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<NoteDetail>, AppError> {
    get_note_detail(&st.db, &id).await?
        .ok_or_else(|| AppError::NotFound("Note not found".to_string()))
        .map(Json)
}

pub async fn update_note(
    State(st): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<NoteDetail>, AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Note WHERE id = ?")
        .bind(&id).fetch_one(&st.db).await?;
    if exists == 0 {
        return Err(AppError::NotFound("Note not found".to_string()));
    }

    let now = now_ms();
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("UPDATE Note SET ");
    let mut first = true;

    if let Some(v) = body.get("title").and_then(|v| v.as_str()) {
        crate::push_set!(qb, first, "title = ", v.to_string());
    }
    if let Some(v) = body.get("content").and_then(|v| v.as_str()) {
        let wc = count_words(v);
        crate::push_set!(qb, first, "content = ", v.to_string());
        crate::push_set!(qb, first, "wordCount = ", wc);
    }
    if let Some(v) = body.get("type").and_then(|v| v.as_str()) {
        crate::push_set!(qb, first, "type = ", v.to_string());
    }
    if let Some(v) = patch_str(&body, "icon") { crate::push_set!(qb, first, "icon = ", v); }
    if let Some(v) = patch_str(&body, "color") { crate::push_set!(qb, first, "color = ", v); }
    if let Some(v) = patch_bool(&body, "isPinned") {
        crate::push_set!(qb, first, "isPinned = ", if v { 1_i64 } else { 0_i64 });
    }
    if let Some(v) = patch_bool(&body, "isFavorite") {
        crate::push_set!(qb, first, "isFavorite = ", if v { 1_i64 } else { 0_i64 });
    }
    if let Some(v) = patch_str(&body, "folderId") { crate::push_set!(qb, first, "folderId = ", v); }
    if let Some(v) = patch_bool(&body, "archived") {
        crate::push_set!(qb, first, "archived = ", if v { 1_i64 } else { 0_i64 });
    }
    crate::push_set!(qb, first, "updatedAt = ", now);
    qb.push(" WHERE id = ").push_bind(&id);
    qb.build().execute(&st.db).await?;

    get_note_detail(&st.db, &id).await?
        .ok_or_else(|| AppError::Internal("note vanished".to_string()))
        .map(Json)
}

pub async fn delete_note(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Note WHERE id = ?")
        .bind(&id).fetch_one(&st.db).await?;
    if exists == 0 {
        return Err(AppError::NotFound("Note not found".to_string()));
    }
    sqlx::query("DELETE FROM Note WHERE id = ?").bind(&id).execute(&st.db).await?;
    Ok(Json(serde_json::json!({ "success": true })))
}
