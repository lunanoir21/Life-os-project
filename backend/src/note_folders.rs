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
pub(crate) struct FolderCount {
    notes: i64,
    children: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct NoteFolder {
    id: String,
    name: String,
    icon: Option<String>,
    color: Option<String>,
    parent_id: Option<String>,
    order: i64,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
    #[serde(rename = "_count")]
    count: FolderCount,
}

pub async fn list_note_folders(
    State(st): State<AppState>,
) -> Result<Json<Vec<NoteFolder>>, AppError> {
    let rows = sqlx::query("SELECT * FROM NoteFolder ORDER BY \"order\" ASC")
        .fetch_all(&st.db)
        .await?;

    let mut out = Vec::with_capacity(rows.len());
    for r in &rows {
        let id: String = r.try_get("id")?;
        let notes: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Note WHERE folderId = ?")
            .bind(&id).fetch_one(&st.db).await?;
        let children: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM NoteFolder WHERE parentId = ?")
            .bind(&id).fetch_one(&st.db).await?;
        out.push(NoteFolder {
            id,
            name: r.try_get("name")?,
            icon: r.try_get("icon")?,
            color: r.try_get("color")?,
            parent_id: r.try_get("parentId")?,
            order: r.try_get("order")?,
            created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
            updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
            count: FolderCount { notes, children },
        });
    }
    Ok(Json(out))
}

pub async fn create_note_folder(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<NoteFolder>), AppError> {
    let name = body
        .get("name").and_then(|v| v.as_str()).map(str::trim).filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::BadRequest("Name is required".to_string()))?
        .to_string();
    let id = gen_id();
    let now = now_ms();
    let icon = truthy_str(&body, "icon");
    let color = truthy_str(&body, "color");
    let parent_id = truthy_str(&body, "parentId");
    let order = body.get("order").and_then(|v| v.as_i64()).unwrap_or(0);

    sqlx::query(
        "INSERT INTO NoteFolder (id, name, icon, color, parentId, \"order\", createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id).bind(&name).bind(&icon).bind(&color).bind(&parent_id).bind(order).bind(now).bind(now)
    .execute(&st.db).await?;

    let r = sqlx::query("SELECT * FROM NoteFolder WHERE id = ?").bind(&id).fetch_one(&st.db).await?;
    let notes: i64 = 0;
    let children: i64 = 0;
    Ok((StatusCode::CREATED, Json(NoteFolder {
        id,
        name: r.try_get("name")?,
        icon: r.try_get("icon")?,
        color: r.try_get("color")?,
        parent_id: r.try_get("parentId")?,
        order: r.try_get("order")?,
        created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
        updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
        count: FolderCount { notes, children },
    })))
}
