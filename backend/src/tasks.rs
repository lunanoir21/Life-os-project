use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::Datelike;
use serde::Serialize;
use serde_json::Value;
use sqlx::{sqlite::SqliteRow, QueryBuilder, Row, Sqlite, SqlitePool};
use std::collections::HashMap;
use tokio::time::{interval, Duration};

use crate::error::AppError;
use crate::prisma_dt::PrismaDateTime;
use crate::AppState;

// ---------------------------------------------------------------------------
// Output models — field names are snake_case in Rust and rendered as camelCase
// to match Prisma's JSON. Field order mirrors prisma/schema.prisma so the
// serialized shape lines up with what the Next.js routes returned.
// ---------------------------------------------------------------------------

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub due_date: Option<PrismaDateTime>,
    pub start_date: Option<PrismaDateTime>,
    pub completed_at: Option<PrismaDateTime>,
    pub estimated_minutes: Option<i64>,
    pub actual_minutes: Option<i64>,
    pub recurrence: Option<String>,
    pub recurrence_config: Option<String>,
    pub position: i64,
    pub archived: bool,
    pub created_at: PrismaDateTime,
    pub updated_at: PrismaDateTime,
    pub project_id: Option<String>,
    pub parent_task_id: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMini {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
    pub created_at: PrismaDateTime,
    pub updated_at: PrismaDateTime,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskTagFull {
    pub id: String,
    pub task_id: String,
    pub tag_id: String,
    pub tag: Tag,
}

#[derive(Serialize)]
pub struct TaskCount {
    pub subtasks: i64,
}

/// Shape returned by the list/create/update endpoints: a task plus the
/// `project`, `tags`, `subtasks` relations (and `_count` only for the list).
#[derive(Serialize)]
pub struct TaskFull {
    #[serde(flatten)]
    pub task: Task,
    pub project: Option<ProjectMini>,
    pub tags: Vec<TaskTagFull>,
    pub subtasks: Vec<Task>,
    #[serde(rename = "_count", skip_serializing_if = "Option::is_none")]
    pub count: Option<TaskCount>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeEntry {
    pub id: String,
    pub description: String,
    pub start_time: PrismaDateTime,
    pub end_time: Option<PrismaDateTime>,
    pub duration: Option<i64>,
    pub billable: bool,
    pub created_at: PrismaDateTime,
    pub updated_at: PrismaDateTime,
    pub task_id: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub start_date: PrismaDateTime,
    pub end_date: Option<PrismaDateTime>,
    pub all_day: bool,
    pub color: String,
    pub location: Option<String>,
    pub recurrence: Option<String>,
    pub recurrence_config: Option<String>,
    pub created_at: PrismaDateTime,
    pub updated_at: PrismaDateTime,
    pub task_id: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DependencyDependsOn {
    pub id: String,
    pub task_id: String,
    pub depends_on_id: String,
    pub depends_on: Task,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DependencyTask {
    pub id: String,
    pub task_id: String,
    pub depends_on_id: String,
    pub task: Task,
}

/// Shape returned by GET /api/tasks/:id — the heavy include set. Unused by the
/// current frontend, but ported for parity with the Next.js route.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskDetail {
    #[serde(flatten)]
    pub task: Task,
    pub project: Option<ProjectMini>,
    pub tags: Vec<TaskTagFull>,
    pub subtasks: Vec<Task>,
    pub dependencies: Vec<DependencyDependsOn>,
    pub dependents: Vec<DependencyTask>,
    pub time_entries: Vec<TimeEntry>,
    pub calendar_events: Vec<CalendarEvent>,
}

// ---------------------------------------------------------------------------
// Row decoding. DateTime columns are read as raw i64 milliseconds (Prisma's
// storage format) and BOOLEAN columns as 0/1 integers.
// ---------------------------------------------------------------------------

fn task_from_row(row: &SqliteRow) -> Result<Task, sqlx::Error> {
    Ok(Task {
        id: row.try_get("id")?,
        title: row.try_get("title")?,
        description: row.try_get("description")?,
        status: row.try_get("status")?,
        priority: row.try_get("priority")?,
        due_date: row
            .try_get::<Option<i64>, _>("dueDate")?
            .map(PrismaDateTime),
        start_date: row
            .try_get::<Option<i64>, _>("startDate")?
            .map(PrismaDateTime),
        completed_at: row
            .try_get::<Option<i64>, _>("completedAt")?
            .map(PrismaDateTime),
        estimated_minutes: row.try_get("estimatedMinutes")?,
        actual_minutes: row.try_get("actualMinutes")?,
        recurrence: row.try_get("recurrence")?,
        recurrence_config: row.try_get("recurrenceConfig")?,
        position: row.try_get("position")?,
        archived: row.try_get::<i64, _>("archived")? != 0,
        created_at: PrismaDateTime(row.try_get::<i64, _>("createdAt")?),
        updated_at: PrismaDateTime(row.try_get::<i64, _>("updatedAt")?),
        project_id: row.try_get("projectId")?,
        parent_task_id: row.try_get("parentTaskId")?,
    })
}

fn time_entry_from_row(row: &SqliteRow) -> Result<TimeEntry, sqlx::Error> {
    Ok(TimeEntry {
        id: row.try_get("id")?,
        description: row.try_get("description")?,
        start_time: PrismaDateTime(row.try_get::<i64, _>("startTime")?),
        end_time: row
            .try_get::<Option<i64>, _>("endTime")?
            .map(PrismaDateTime),
        duration: row.try_get("duration")?,
        billable: row.try_get::<i64, _>("billable")? != 0,
        created_at: PrismaDateTime(row.try_get::<i64, _>("createdAt")?),
        updated_at: PrismaDateTime(row.try_get::<i64, _>("updatedAt")?),
        task_id: row.try_get("taskId")?,
    })
}

fn calendar_event_from_row(row: &SqliteRow) -> Result<CalendarEvent, sqlx::Error> {
    Ok(CalendarEvent {
        id: row.try_get("id")?,
        title: row.try_get("title")?,
        description: row.try_get("description")?,
        start_date: PrismaDateTime(row.try_get::<i64, _>("startDate")?),
        end_date: row
            .try_get::<Option<i64>, _>("endDate")?
            .map(PrismaDateTime),
        all_day: row.try_get::<i64, _>("allDay")? != 0,
        color: row.try_get("color")?,
        location: row.try_get("location")?,
        recurrence: row.try_get("recurrence")?,
        recurrence_config: row.try_get("recurrenceConfig")?,
        created_at: PrismaDateTime(row.try_get::<i64, _>("createdAt")?),
        updated_at: PrismaDateTime(row.try_get::<i64, _>("updatedAt")?),
        task_id: row.try_get("taskId")?,
    })
}

// ---------------------------------------------------------------------------
// Relation loaders
// ---------------------------------------------------------------------------

async fn fetch_project(db: &SqlitePool, id: &str) -> Result<Option<ProjectMini>, sqlx::Error> {
    let row = sqlx::query("SELECT id, name, color FROM Project WHERE id = ?")
        .bind(id)
        .fetch_optional(db)
        .await?;
    match row {
        Some(r) => Ok(Some(ProjectMini {
            id: r.try_get("id")?,
            name: r.try_get("name")?,
            color: r.try_get("color")?,
        })),
        None => Ok(None),
    }
}

async fn fetch_tags(db: &SqlitePool, task_id: &str) -> Result<Vec<TaskTagFull>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT tt.id AS tt_id, tt.taskId AS tt_taskId, tt.tagId AS tt_tagId, \
         t.id AS t_id, t.name AS t_name, t.color AS t_color, \
         t.createdAt AS t_createdAt, t.updatedAt AS t_updatedAt \
         FROM TaskTag tt JOIN Tag t ON t.id = tt.tagId WHERE tt.taskId = ?",
    )
    .bind(task_id)
    .fetch_all(db)
    .await?;

    rows.iter()
        .map(|r| {
            Ok(TaskTagFull {
                id: r.try_get("tt_id")?,
                task_id: r.try_get("tt_taskId")?,
                tag_id: r.try_get("tt_tagId")?,
                tag: Tag {
                    id: r.try_get("t_id")?,
                    name: r.try_get("t_name")?,
                    color: r.try_get("t_color")?,
                    created_at: PrismaDateTime(r.try_get::<i64, _>("t_createdAt")?),
                    updated_at: PrismaDateTime(r.try_get::<i64, _>("t_updatedAt")?),
                },
            })
        })
        .collect()
}

async fn fetch_subtasks(db: &SqlitePool, parent_id: &str) -> Result<Vec<Task>, sqlx::Error> {
    let rows = sqlx::query("SELECT * FROM Task WHERE parentTaskId = ?")
        .bind(parent_id)
        .fetch_all(db)
        .await?;
    rows.iter().map(task_from_row).collect()
}

async fn count_subtasks(db: &SqlitePool, parent_id: &str) -> Result<i64, sqlx::Error> {
    let row = sqlx::query("SELECT COUNT(*) AS c FROM Task WHERE parentTaskId = ?")
        .bind(parent_id)
        .fetch_one(db)
        .await?;
    row.try_get::<i64, _>("c")
}

async fn fetch_task_row(db: &SqlitePool, id: &str) -> Result<Option<Task>, sqlx::Error> {
    let row = sqlx::query("SELECT * FROM Task WHERE id = ?")
        .bind(id)
        .fetch_optional(db)
        .await?;
    match row {
        Some(r) => Ok(Some(task_from_row(&r)?)),
        None => Ok(None),
    }
}

/// Attach `project`, `tags`, `subtasks` (and optionally `_count`) to a task.
async fn enrich_task(
    db: &SqlitePool,
    task: Task,
    with_count: bool,
) -> Result<TaskFull, sqlx::Error> {
    let project = match &task.project_id {
        Some(pid) => fetch_project(db, pid).await?,
        None => None,
    };
    let tags = fetch_tags(db, &task.id).await?;
    let subtasks = fetch_subtasks(db, &task.id).await?;
    let count = if with_count {
        Some(TaskCount {
            subtasks: count_subtasks(db, &task.id).await?,
        })
    } else {
        None
    };
    Ok(TaskFull {
        task,
        project,
        tags,
        subtasks,
        count,
    })
}

// ---------------------------------------------------------------------------
// Body parsing helpers — replicate the Next.js routes' coercion rules.
// ---------------------------------------------------------------------------

/// `value || null`: empty string and missing both become `None`.
fn truthy_str(body: &Value, key: &str) -> Option<String> {
    body.get(key)
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
}

/// `value || 'default'`: empty string and missing both fall back to default.
fn str_or<'a>(body: &'a Value, key: &str, default: &'a str) -> String {
    body.get(key)
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .unwrap_or(default)
        .to_string()
}

