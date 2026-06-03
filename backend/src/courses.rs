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
pub(crate) struct CourseResource {
    id: String,
    course_id: String,
    title: String,
    r#type: String,
    url: Option<String>,
    completed: bool,
    notes: Option<String>,
    order: i64,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ResourceCount {
    resources: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Course {
    id: String,
    title: String,
    description: Option<String>,
    provider: Option<String>,
    url: Option<String>,
    status: String,
    progress: i64,
    start_date: Option<PrismaDateTime>,
    end_date: Option<PrismaDateTime>,
    rating: Option<i64>,
    notes: Option<String>,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
    resources: Vec<CourseResource>,
    #[serde(rename = "_count")]
    count: ResourceCount,
}

fn resource_from_row(r: &sqlx::sqlite::SqliteRow) -> Result<CourseResource, sqlx::Error> {
    Ok(CourseResource {
        id: r.try_get("id")?,
        course_id: r.try_get("courseId")?,
        title: r.try_get("title")?,
        r#type: r.try_get("type")?,
        url: r.try_get("url")?,
        completed: r.try_get::<i64, _>("completed")? != 0,
        notes: r.try_get("notes")?,
        order: r.try_get("order")?,
        created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
        updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
    })
}

async fn course_resources(
    db: &SqlitePool,
    course_id: &str,
) -> Result<Vec<CourseResource>, sqlx::Error> {
    let rows =
        sqlx::query("SELECT * FROM CourseResource WHERE courseId = ? ORDER BY \"order\" ASC")
            .bind(course_id)
            .fetch_all(db)
            .await?;
    rows.iter().map(resource_from_row).collect()
}

fn course_from_row(
    r: &sqlx::sqlite::SqliteRow,
    resources: Vec<CourseResource>,
) -> Result<Course, sqlx::Error> {
    let count = resources.len() as i64;
    Ok(Course {
        id: r.try_get("id")?,
        title: r.try_get("title")?,
        description: r.try_get("description")?,
        provider: r.try_get("provider")?,
        url: r.try_get("url")?,
        status: r.try_get("status")?,
        progress: r.try_get("progress")?,
        start_date: r
            .try_get::<Option<i64>, _>("startDate")?
            .map(PrismaDateTime),
        end_date: r.try_get::<Option<i64>, _>("endDate")?.map(PrismaDateTime),
        rating: r.try_get("rating")?,
        notes: r.try_get("notes")?,
        created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
        updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
        resources,
        count: ResourceCount { resources: count },
    })
}

pub async fn list_courses(
    State(st): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Vec<Course>>, AppError> {
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("SELECT * FROM Course WHERE 1=1");
    if let Some(s) = params.get("status") {
        qb.push(" AND status = ").push_bind(s.clone());
    }
    if let Some(p) = params.get("provider") {
        qb.push(" AND provider = ").push_bind(p.clone());
    }
    qb.push(" ORDER BY createdAt DESC");
    let rows = qb.build().fetch_all(&st.db).await?;
    let mut out = Vec::with_capacity(rows.len());
    for r in &rows {
        let id: String = r.try_get("id")?;
        let resources = course_resources(&st.db, &id).await?;
        out.push(course_from_row(r, resources)?);
    }
    Ok(Json(out))
}

pub async fn create_course(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<Course>), AppError> {
    let title = body
        .get("title")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::BadRequest("Title is required".to_string()))?
        .to_string();
    let id = gen_id();
    let now = now_ms();

    sqlx::query(
        "INSERT INTO Course (id, title, description, provider, url, status, progress, startDate, endDate, rating, notes, createdAt, updatedAt) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id).bind(&title).bind(truthy_str(&body, "description"))
    .bind(truthy_str(&body, "provider")).bind(truthy_str(&body, "url"))
    .bind(str_or(&body, "status", "not-started"))
    .bind(body.get("progress").and_then(|v| v.as_i64()).unwrap_or(0))
    .bind(opt_ms(&body, "startDate")).bind(opt_ms(&body, "endDate"))
    .bind(body.get("rating").and_then(|v| v.as_i64()))
    .bind(truthy_str(&body, "notes"))
    .bind(now).bind(now)
    .execute(&st.db).await?;

    // Create nested resources if provided
    if let Some(res_arr) = body.get("resources").and_then(|v| v.as_array()) {
        for (i, res) in res_arr.iter().enumerate() {
            let rid = gen_id();
            sqlx::query(
                "INSERT INTO CourseResource (id, courseId, title, type, url, completed, notes, \"order\", createdAt, updatedAt) \
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(&rid).bind(&id)
            .bind(res.get("title").and_then(|v| v.as_str()).unwrap_or(""))
            .bind(res.get("type").and_then(|v| v.as_str()).unwrap_or("video"))
            .bind(res.get("url").and_then(|v| v.as_str()))
            .bind(if res.get("completed").and_then(|v| v.as_bool()).unwrap_or(false) { 1_i64 } else { 0_i64 })
            .bind(res.get("notes").and_then(|v| v.as_str()))
            .bind(res.get("order").and_then(|v| v.as_i64()).unwrap_or(i as i64))
            .bind(now).bind(now)
            .execute(&st.db).await?;
        }
    }

    let row = sqlx::query("SELECT * FROM Course WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    let resources = course_resources(&st.db, &id).await?;
    Ok((StatusCode::CREATED, Json(course_from_row(&row, resources)?)))
}

pub async fn get_course(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Course>, AppError> {
    let row = sqlx::query("SELECT * FROM Course WHERE id = ?")
        .bind(&id)
        .fetch_optional(&st.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Course not found".to_string()))?;
    let resources = course_resources(&st.db, &id).await?;
    Ok(Json(course_from_row(&row, resources)?))
}

pub async fn update_course(
    State(st): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<Course>, AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Course WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    if exists == 0 {
        return Err(AppError::NotFound("Course not found".to_string()));
    }
    let now = now_ms();
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("UPDATE Course SET ");
    let mut first = true;
    if let Some(v) = body.get("title").and_then(|v| v.as_str()) {
        crate::push_set!(qb, first, "title = ", v.to_string());
    }
    if let Some(v) = patch_str(&body, "description") {
        crate::push_set!(qb, first, "description = ", v);
    }
    if let Some(v) = patch_str(&body, "provider") {
        crate::push_set!(qb, first, "provider = ", v);
    }
    if let Some(v) = patch_str(&body, "url") {
        crate::push_set!(qb, first, "url = ", v);
    }
    if let Some(v) = body.get("status").and_then(|v| v.as_str()) {
        crate::push_set!(qb, first, "status = ", v.to_string());
    }
    if let Some(v) = body.get("progress").and_then(|v| v.as_i64()) {
        crate::push_set!(qb, first, "progress = ", v);
    }
    if let Some(v) = patch_ms(&body, "startDate") {
        crate::push_set!(qb, first, "startDate = ", v);
    }
    if let Some(v) = patch_ms(&body, "endDate") {
        crate::push_set!(qb, first, "endDate = ", v);
    }
    if let Some(v) = patch_i64(&body, "rating") {
        crate::push_set!(qb, first, "rating = ", v);
    }
    if let Some(v) = patch_str(&body, "notes") {
        crate::push_set!(qb, first, "notes = ", v);
    }
    crate::push_set!(qb, first, "updatedAt = ", now);
    qb.push(" WHERE id = ").push_bind(&id);
    qb.build().execute(&st.db).await?;

    let row = sqlx::query("SELECT * FROM Course WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    let resources = course_resources(&st.db, &id).await?;
    Ok(Json(course_from_row(&row, resources)?))
}

pub async fn delete_course(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Course WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    if exists == 0 {
        return Err(AppError::NotFound("Course not found".to_string()));
    }
    sqlx::query("DELETE FROM Course WHERE id = ?")
        .bind(&id)
        .execute(&st.db)
        .await?;
    Ok(Json(serde_json::json!({ "success": true })))
}
