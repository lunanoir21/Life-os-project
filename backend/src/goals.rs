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
pub(crate) struct GoalTagFull {
    id: String,
    goal_id: String,
    tag_id: String,
    tag: TagMini,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Milestone {
    id: String,
    goal_id: String,
    title: String,
    completed: bool,
    completed_at: Option<PrismaDateTime>,
    order: i64,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjectMini {
    id: String,
    name: String,
    color: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GoalProjectRef {
    id: String,
    goal_id: String,
    project_id: String,
    project: ProjectMini,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Goal {
    id: String,
    title: String,
    description: Option<String>,
    category: String,
    status: String,
    progress: i64,
    start_date: Option<PrismaDateTime>,
    target_date: Option<PrismaDateTime>,
    completed_at: Option<PrismaDateTime>,
    archived: bool,
    parent_goal_id: Option<String>,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SubGoal {
    id: String,
    title: String,
    description: Option<String>,
    category: String,
    status: String,
    progress: i64,
    start_date: Option<PrismaDateTime>,
    target_date: Option<PrismaDateTime>,
    completed_at: Option<PrismaDateTime>,
    archived: bool,
    parent_goal_id: Option<String>,
    created_at: PrismaDateTime,
    updated_at: PrismaDateTime,
    milestones: Vec<Milestone>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GoalFull {
    #[serde(flatten)]
    goal: Goal,
    tags: Vec<GoalTagFull>,
    milestones: Vec<Milestone>,
    subgoals: Vec<SubGoal>,
    projects: Vec<GoalProjectRef>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GoalDetail {
    #[serde(flatten)]
    goal: Goal,
    tags: Vec<GoalTagFull>,
    milestones: Vec<Milestone>,
    subgoals: Vec<SubGoal>,
    projects: Vec<GoalProjectRef>,
    parent_goal: Option<Box<Goal>>,
}

fn goal_from_row(r: &sqlx::sqlite::SqliteRow) -> Result<Goal, sqlx::Error> {
    Ok(Goal {
        id: r.try_get("id")?,
        title: r.try_get("title")?,
        description: r.try_get("description")?,
        category: r.try_get("category")?,
        status: r.try_get("status")?,
        progress: r.try_get("progress")?,
        start_date: r
            .try_get::<Option<i64>, _>("startDate")?
            .map(PrismaDateTime),
        target_date: r
            .try_get::<Option<i64>, _>("targetDate")?
            .map(PrismaDateTime),
        completed_at: r
            .try_get::<Option<i64>, _>("completedAt")?
            .map(PrismaDateTime),
        archived: r.try_get::<i64, _>("archived")? != 0,
        parent_goal_id: r.try_get("parentGoalId")?,
        created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
        updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
    })
}

async fn goal_tags(db: &SqlitePool, goal_id: &str) -> Result<Vec<GoalTagFull>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT gt.id, gt.goalId, gt.tagId, t.id AS tid, t.name AS tname, t.color AS tcolor \
         FROM GoalTag gt JOIN Tag t ON t.id = gt.tagId WHERE gt.goalId = ?",
    )
    .bind(goal_id)
    .fetch_all(db)
    .await?;
    rows.iter()
        .map(|r| {
            Ok(GoalTagFull {
                id: r.try_get("id")?,
                goal_id: r.try_get("goalId")?,
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

async fn milestones_for_goal(
    db: &SqlitePool,
    goal_id: &str,
) -> Result<Vec<Milestone>, sqlx::Error> {
    let rows = sqlx::query("SELECT * FROM Milestone WHERE goalId = ? ORDER BY \"order\" ASC")
        .bind(goal_id)
        .fetch_all(db)
        .await?;
    rows.iter()
        .map(|r| {
            Ok(Milestone {
                id: r.try_get("id")?,
                goal_id: r.try_get("goalId")?,
                title: r.try_get("title")?,
                completed: r.try_get::<i64, _>("completed")? != 0,
                completed_at: r
                    .try_get::<Option<i64>, _>("completedAt")?
                    .map(PrismaDateTime),
                order: r.try_get("order")?,
                created_at: PrismaDateTime(r.try_get::<i64, _>("createdAt")?),
                updated_at: PrismaDateTime(r.try_get::<i64, _>("updatedAt")?),
            })
        })
        .collect()
}

async fn projects_for_goal(
    db: &SqlitePool,
    goal_id: &str,
) -> Result<Vec<GoalProjectRef>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT gp.id, gp.goalId, gp.projectId, p.id AS pid, p.name AS pname, p.color AS pcolor \
         FROM GoalProject gp JOIN Project p ON p.id = gp.projectId WHERE gp.goalId = ?",
    )
    .bind(goal_id)
    .fetch_all(db)
    .await?;
    rows.iter()
        .map(|r| {
            Ok(GoalProjectRef {
                id: r.try_get("id")?,
                goal_id: r.try_get("goalId")?,
                project_id: r.try_get("projectId")?,
                project: ProjectMini {
                    id: r.try_get("pid")?,
                    name: r.try_get("pname")?,
                    color: r.try_get("pcolor")?,
                },
            })
        })
        .collect()
}

async fn subgoals_for_goal(db: &SqlitePool, goal_id: &str) -> Result<Vec<SubGoal>, sqlx::Error> {
    let rows = sqlx::query("SELECT * FROM Goal WHERE parentGoalId = ?")
        .bind(goal_id)
        .fetch_all(db)
        .await?;
    let mut out = Vec::with_capacity(rows.len());
    for r in &rows {
        let g = goal_from_row(r)?;
        let milestones = milestones_for_goal(db, &g.id).await?;
        out.push(SubGoal {
            id: g.id,
            title: g.title,
            description: g.description,
            category: g.category,
            status: g.status,
            progress: g.progress,
            start_date: g.start_date,
            target_date: g.target_date,
            completed_at: g.completed_at,
            archived: g.archived,
            parent_goal_id: g.parent_goal_id,
            created_at: g.created_at,
            updated_at: g.updated_at,
            milestones,
        });
    }
    Ok(out)
}

pub async fn list_goals(
    State(st): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Vec<GoalFull>>, AppError> {
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("SELECT * FROM Goal WHERE 1=1");
    if let Some(c) = params.get("category") {
        qb.push(" AND category = ").push_bind(c.clone());
    }
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
        let goal = goal_from_row(r)?;
        let tags = goal_tags(&st.db, &goal.id).await?;
        let milestones = milestones_for_goal(&st.db, &goal.id).await?;
        let subgoals = subgoals_for_goal(&st.db, &goal.id).await?;
        let projects = projects_for_goal(&st.db, &goal.id).await?;
        out.push(GoalFull {
            goal,
            tags,
            milestones,
            subgoals,
            projects,
        });
    }
    Ok(Json(out))
}

pub async fn create_goal(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<(StatusCode, Json<GoalFull>), AppError> {
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
        "INSERT INTO Goal (id, title, description, category, status, progress, startDate, targetDate, completedAt, archived, parentGoalId, createdAt, updatedAt) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id).bind(&title).bind(truthy_str(&body, "description"))
    .bind(str_or(&body, "category", "personal")).bind(str_or(&body, "status", "not-started"))
    .bind(body.get("progress").and_then(|v| v.as_i64()).unwrap_or(0))
    .bind(opt_ms(&body, "startDate")).bind(opt_ms(&body, "targetDate"))
    .bind(Option::<i64>::None).bind(0_i64).bind(truthy_str(&body, "parentGoalId"))
    .bind(now).bind(now)
    .execute(&st.db).await?;

    // Create nested milestones if provided
    if let Some(ms) = body.get("milestones").and_then(|v| v.as_array()) {
        for m in ms {
            let mid = gen_id();
            let mtitle = m
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let morder = m.get("order").and_then(|v| v.as_i64()).unwrap_or(0);
            sqlx::query(
                "INSERT INTO Milestone (id, goalId, title, completed, order, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
            ).bind(&mid).bind(&id).bind(&mtitle).bind(0_i64).bind(morder).bind(now).bind(now)
            .execute(&st.db).await?;
        }
    }

    let row = sqlx::query("SELECT * FROM Goal WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    let goal = goal_from_row(&row)?;
    let tags = goal_tags(&st.db, &id).await?;
    let milestones = milestones_for_goal(&st.db, &id).await?;
    let subgoals = subgoals_for_goal(&st.db, &id).await?;
    let projects = projects_for_goal(&st.db, &id).await?;
    Ok((
        StatusCode::CREATED,
        Json(GoalFull {
            goal,
            tags,
            milestones,
            subgoals,
            projects,
        }),
    ))
}

pub async fn get_goal(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<GoalDetail>, AppError> {
    let row = sqlx::query("SELECT * FROM Goal WHERE id = ?")
        .bind(&id)
        .fetch_optional(&st.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Goal not found".to_string()))?;
    let goal = goal_from_row(&row)?;
    let parent_goal = if let Some(ref pid) = goal.parent_goal_id {
        sqlx::query("SELECT * FROM Goal WHERE id = ?")
            .bind(pid)
            .fetch_optional(&st.db)
            .await?
            .map(|r| goal_from_row(&r))
            .transpose()?
            .map(Box::new)
    } else {
        None
    };
    let tags = goal_tags(&st.db, &id).await?;
    let milestones = milestones_for_goal(&st.db, &id).await?;
    let subgoals = subgoals_for_goal(&st.db, &id).await?;
    let projects = projects_for_goal(&st.db, &id).await?;
    Ok(Json(GoalDetail {
        goal,
        tags,
        milestones,
        subgoals,
        projects,
        parent_goal,
    }))
}

pub async fn update_goal(
    State(st): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<GoalFull>, AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Goal WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    if exists == 0 {
        return Err(AppError::NotFound("Goal not found".to_string()));
    }
    let now = now_ms();
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("UPDATE Goal SET ");
    let mut first = true;
    if let Some(v) = body.get("title").and_then(|v| v.as_str()) {
        crate::push_set!(qb, first, "title = ", v.to_string());
    }
    if let Some(v) = patch_str(&body, "description") {
        crate::push_set!(qb, first, "description = ", v);
    }
    if let Some(v) = body.get("category").and_then(|v| v.as_str()) {
        crate::push_set!(qb, first, "category = ", v.to_string());
    }
    if let Some(v) = body.get("status").and_then(|v| v.as_str()) {
        crate::push_set!(qb, first, "status = ", v.to_string());
        if v == "completed" {
            crate::push_set!(qb, first, "completedAt = ", now);
        }
    }
    if let Some(v) = body.get("progress").and_then(|v| v.as_i64()) {
        crate::push_set!(qb, first, "progress = ", v);
    }
    if let Some(v) = patch_ms(&body, "startDate") {
        crate::push_set!(qb, first, "startDate = ", v);
    }
    if let Some(v) = patch_ms(&body, "targetDate") {
        crate::push_set!(qb, first, "targetDate = ", v);
    }
    if let Some(v) = patch_ms(&body, "completedAt") {
        crate::push_set!(qb, first, "completedAt = ", v);
    }
    if let Some(v) = patch_bool(&body, "archived") {
        crate::push_set!(qb, first, "archived = ", if v { 1_i64 } else { 0_i64 });
    }
    crate::push_set!(qb, first, "updatedAt = ", now);
    qb.push(" WHERE id = ").push_bind(&id);
    qb.build().execute(&st.db).await?;

    // Upsert milestones if provided
    if let Some(ms) = body.get("milestones").and_then(|v| v.as_array()) {
        for m in ms {
            if let Some(mid) = m.get("id").and_then(|v| v.as_str()) {
                // Update existing
                let mtitle = m
                    .get("title")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let completed = m
                    .get("completed")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);
                let completed_at: Option<i64> = if completed { Some(now) } else { None };
                sqlx::query(
                    "UPDATE Milestone SET title=?,completed=?,completedAt=?,updatedAt=? WHERE id=?",
                )
                .bind(&mtitle)
                .bind(if completed { 1_i64 } else { 0_i64 })
                .bind(completed_at)
                .bind(now)
                .bind(mid)
                .execute(&st.db)
                .await?;
            } else {
                // Create new
                let new_id = gen_id();
                let mtitle = m
                    .get("title")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let morder = m.get("order").and_then(|v| v.as_i64()).unwrap_or(0);
                sqlx::query(
                    "INSERT INTO Milestone (id, goalId, title, completed, order, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
                ).bind(&new_id).bind(&id).bind(&mtitle).bind(0_i64).bind(morder).bind(now).bind(now)
                .execute(&st.db).await?;
            }
        }
    }

    let row = sqlx::query("SELECT * FROM Goal WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    let goal = goal_from_row(&row)?;
    let tags = goal_tags(&st.db, &id).await?;
    let milestones = milestones_for_goal(&st.db, &id).await?;
    let subgoals = subgoals_for_goal(&st.db, &id).await?;
    let projects = projects_for_goal(&st.db, &id).await?;
    Ok(Json(GoalFull {
        goal,
        tags,
        milestones,
        subgoals,
        projects,
    }))
}

pub async fn delete_goal(
    State(st): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Goal WHERE id = ?")
        .bind(&id)
        .fetch_one(&st.db)
        .await?;
    if exists == 0 {
        return Err(AppError::NotFound("Goal not found".to_string()));
    }
    sqlx::query("DELETE FROM Goal WHERE id = ?")
        .bind(&id)
        .execute(&st.db)
        .await?;
    Ok(Json(serde_json::json!({ "success": true })))
}
