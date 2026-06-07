/// GET /api/dashboard/widgets   — load widget layout from DB
/// PUT /api/dashboard/widgets   — save widget layout to DB
///
/// Storage: Workspace.layout (JSON string `{ "widgets": ["id1", "id2", …] }`)
/// We keep exactly one "default" workspace row (isDefault = 1).
use axum::extract::State;
use axum::Json;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::Row;

use crate::error::AppError;
use crate::utils::{gen_id, now_ms};
use crate::AppState;

// ─── response / request types ───────────────────────────────────────────────

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WidgetsResponse {
    /// Ordered list of enabled widget IDs.  Empty means "no saved layout yet"
    /// — the client should fall back to its built-in default.
    widgets: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SaveWidgetsBody {
    widgets: Vec<String>,
}

// ─── GET ─────────────────────────────────────────────────────────────────────

pub(crate) async fn get_widgets(
    State(state): State<AppState>,
) -> Result<Json<WidgetsResponse>, AppError> {
    let row = sqlx::query(
        "SELECT layout FROM Workspace WHERE isDefault = 1 LIMIT 1",
    )
    .fetch_optional(&state.db)
    .await?;

    if let Some(r) = row {
        let layout: Option<String> = r.try_get("layout").ok().flatten();
        if let Some(json_str) = layout {
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&json_str) {
                if let Some(arr) = parsed.get("widgets").and_then(|v| v.as_array()) {
                    let ids: Vec<String> = arr
                        .iter()
                        .filter_map(|v| v.as_str().map(str::to_string))
                        .collect();
                    if !ids.is_empty() {
                        return Ok(Json(WidgetsResponse { widgets: ids }));
                    }
                }
            }
        }
    }

    // No workspace row, or layout is empty — return empty so the client
    // falls back to its built-in default widget list.
    Ok(Json(WidgetsResponse { widgets: vec![] }))
}

// ─── PUT ─────────────────────────────────────────────────────────────────────

pub(crate) async fn save_widgets(
    State(state): State<AppState>,
    Json(body): Json<SaveWidgetsBody>,
) -> Result<Json<WidgetsResponse>, AppError> {
    let layout = serde_json::to_string(&json!({ "widgets": body.widgets }))
        .map_err(|e| AppError::Internal(format!("json: {e}")))?;
    let now = now_ms();

    // Try to update the existing default workspace first.
    let result = sqlx::query(
        "UPDATE Workspace SET layout = ?, updatedAt = ? WHERE isDefault = 1",
    )
    .bind(&layout)
    .bind(now)
    .execute(&state.db)
    .await?;

    if result.rows_affected() == 0 {
        // No default workspace yet — create one.
        let id = gen_id();
        sqlx::query(
            r#"INSERT INTO Workspace (id, name, isDefault, layout, "order", createdAt, updatedAt)
               VALUES (?, 'Default', 1, ?, 0, ?, ?)"#,
        )
        .bind(&id)
        .bind(&layout)
        .bind(now)
        .bind(now)
        .execute(&state.db)
        .await?;
    }

    Ok(Json(WidgetsResponse {
        widgets: body.widgets,
    }))
}
