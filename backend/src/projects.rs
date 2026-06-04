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
pub(crate) struct ProjectTaskCount {
    tasks: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GoalRef {
    id: String,
    title: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GoalProjectRef {
    id: String,
    goal_id: String,
    project_id: String,
    goal: GoalRef,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Project {
    id: String,
    name: String,
    description: Option<String>,
    color: String,
    icon: Option<String>,
    status: String,
    start_date: Option<PrismaDateTime>,
    end_date: Option<PrismaDateTime>,
    archived: bool,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjectList {
    #[serde(flatten)]
    project: Project,
    #[serde(rename = "_count")]
    count: ProjectTaskCount,
    goals: Vec<GoalProjectRef>,
}

// A task inside a project GET/:id (light — just tags + subtasks, no heavy includes)
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TaskTagMini {
    id: String,
    task_id: String,
    tag_id: String,
    tag: TagMini,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TagMini {
    id: String,
    name: String,
    color: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjectTask {
    id: String,
    title: String,
    description: Option<String>,
    status: String,
    priority: String,
    due_date: Option<PrismaDateTime>,
    start_date: Option<PrismaDateTime>,
    completed_at: Option<PrismaDateTime>,
    estimated_minutes: Option<i64>,
    actual_minutes: Option<i64>,
    recurrence: Option<String>,
    recurrence_config: Option<String>,
    position: i64,
    archived: bool,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
    project_id: Option<String>,
    parent_task_id: Option<String>,
    tags: Vec<TaskTagMini>,
    subtasks: Vec<SubTask>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SubTask {
    id: String,
    title: String,
    description: Option<String>,
    status: String,
    priority: String,
    due_date: Option<PrismaDateTime>,
    start_date: Option<PrismaDateTime>,
    completed_at: Option<PrismaDateTime>,
    estimated_minutes: Option<i64>,
    actual_minutes: Option<i64>,
    recurrence: Option<String>,
    recurrence_config: Option<String>,
    position: i64,
    archived: bool,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
    project_id: Option<String>,
    parent_task_id: Option<String>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub(crate) struct GoalRefFull {
    id: String,
    title: String,
    status: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjectDetail {
    #[serde(flatten)]
    project: Project,
    tasks: Vec<ProjectTask>,
    goals: Vec<GoalProjectRef>,
}

fn project_from_row(r: &sqlx::sqlite::SqliteRow) -> Result<Project, sqlx::Error> {
    Ok(Project {
        id: r.try_get("id")?,
        name: r.try_get("name")?,
        description: r.try_get("description")?,
        color: r.try_get("color")?,
        icon: r.try_get("icon")?,
        status: r.try_get("status")?,
        start_date: r
            .try_get::<Option<i64>, _>("startDate")?
            .map(PrismaDateTime),
        end_date: r.try_get::<Option<i64>, _>("endDate")?.map(PrismaDateTime),
        archived: r.try_get::<i64, _>("archived")? != 0,
        created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
        updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
    })
}

async fn goals_for_project(db: &SqlitePool, pid: &str) -> Result<Vec<GoalProjectRef>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT gp.id, gp.goalId, gp.projectId, g.id AS gid, g.title AS gtitle \
         FROM GoalProject gp JOIN Goal g ON g.id = gp.goalId WHERE gp.projectId = ?",
    )
    .bind(pid)
    .fetch_all(db)
    .await?;
    rows.iter()
        .map(|r| {
            Ok(GoalProjectRef {
                id: r.try_get("id")?,
                goal_id: r.try_get("goalId")?,
                project_id: r.try_get("projectId")?,
                goal: GoalRef {
                    id: r.try_get("gid")?,
                    title: r.try_get("gtitle")?,
                },
            })
        })
        .collect()
}

async fn task_tags_for_task(
    db: &SqlitePool,
    task_id: &str,
) -> Result<Vec<TaskTagMini>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT tt.id, tt.taskId, tt.tagId, t.id AS tid, t.name AS tname, t.color AS tcolor \
         FROM TaskTag tt JOIN Tag t ON t.id = tt.tagId WHERE tt.taskId = ?",
    )
    .bind(task_id)
    .fetch_all(db)
    .await?;
    rows.iter()
        .map(|r| {
            Ok(TaskTagMini {
                id: r.try_get("id")?,
                task_id: r.try_get("taskId")?,
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

pub async fn list_projects(
    State(st): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Vec<ProjectList>>, AppError> {
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("SELECT * FROM Project WHERE 1=1");
    if let Some(s) = params.get("status") {
        qb.push(" AND status = ").push_bind(s.clone());
    }
    if let Some(a) = params.get("archived") {
        qb.push(" AND archived = ")
            .push_bind(if a == "true" { 1_i64 } else { 0_i64 });
    }
    qb.push(" ORDER BY createdAt DESC");
    let rows = qb.build().fetch_all(&st.db).await?;
    let mut out = Vec::with_capacity(rows.len());
    for r in &rows {
        let p = project_from_row(r)?;
        let tasks: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Task WHERE projectId = ?")
            .bind(&p.id)
            .fetch_one(&st.db)
            .await?;
        let goals = goals_for_project(&st.db, &p.id).await?;
        out.push(ProjectList {
            project: p,
            count: ProjectTaskCount { tasks },
            goals,
        });
    }
    Ok(Json(out))
}

pub async fn create_project(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<ProjectList>), AppError> {
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
        "INSERT INTO Project (id, name, description, color, icon, status, startDate, endDate, archived, createdAt, updatedAt) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id).bind(&name).bind(truthy_str(&body, "description"))
    .bind(str_or(&body, "color", "#6b7280")).bind(truthy_str(&body, "icon"))
    .bind(str_or(&body, "status", "active"))
    .bind(opt_ms(&body, "startDate")).bind(opt_ms(&body, "endDate"))
    .bind(0_i64).bind(now).bind(now)
    .execute(&st.db).await?;

    let row = sqlx::query("SELECT * FROM Project WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    let p = project_from_row(&row)?;
    Ok((
        StatusCode::CREATED,
        Json(ProjectList {
            project: p,
            count: ProjectTaskCount { tasks: 0 },
            goals: vec![],
        }),
    ))
}

pub async fn get_project(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<ProjectDetail>, AppError> {
    let row = sqlx::query("SELECT * FROM Project WHERE id = ?")
        .bind(&id)
        .fetch_optional(&st.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Project not found".to_string()))?;
    let p = project_from_row(&row)?;
    let task_rows = sqlx::query("SELECT * FROM Task WHERE projectId = ? ORDER BY position ASC")
        .bind(&id)
        .fetch_all(&st.db)
        .await?;
    let mut tasks = Vec::with_capacity(task_rows.len());
    for tr in &task_rows {
        let tid: String = tr.try_get("id")?;
        let tags = task_tags_for_task(&st.db, &tid).await?;
        let sub_rows = sqlx::query("SELECT * FROM Task WHERE parentTaskId = ?")
            .bind(&tid)
            .fetch_all(&st.db)
            .await?;
        let subtasks = sub_rows
            .iter()
            .map(|sr| {
                Ok(SubTask {
                    id: sr.try_get("id")?,
                    title: sr.try_get("title")?,
                    description: sr.try_get("description")?,
                    status: sr.try_get("status")?,
                    priority: sr.try_get("priority")?,
                    due_date: sr.try_get::<Option<i64>, _>("dueDate")?.map(PrismaDateTime),
                    start_date: sr
                        .try_get::<Option<i64>, _>("startDate")?
                        .map(PrismaDateTime),
                    completed_at: sr
                        .try_get::<Option<i64>, _>("completedAt")?
                        .map(PrismaDateTime),
                    estimated_minutes: sr.try_get("estimatedMinutes")?,
                    actual_minutes: sr.try_get("actualMinutes")?,
                    recurrence: sr.try_get("recurrence")?,
                    recurrence_config: sr.try_get("recurrenceConfig")?,
                    position: sr.try_get("position")?,
                    archived: sr.try_get::<i64, _>("archived")? != 0,
                    created_at: PrismaDateTime(sr.try_get::<i64, _>("createdAt")?),
                    updated_at: PrismaDateTime(sr.try_get::<i64, _>("updatedAt")?),
                    project_id: sr.try_get("projectId")?,
                    parent_task_id: sr.try_get("parentTaskId")?,
                })
            })
            .collect::<Result<Vec<_>, sqlx::Error>>()?;
        tasks.push(ProjectTask {
            id: tid,
            title: tr.try_get("title")?,
            description: tr.try_get("description")?,
            status: tr.try_get("status")?,
            priority: tr.try_get("priority")?,
            due_date: tr.try_get::<Option<i64>, _>("dueDate")?.map(PrismaDateTime),
            start_date: tr
                .try_get::<Option<i64>, _>("startDate")?
                .map(PrismaDateTime),
            completed_at: tr
                .try_get::<Option<i64>, _>("completedAt")?
                .map(PrismaDateTime),
            estimated_minutes: tr.try_get("estimatedMinutes")?,
            actual_minutes: tr.try_get("actualMinutes")?,
            recurrence: tr.try_get("recurrence")?,
            recurrence_config: tr.try_get("recurrenceConfig")?,
            position: tr.try_get("position")?,
            archived: tr.try_get::<i64, _>("archived")? != 0,
            created_at: PrismaDateTime(tr.try_get::<i64, _>("createdAt")?),
            updated_at: PrismaDateTime(tr.try_get::<i64, _>("updatedAt")?),
            project_id: tr.try_get("projectId")?,
            parent_task_id: tr.try_get("parentTaskId")?,
            tags,
            subtasks,
        });
    }
    let goals = goals_for_project(&st.db, &id).await?;
    Ok(Json(ProjectDetail {
        project: p,
        tasks,
        goals,
    }))
}

pub async fn update_project(
    State(st): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<ProjectList>, AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Project WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    if exists == 0 {
        return Err(AppError::NotFound("Project not found".to_string()));
    }
    let now = now_ms();
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("UPDATE Project SET ");
    let mut first = true;
    if let Some(v) = body.get("name").and_then(|v| v.as_str()) {
        crate::push_set!(qb, first, "name = ", v.to_string());
    }
    if let Some(v) = patch_str(&body, "description") {
        crate::push_set!(qb, first, "description = ", v);
    }
    if let Some(v) = patch_str(&body, "color") {
        crate::push_set!(qb, first, "color = ", v);
    }
    if let Some(v) = patch_str(&body, "icon") {
        crate::push_set!(qb, first, "icon = ", v);
    }
    if let Some(v) = body.get("status").and_then(|v| v.as_str()) {
        crate::push_set!(qb, first, "status = ", v.to_string());
    }
    if let Some(v) = patch_ms(&body, "startDate") {
        crate::push_set!(qb, first, "startDate = ", v);
    }
    if let Some(v) = patch_ms(&body, "endDate") {
        crate::push_set!(qb, first, "endDate = ", v);
    }
    if let Some(v) = patch_bool(&body, "archived") {
        crate::push_set!(qb, first, "archived = ", if v { 1_i64 } else { 0_i64 });
    }
    crate::push_set!(qb, first, "updatedAt = ", now);
    qb.push(" WHERE id = ").push_bind(&id);
    qb.build().execute(&st.db).await?;

    let row = sqlx::query("SELECT * FROM Project WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    let p = project_from_row(&row)?;
    let tasks: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Task WHERE projectId = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    let goals = goals_for_project(&st.db, &id).await?;
    Ok(Json(ProjectList {
        project: p,
        count: ProjectTaskCount { tasks },
        goals,
    }))
}

pub async fn delete_project(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Project WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    if exists == 0 {
        return Err(AppError::NotFound("Project not found".to_string()));
    }
    sqlx::query("DELETE FROM Project WHERE id = ?")
        .bind(&id)
        .execute(&st.db)
        .await?;
    Ok(Json(serde_json::json!({ "success": true })))
}