/// `value || null` for numbers (0 is falsy in JS, so it maps to `None`).
fn truthy_i64(body: &Value, key: &str) -> Option<i64> {
    match body.get(key).and_then(|v| v.as_i64()) {
        Some(0) | None => None,
        other => other,
    }
}

/// `value ? new Date(value) : null` — parse an ISO string (or numeric ms) to
/// epoch milliseconds; empty/missing/unparseable becomes `None`.
fn value_to_ms(v: &Value) -> Option<i64> {
    match v {
        Value::String(s) if !s.is_empty() => chrono::DateTime::parse_from_rfc3339(s)
            .ok()
            .map(|dt| dt.timestamp_millis()),
        Value::Number(n) => n.as_i64(),
        _ => None,
    }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/// GET /api/tasks
pub async fn list_tasks(
    State(st): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Vec<TaskFull>>, AppError> {
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("SELECT * FROM Task WHERE 1 = 1");

    if let Some(status) = params.get("status") {
        qb.push(" AND status = ").push_bind(status.clone());
    }
    if let Some(priority) = params.get("priority") {
        qb.push(" AND priority = ").push_bind(priority.clone());
    }
    if let Some(project_id) = params.get("projectId") {
        qb.push(" AND projectId = ").push_bind(project_id.clone());
    }
    if let Some(archived) = params.get("archived") {
        let flag: i64 = if archived == "true" { 1 } else { 0 };
        qb.push(" AND archived = ").push_bind(flag);
    }
    qb.push(" ORDER BY position ASC, createdAt DESC");

    let rows = qb.build().fetch_all(&st.db).await?;

    let mut out = Vec::with_capacity(rows.len());
    for row in &rows {
        let task = task_from_row(row)?;
        out.push(enrich_task(&st.db, task, true).await?);
    }
    Ok(Json(out))
}

/// POST /api/tasks
pub async fn create_task(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<TaskFull>), AppError> {
    let title = body
        .get("title")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    let title = match title {
        Some(t) => t,
        None => return Err(AppError::BadRequest("Title is required".to_string())),
    };

    let id = cuid::cuid1().map_err(|e| AppError::Internal(format!("id generation failed: {e}")))?;
    let now = PrismaDateTime::now().0;

    let description = truthy_str(&body, "description");
    let status = str_or(&body, "status", "todo");
    let priority = str_or(&body, "priority", "medium");
    let due_date = body.get("dueDate").and_then(value_to_ms);
    let start_date = body.get("startDate").and_then(value_to_ms);
    let estimated_minutes = truthy_i64(&body, "estimatedMinutes");
    let recurrence = truthy_str(&body, "recurrence");
    let recurrence_config = truthy_str(&body, "recurrenceConfig");
    let project_id = truthy_str(&body, "projectId");
    let parent_task_id = truthy_str(&body, "parentTaskId");
    let position = body.get("position").and_then(|v| v.as_i64()).unwrap_or(0);

    sqlx::query(
        "INSERT INTO Task \
         (id, title, description, status, priority, dueDate, startDate, completedAt, \
          estimatedMinutes, actualMinutes, recurrence, recurrenceConfig, position, archived, \
          createdAt, updatedAt, projectId, parentTaskId) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&title)
    .bind(&description)
    .bind(&status)
    .bind(&priority)
    .bind(due_date)
    .bind(start_date)
    .bind(Option::<i64>::None) // completedAt
    .bind(estimated_minutes)
    .bind(Option::<i64>::None) // actualMinutes
    .bind(&recurrence)
    .bind(&recurrence_config)
    .bind(position)
    .bind(0_i64) // archived = false
    .bind(now)
    .bind(now)
    .bind(&project_id)
    .bind(&parent_task_id)
    .execute(&st.db)
    .await?;

    let task = fetch_task_row(&st.db, &id)
        .await?
        .ok_or_else(|| AppError::Internal("created task vanished".to_string()))?;
    let full = enrich_task(&st.db, task, false).await?;
    Ok((StatusCode::CREATED, Json(full)))
}

/// GET /api/tasks/:id
pub async fn get_task(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<TaskDetail>, AppError> {
    let task = match fetch_task_row(&st.db, &id).await? {
        Some(t) => t,
        None => return Err(AppError::NotFound("Task not found".to_string())),
    };

    let project = match &task.project_id {
        Some(pid) => fetch_project(&st.db, pid).await?,
        None => None,
    };
    let tags = fetch_tags(&st.db, &task.id).await?;
    let subtasks = fetch_subtasks(&st.db, &task.id).await?;

    let dep_rows = sqlx::query("SELECT * FROM TaskDependency WHERE taskId = ?")
        .bind(&id)
        .fetch_all(&st.db)
        .await?;
    let mut dependencies = Vec::with_capacity(dep_rows.len());
    for r in &dep_rows {
        let depends_on_id: String = r.try_get("dependsOnId")?;
        if let Some(dep_task) = fetch_task_row(&st.db, &depends_on_id).await? {
            dependencies.push(DependencyDependsOn {
                id: r.try_get("id")?,
                task_id: r.try_get("taskId")?,
                depends_on_id,
                depends_on: dep_task,
            });
        }
    }

    let dent_rows = sqlx::query("SELECT * FROM TaskDependency WHERE dependsOnId = ?")
        .bind(&id)
        .fetch_all(&st.db)
        .await?;
    let mut dependents = Vec::with_capacity(dent_rows.len());
    for r in &dent_rows {
        let task_id: String = r.try_get("taskId")?;
        if let Some(dep_task) = fetch_task_row(&st.db, &task_id).await? {
            dependents.push(DependencyTask {
                id: r.try_get("id")?,
                task_id,
                depends_on_id: r.try_get("dependsOnId")?,
                task: dep_task,
            });
        }
    }

    let te_rows = sqlx::query("SELECT * FROM TimeEntry WHERE taskId = ?")
        .bind(&id)
        .fetch_all(&st.db)
        .await?;
    let time_entries = te_rows
        .iter()
        .map(time_entry_from_row)
        .collect::<Result<Vec<_>, _>>()?;

    let ce_rows = sqlx::query("SELECT * FROM CalendarEvent WHERE taskId = ?")
        .bind(&id)
        .fetch_all(&st.db)
        .await?;
    let calendar_events = ce_rows
        .iter()
        .map(calendar_event_from_row)
        .collect::<Result<Vec<_>, _>>()?;

    Ok(Json(TaskDetail {
        task,
        project,
        tags,
        subtasks,
        dependencies,
        dependents,
        time_entries,
        calendar_events,
    }))
}

/// PATCH /api/tasks/:id
pub async fn update_task(
    State(st): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<TaskFull>, AppError> {
    if fetch_task_row(&st.db, &id).await?.is_none() {
        return Err(AppError::NotFound("Task not found".to_string()));
    }

    // completedAt is derived from status, then overridden by an explicit
    // completedAt in the body (matching the Next.js field ordering).
    // Outer Some => column should be written; inner Option => the value.
    let mut completed_at: Option<Option<i64>> = None;

    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("UPDATE Task SET ");
    let mut first = true;
    macro_rules! sep {
        () => {{
            if !first {
                qb.push(", ");
            }
            first = false;
        }};
    }

    if let Some(v) = body.get("title").and_then(|v| v.as_str()) {
        sep!();
        qb.push("title = ").push_bind(v.trim().to_string());
    }
    if let Some(v) = body.get("description") {
        sep!();
        qb.push("description = ")
            .push_bind(v.as_str().map(|s| s.to_string()));
    }
    if let Some(v) = body.get("status").and_then(|v| v.as_str()) {
        sep!();
        qb.push("status = ").push_bind(v.to_string());
        completed_at = Some(if v == "done" {
            Some(PrismaDateTime::now().0)
        } else {
            None
        });
    }
    if let Some(v) = body.get("priority").and_then(|v| v.as_str()) {
        sep!();
        qb.push("priority = ").push_bind(v.to_string());
    }
    if let Some(v) = body.get("dueDate") {
        sep!();
        qb.push("dueDate = ").push_bind(value_to_ms(v));
    }
    if let Some(v) = body.get("startDate") {
        sep!();
        qb.push("startDate = ").push_bind(value_to_ms(v));
    }
    if let Some(v) = body.get("completedAt") {
        completed_at = Some(value_to_ms(v));
    }
    if let Some(v) = body.get("estimatedMinutes") {
        sep!();
        qb.push("estimatedMinutes = ").push_bind(v.as_i64());
    }
    if let Some(v) = body.get("actualMinutes") {
        sep!();
        qb.push("actualMinutes = ").push_bind(v.as_i64());
    }
    if let Some(v) = body.get("recurrence") {
        sep!();
        qb.push("recurrence = ")
            .push_bind(v.as_str().map(|s| s.to_string()));
    }
    if let Some(v) = body.get("recurrenceConfig") {
        sep!();
        qb.push("recurrenceConfig = ")
            .push_bind(v.as_str().map(|s| s.to_string()));
    }
    if let Some(v) = body.get("projectId") {
        sep!();
        qb.push("projectId = ")
            .push_bind(v.as_str().map(|s| s.to_string()));
    }
    if let Some(v) = body.get("parentTaskId") {
        sep!();
        qb.push("parentTaskId = ")
            .push_bind(v.as_str().map(|s| s.to_string()));
    }
    if let Some(v) = body.get("position").and_then(|v| v.as_i64()) {
        sep!();
        qb.push("position = ").push_bind(v);
    }
    if let Some(v) = body.get("archived").and_then(|v| v.as_bool()) {
        sep!();
        qb.push("archived = ")
            .push_bind(if v { 1_i64 } else { 0_i64 });
    }
    if let Some(value) = completed_at {
        sep!();
        qb.push("completedAt = ").push_bind(value);
    }

    // Prisma's @updatedAt always bumps on update.
    sep!();
    qb.push("updatedAt = ").push_bind(PrismaDateTime::now().0);

    qb.push(" WHERE id = ").push_bind(id.clone());
    qb.build().execute(&st.db).await?;

    let task = fetch_task_row(&st.db, &id)
        .await?
        .ok_or_else(|| AppError::Internal("updated task vanished".to_string()))?;
    let full = enrich_task(&st.db, task, false).await?;
    Ok(Json(full))
}

/// DELETE /api/tasks/:id
pub async fn delete_task(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    if fetch_task_row(&st.db, &id).await?.is_none() {
        return Err(AppError::NotFound("Task not found".to_string()));
    }
    sqlx::query("DELETE FROM Task WHERE id = ?")
        .bind(&id)
        .execute(&st.db)
        .await?;
    Ok(Json(serde_json::json!({ "success": true })))
}

// ---------------------------------------------------------------------------
// Recurrence Worker - Automatic task recreation for recurring tasks
// ---------------------------------------------------------------------------

/// Spawn a background worker that checks for recurring tasks every hour
/// and creates new instances when needed.
pub fn spawn_recurrence_worker(pool: SqlitePool) {
    tokio::spawn(async move {
        // Check every hour
        let mut ticker = interval(Duration::from_secs(3600));
        
        tracing::info!("🔄 Recurrence worker started - checking every hour");
        
        loop {
            ticker.tick().await;
            
            match process_recurring_tasks(&pool).await {
                Ok(count) => {
                    if count > 0 {
                        tracing::info!("✅ Processed {} recurring task(s)", count);
                    }
                }
                Err(e) => {
                    tracing::error!("❌ Error processing recurring tasks: {}", e);
                }
            }
        }
    });
}

/// Process all recurring tasks and create new instances as needed
async fn process_recurring_tasks(db: &SqlitePool) -> Result<usize, sqlx::Error> {
    let now = chrono::Utc::now();
    let today_start = now.date_naive().and_hms_opt(0, 0, 0).unwrap();
    let today_start_ms = today_start.and_utc().timestamp_millis();
    
    // Find all tasks with recurrence that are completed or have a due date in the past
    let rows = sqlx::query(
        "SELECT * FROM Task 
         WHERE recurrence IS NOT NULL 
         AND recurrence != ''
         AND archived = 0
         AND (status = 'done' OR dueDate < ?)"
    )
    .bind(today_start_ms)
    .fetch_all(db)
    .await?;
    
    let mut created_count = 0;
    
    for row in rows {
        let task = task_from_row(&row)?;
        
        // Check if we should create a new instance
        if should_create_new_instance(&task, today_start_ms)? {
            match create_recurring_instance(db, &task).await {
                Ok(_) => created_count += 1,
                Err(e) => {
                    tracing::warn!(
                        "Failed to create recurring instance for task {}: {}", 
                        task.id, e
                    );
                }
            }
        }
    }
    
    Ok(created_count)
}

/// Determine if a new instance should be created based on recurrence rules
fn should_create_new_instance(task: &Task, today_start_ms: i64) -> Result<bool, sqlx::Error> {
    let recurrence = match &task.recurrence {
        Some(r) if !r.is_empty() => r,
        _ => return Ok(false),
    };
    
    // If task is not completed yet, don't create a new instance
    if task.status != "done" {
        return Ok(false);
    }
    
    // Get the completion date
    let completed_ms = match task.completed_at {
        Some(PrismaDateTime(ms)) => ms,
        None => return Ok(false),
    };
    
    // Calculate days since completion
    let days_since_completion = (today_start_ms - completed_ms) / (1000 * 60 * 60 * 24);
    
    // Check recurrence type
    match recurrence.as_str() {
        "daily" => Ok(days_since_completion >= 1),
        "weekly" => Ok(days_since_completion >= 7),
        "monthly" => {
            // For monthly, check if we're in a new month
            let completed_date = chrono::DateTime::from_timestamp_millis(completed_ms)
                .unwrap_or_default()
                .date_naive();
            let today = chrono::DateTime::from_timestamp_millis(today_start_ms)
                .unwrap_or_default()
                .date_naive();
            
            Ok(completed_date.year() != today.year() || completed_date.month() != today.month())
        }
        _ => Ok(false), // Unknown recurrence type
    }
}

/// Create a new instance of a recurring task
async fn create_recurring_instance(db: &SqlitePool, original: &Task) -> Result<String, sqlx::Error> {
    let new_id = cuid::cuid1().map_err(|e| {
        sqlx::Error::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!("ID generation failed: {}", e),
        ))
    })?;
    
    let now = PrismaDateTime::now().0;
    
    // Calculate new due date based on recurrence
    let new_due_date = calculate_next_due_date(original)?;
    
    // Create the new task with status reset to 'todo'
    sqlx::query(
        "INSERT INTO Task \
         (id, title, description, status, priority, dueDate, startDate, completedAt, \
          estimatedMinutes, actualMinutes, recurrence, recurrenceConfig, position, archived, \
          createdAt, updatedAt, projectId, parentTaskId) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&new_id)
    .bind(&original.title)
    .bind(&original.description)
    .bind("todo") // Reset status to todo
    .bind(&original.priority)
    .bind(new_due_date)
    .bind(original.start_date.as_ref().map(|d| d.0))
    .bind(Option::<i64>::None) // Clear completedAt
    .bind(original.estimated_minutes)
    .bind(Option::<i64>::None) // Clear actualMinutes
    .bind(&original.recurrence)
    .bind(&original.recurrence_config)
    .bind(original.position)
    .bind(0_i64) // archived = false
    .bind(now)
    .bind(now)
    .bind(&original.project_id)
    .bind(&original.parent_task_id)
    .execute(db)
    .await?;
    
    // Copy tags from original task
    let tag_rows = sqlx::query("SELECT tagId FROM TaskTag WHERE taskId = ?")
        .bind(&original.id)
        .fetch_all(db)
        .await?;
    
    for tag_row in tag_rows {
        let tag_id: String = tag_row.try_get("tagId")?;
        let task_tag_id = cuid::cuid1().map_err(|e| {
            sqlx::Error::Io(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("ID generation failed: {}", e),
            ))
        })?;
        
        sqlx::query("INSERT INTO TaskTag (id, taskId, tagId) VALUES (?, ?, ?)")
            .bind(&task_tag_id)
            .bind(&new_id)
            .bind(&tag_id)
            .execute(db)
            .await?;
    }
    
    tracing::info!(
        "Created new recurring instance of task '{}' (original: {}, new: {})",
        original.title,
        original.id,
        new_id
    );
    
    Ok(new_id)
}

/// Calculate the next due date based on recurrence type
fn calculate_next_due_date(task: &Task) -> Result<Option<i64>, sqlx::Error> {
    let recurrence = match &task.recurrence {
        Some(r) if !r.is_empty() => r,
        _ => return Ok(None),
    };
    
    // Use current due date as base, or today if none exists
    let base_ms = task.due_date.as_ref().map(|d| d.0).unwrap_or_else(|| {
        let now = chrono::Utc::now();
        let today = now.date_naive().and_hms_opt(0, 0, 0).unwrap();
        today.and_utc().timestamp_millis()
    });
    
    let base_date = chrono::DateTime::from_timestamp_millis(base_ms)
        .ok_or_else(|| {
            sqlx::Error::Io(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "Invalid timestamp",
            ))
        })?;
    
    let next_date = match recurrence.as_str() {
        "daily" => base_date + chrono::Duration::days(1),
        "weekly" => base_date + chrono::Duration::weeks(1),
        "monthly" => {
            // Add one month (handling edge cases like Jan 31 -> Feb 28)
            let mut next = base_date;
            let current_month = next.month();
            let current_day = next.day();
            
            // Increment month
            if current_month == 12 {
                next = next
                    .with_year(next.year() + 1)
                    .and_then(|d| d.with_month(1))
                    .unwrap_or(next);
            } else {
                next = next.with_month(current_month + 1).unwrap_or(next);
            }
            
            // Handle day overflow (e.g., Jan 31 -> Feb 31 doesn't exist).
            // Walk back from current_day until we find a valid day in the new month.
            if let Some(d) = next.with_day(current_day) {
                d
            } else {
                let mut day = current_day;
                let mut found = next; // fallback: keep month change, day unchanged
                loop {
                    if day == 1 { break; }
                    day -= 1;
                    if let Some(d) = next.with_day(day) {
                        found = d;
                        break;
                    }
                }
                found
            }
        }
        _ => return Ok(None), // Unknown recurrence type
    };
    
    Ok(Some(next_date.timestamp_millis()))
}
