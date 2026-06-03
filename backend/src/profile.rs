use axum::{extract::State, http::StatusCode, Json};
use serde::Serialize;
use serde_json::Value;
use sqlx::{Row, SqlitePool};

use crate::error::AppError;
use crate::prisma_dt::PrismaDateTime;
use crate::utils::*;
use crate::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Settings {
    id: String,
    user_id: String,
    sidebar_collapsed: bool,
    default_view: String,
    week_starts_on: i64,
    date_format: String,
    time_format: String,
    currency: String,
    notifications_enabled: bool,
    backup_enabled: bool,
    backup_frequency: String,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct UserProfile {
    id: String,
    name: String,
    email: String,
    avatar: Option<String>,
    timezone: String,
    locale: String,
    theme: String,
    setup_complete: bool,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
    settings: Option<Settings>,
}

async fn fetch_settings(db: &SqlitePool, user_id: &str) -> Result<Option<Settings>, sqlx::Error> {
    let row = sqlx::query("SELECT * FROM Settings WHERE userId = ?")
        .bind(user_id)
        .fetch_optional(db)
        .await?;
    match row {
        Some(r) => Ok(Some(Settings {
            id: r.try_get("id")?,
            user_id: r.try_get("userId")?,
            sidebar_collapsed: r.try_get::<i64, _>("sidebarCollapsed")? != 0,
            default_view: r.try_get("defaultView")?,
            week_starts_on: r.try_get("weekStartsOn")?,
            date_format: r.try_get("dateFormat")?,
            time_format: r.try_get("timeFormat")?,
            currency: r.try_get("currency")?,
            notifications_enabled: r.try_get::<i64, _>("notificationsEnabled")? != 0,
            backup_enabled: r.try_get::<i64, _>("backupEnabled")? != 0,
            backup_frequency: r.try_get("backupFrequency")?,
            created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
            updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
        })),
        None => Ok(None),
    }
}

async fn profile_row(db: &SqlitePool) -> Result<Option<UserProfile>, sqlx::Error> {
    let row = sqlx::query("SELECT * FROM UserProfile LIMIT 1")
        .fetch_optional(db)
        .await?;
    match row {
        Some(r) => {
            let id: String = r.try_get("id")?;
            let settings = fetch_settings(db, &id).await?;
            Ok(Some(UserProfile {
                id,
                name: r.try_get("name")?,
                email: r.try_get("email")?,
                avatar: r.try_get("avatar")?,
                timezone: r.try_get("timezone")?,
                locale: r.try_get("locale")?,
                theme: r.try_get("theme")?,
                setup_complete: r.try_get::<i64, _>("setupComplete")? != 0,
                created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
                updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
                settings,
            }))
        }
        None => Ok(None),
    }
}

pub async fn get_profile(State(st): State<AppState>) -> Result<Json<UserProfile>, AppError> {
    profile_row(&st.db)
        .await?
        .ok_or_else(|| AppError::NotFound("No profile found".to_string()))
        .map(Json)
}

pub async fn create_profile(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<UserProfile>), AppError> {
    let name = body
        .get("name")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::BadRequest("Name is required".to_string()))?
        .to_string();
    let email = body
        .get("email")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::BadRequest("Email is required".to_string()))?
        .to_string();

    let existing = sqlx::query("SELECT id FROM UserProfile LIMIT 1")
        .fetch_optional(&st.db)
        .await?;
    if existing.is_some() {
        return Err(AppError::BadRequest(
            "Profile already exists. Use PATCH to update.".to_string(),
        ));
    }

    let id = gen_id();
    let now = now_ms();
    let avatar = truthy_str(&body, "avatar");
    let timezone = str_or(&body, "timezone", "UTC");
    let locale = str_or(&body, "locale", "en");
    let theme = str_or(&body, "theme", "system");

    sqlx::query(
        "INSERT INTO UserProfile (id, name, email, avatar, timezone, locale, theme, setupComplete, createdAt, updatedAt) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&name)
    .bind(&email)
    .bind(&avatar)
    .bind(&timezone)
    .bind(&locale)
    .bind(&theme)
    .bind(1_i64) // setupComplete = true
    .bind(now)
    .bind(now)
    .execute(&st.db)
    .await?;

    // Create default Settings row
    let settings_id = gen_id();
    sqlx::query(
        "INSERT INTO Settings (id, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?)",
    )
    .bind(&settings_id)
    .bind(&id)
    .bind(now)
    .bind(now)
    .execute(&st.db)
    .await?;

    let p = profile_row(&st.db).await?.ok_or_else(|| {
        AppError::Internal("profile vanished after create".to_string())
    })?;
    Ok((StatusCode::CREATED, Json(p)))
}

pub async fn update_profile(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<Json<UserProfile>, AppError> {
    let row = sqlx::query("SELECT id FROM UserProfile LIMIT 1")
        .fetch_optional(&st.db)
        .await?;
    let id: String = match row {
        Some(r) => r.try_get("id")?,
        None => return Err(AppError::NotFound("No profile found".to_string())),
    };

    let now = now_ms();
    use sqlx::QueryBuilder;
    let mut qb: QueryBuilder<sqlx::Sqlite> = QueryBuilder::new("UPDATE UserProfile SET ");
    let mut first = true;

    if let Some(v) = body.get("name").and_then(|v| v.as_str()) {
        let v = v.trim().to_string();
        crate::push_set!(qb, first, "name = ", v);
    }
    if let Some(v) = body.get("email").and_then(|v| v.as_str()) {
        let v = v.trim().to_string();
        crate::push_set!(qb, first, "email = ", v);
    }
    if let Some(v) = patch_str(&body, "avatar") {
        crate::push_set!(qb, first, "avatar = ", v);
    }
    if let Some(v) = body.get("timezone").and_then(|v| v.as_str()) {
        crate::push_set!(qb, first, "timezone = ", v.to_string());
    }
    if let Some(v) = body.get("locale").and_then(|v| v.as_str()) {
        crate::push_set!(qb, first, "locale = ", v.to_string());
    }
    if let Some(v) = body.get("theme").and_then(|v| v.as_str()) {
        crate::push_set!(qb, first, "theme = ", v.to_string());
    }
    if let Some(v) = patch_bool(&body, "setupComplete") {
        crate::push_set!(qb, first, "setupComplete = ", if v { 1_i64 } else { 0_i64 });
    }
    crate::push_set!(qb, first, "updatedAt = ", now);
    qb.push(" WHERE id = ").push_bind(&id);
    qb.build().execute(&st.db).await?;

    // Also update nested settings fields if provided
    if body.get("settings").is_some() {
        let s = &body["settings"];
        let mut sq: QueryBuilder<sqlx::Sqlite> = QueryBuilder::new("UPDATE Settings SET ");
        let mut sf = true;
        if let Some(v) = patch_bool(s, "sidebarCollapsed") {
            crate::push_set!(sq, sf, "sidebarCollapsed = ", if v { 1_i64 } else { 0_i64 });
        }
        if let Some(v) = s.get("defaultView").and_then(|v| v.as_str()) {
            crate::push_set!(sq, sf, "defaultView = ", v.to_string());
        }
        if let Some(v) = s.get("weekStartsOn").and_then(|v| v.as_i64()) {
            crate::push_set!(sq, sf, "weekStartsOn = ", v);
        }
        if let Some(v) = s.get("dateFormat").and_then(|v| v.as_str()) {
            crate::push_set!(sq, sf, "dateFormat = ", v.to_string());
        }
        if let Some(v) = s.get("timeFormat").and_then(|v| v.as_str()) {
            crate::push_set!(sq, sf, "timeFormat = ", v.to_string());
        }
        if let Some(v) = s.get("currency").and_then(|v| v.as_str()) {
            crate::push_set!(sq, sf, "currency = ", v.to_string());
        }
        if let Some(v) = patch_bool(s, "notificationsEnabled") {
            crate::push_set!(sq, sf, "notificationsEnabled = ", if v { 1_i64 } else { 0_i64 });
        }
        if let Some(v) = patch_bool(s, "backupEnabled") {
            crate::push_set!(sq, sf, "backupEnabled = ", if v { 1_i64 } else { 0_i64 });
        }
        if let Some(v) = s.get("backupFrequency").and_then(|v| v.as_str()) {
            crate::push_set!(sq, sf, "backupFrequency = ", v.to_string());
        }
        crate::push_set!(sq, sf, "updatedAt = ", now);
        sq.push(" WHERE userId = ").push_bind(&id);
        sq.build().execute(&st.db).await?;
    }

    let p = profile_row(&st.db)
        .await?
        .ok_or_else(|| AppError::Internal("profile vanished".to_string()))?;
    Ok(Json(p))
}
