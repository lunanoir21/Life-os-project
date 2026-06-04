use axum::extract::State;
use axum::Json;
use serde::Serialize;
use serde_json::Value;
use sqlx::Row;

use crate::error::AppError;
use crate::prisma_dt::PrismaDateTime;
use crate::utils::now_ms;
use crate::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TaskStatus {
    by_status: serde_json::Map<String, serde_json::Value>,
    total: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct HabitActivity {
    id: String,
    name: String,
    icon: Option<String>,
    color: String,
    logs: Vec<HabitLogMini>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct HabitLogMini {
    date: PrismaDateTime,
    count: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct HabitsInfo {
    total: i64,
    completed_today: i64,
    completion_rate: i64,
    recent_activity: Vec<HabitActivity>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AccountMini {
    id: String,
    name: String,
    r#type: String,
    balance: f64,
    currency: String,
    color: Option<String>,
    icon: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct FinanceInfo {
    accounts: Vec<AccountMini>,
    total_balance: f64,
    monthly_income: f64,
    monthly_expenses: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct RecentNote {
    id: String,
    title: String,
    r#type: String,
    icon: Option<String>,
    color: Option<String>,
    updated_at: PrismaDateTime,
    folder: Option<FolderMini>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct FolderMini {
    id: String,
    name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct UpcomingEvent {
    id: String,
    title: String,
    start_date: PrismaDateTime,
    end_date: Option<PrismaDateTime>,
    all_day: bool,
    color: String,
    task: Option<EventTaskMini>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct EventTaskMini {
    id: String,
    title: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct JournalMini {
    id: String,
    title: Option<String>,
    mood: Option<String>,
    mood_score: Option<i64>,
    date: PrismaDateTime,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GoalMini {
    id: String,
    title: String,
    progress: i64,
    category: String,
    target_date: Option<PrismaDateTime>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjectCount {
    tasks: i64,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjectMini {
    id: String,
    name: String,
    color: String,
    #[serde(rename = "_count")]
    count: ProjectCount,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DashboardResponse {
    tasks: TaskStatus,
    habits: HabitsInfo,
    finance: FinanceInfo,
    recent_notes: Vec<RecentNote>,
    upcoming_events: Vec<UpcomingEvent>,
    recent_journal_entries: Vec<JournalMini>,
    active_goals: Vec<GoalMini>,
    active_projects: Vec<ProjectMini>,
}

pub async fn get_dashboard(State(st): State<AppState>) -> Result<Json<Value>, AppError> {
    let now = now_ms();
    // Today midnight UTC
    let today_ms = {
        let secs = now / 1000;
        let day_secs = secs - (secs % 86400);
        day_secs * 1000
    };
    let today_end = today_ms + 86_400_000 - 1;

    // Task counts by status
    let status_rows =
        sqlx::query("SELECT status, COUNT(*) as cnt FROM Task WHERE archived = 0 GROUP BY status")
            .fetch_all(&st.db)
            .await?;
    let mut by_status = serde_json::Map::new();
    by_status.insert("todo".to_string(), serde_json::json!(0));
    by_status.insert("in-progress".to_string(), serde_json::json!(0));
    by_status.insert("done".to_string(), serde_json::json!(0));
    by_status.insert("cancelled".to_string(), serde_json::json!(0));
    let mut task_total: i64 = 0;
    for r in &status_rows {
        let s: String = r.try_get("status")?;
        let c: i64 = r.try_get("cnt")?;
        by_status.insert(s, serde_json::json!(c));
        task_total += c;
    }
    let tasks = TaskStatus {
        by_status,
        total: task_total,
    };

    // Habits
    let total_habits: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Habit WHERE archived = 0")
        .fetch_one(&st.db)
        .await?;
    let completed_today: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM HabitLog WHERE date >= ? AND date <= ?")
            .bind(today_ms)
            .bind(today_end)
            .fetch_one(&st.db)
            .await?;
    let habit_rate = if total_habits > 0 {
        (completed_today * 100) / total_habits
    } else {
        0
    };

    let habit_rows = sqlx::query("SELECT id, name, icon, color FROM Habit WHERE archived = 0")
        .fetch_all(&st.db)
        .await?;
    let mut recent_activity = Vec::new();
    for hr in &habit_rows {
        let hid: String = hr.try_get("id")?;
        let log_rows = sqlx::query(
            "SELECT date, count FROM HabitLog WHERE habitId = ? ORDER BY date DESC LIMIT 7",
        )
        .bind(&hid)
        .fetch_all(&st.db)
        .await?;
        let logs = log_rows
            .iter()
            .map(|l| {
                Ok(HabitLogMini {
                    date: PrismaDateTime(l.try_get::<i64, _>("date")?),
                    count: l.try_get("count")?,
                })
            })
            .collect::<Result<Vec<_>, sqlx::Error>>()?;
        recent_activity.push(HabitActivity {
            id: hid,
            name: hr.try_get("name")?,
            icon: hr.try_get("icon")?,
            color: hr.try_get("color")?,
            logs,
        });
    }
    let habits = HabitsInfo {
        total: total_habits,
        completed_today,
        completion_rate: habit_rate,
        recent_activity,
    };

    // Finance
    let acc_rows = sqlx::query(
        "SELECT id, name, type, CAST(balance AS REAL) as balance, currency, color, icon FROM FinanceAccount WHERE archived = 0"
    ).fetch_all(&st.db).await?;
    let mut accounts = Vec::new();
    let mut total_balance = 0.0_f64;
    for ar in &acc_rows {
        let bal: f64 = ar.try_get("balance")?;
        total_balance += bal;
        accounts.push(AccountMini {
            id: ar.try_get("id")?,
            name: ar.try_get("name")?,
            r#type: ar.try_get("type")?,
            balance: bal,
            currency: ar.try_get("currency")?,
            color: ar.try_get("color")?,
            icon: ar.try_get("icon")?,
        });
    }
    let month_start_ms = {
        use chrono::{Datelike, TimeZone, Utc};
        let dt = Utc
            .timestamp_millis_opt(now)
            .single()
            .unwrap_or_else(Utc::now);
        Utc.with_ymd_and_hms(dt.year(), dt.month(), 1, 0, 0, 0)
            .single()
            .unwrap_or_else(Utc::now)
            .timestamp_millis()
    };
    let monthly_income: f64 = sqlx::query_scalar(
        "SELECT CAST(COALESCE(SUM(amount), 0) AS REAL) FROM \"Transaction\" WHERE type = 'income' AND date >= ?"
    ).bind(month_start_ms).fetch_one(&st.db).await?;
    let monthly_expenses: f64 = sqlx::query_scalar(
        "SELECT CAST(COALESCE(SUM(amount), 0) AS REAL) FROM \"Transaction\" WHERE type = 'expense' AND date >= ?"
    ).bind(month_start_ms).fetch_one(&st.db).await?;
    let finance = FinanceInfo {
        accounts,
        total_balance,
        monthly_income,
        monthly_expenses,
    };

    // Recent notes
    let note_rows = sqlx::query(
        "SELECT id, title, type, icon, color, updatedAt, folderId FROM Note WHERE archived = 0 ORDER BY updatedAt DESC LIMIT 5"
    ).fetch_all(&st.db).await?;
    let mut recent_notes = Vec::new();
    for nr in &note_rows {
        let folder_id: Option<String> = nr.try_get("folderId")?;
        let folder = if let Some(ref fid) = folder_id {
            let fr = sqlx::query("SELECT id, name FROM NoteFolder WHERE id = ?")
                .bind(fid)
                .fetch_optional(&st.db)
                .await?;
            fr.map(|r| FolderMini {
                id: r.try_get("id").unwrap_or_default(),
                name: r.try_get("name").unwrap_or_default(),
            })
        } else {
            None
        };
        recent_notes.push(RecentNote {
            id: nr.try_get("id")?,
            title: nr.try_get("title")?,
            r#type: nr.try_get("type")?,
            icon: nr.try_get("icon")?,
            color: nr.try_get("color")?,
            updated_at: PrismaDateTime(nr.try_get::<i64, _>("updatedAt")?),
            folder,
        });
    }

    // Upcoming events
    let event_rows = sqlx::query(
        "SELECT id, title, startDate, endDate, allDay, color, taskId FROM CalendarEvent WHERE startDate >= ? ORDER BY startDate ASC LIMIT 5"
    ).bind(now).fetch_all(&st.db).await?;
    let mut upcoming_events = Vec::new();
    for er in &event_rows {
        let task_id: Option<String> = er.try_get("taskId")?;
        let task = if let Some(ref tid) = task_id {
            let tr = sqlx::query("SELECT id, title FROM Task WHERE id = ?")
                .bind(tid)
                .fetch_optional(&st.db)
                .await?;
            tr.map(|r| EventTaskMini {
                id: r.try_get("id").unwrap_or_default(),
                title: r.try_get("title").unwrap_or_default(),
            })
        } else {
            None
        };
        upcoming_events.push(UpcomingEvent {
            id: er.try_get("id")?,
            title: er.try_get("title")?,
            start_date: PrismaDateTime(er.try_get::<i64, _>("startDate")?),
            end_date: er.try_get::<Option<i64>, _>("endDate")?.map(PrismaDateTime),
            all_day: er.try_get::<i64, _>("allDay")? != 0,
            color: er.try_get("color")?,
            task,
        });
    }

    // Recent journal entries
    let journal_rows = sqlx::query(
        "SELECT id, title, mood, moodScore, date FROM JournalEntry ORDER BY date DESC LIMIT 3",
    )
    .fetch_all(&st.db)
    .await?;
    let recent_journal_entries = journal_rows
        .iter()
        .map(|r| {
            Ok(JournalMini {
                id: r.try_get("id")?,
                title: r.try_get("title")?,
                mood: r.try_get("mood")?,
                mood_score: r.try_get("moodScore")?,
                date: PrismaDateTime(r.try_get::<i64, _>("date")?),
            })
        })
        .collect::<Result<Vec<_>, sqlx::Error>>()?;

    // Active goals
    let goal_rows = sqlx::query(
        "SELECT id, title, progress, category, targetDate FROM Goal WHERE status = 'in-progress' AND archived = 0 ORDER BY updatedAt DESC LIMIT 5"
    ).fetch_all(&st.db).await?;
    let active_goals = goal_rows
        .iter()
        .map(|r| {
            Ok(GoalMini {
                id: r.try_get("id")?,
                title: r.try_get("title")?,
                progress: r.try_get("progress")?,
                category: r.try_get("category")?,
                target_date: r
                    .try_get::<Option<i64>, _>("targetDate")?
                    .map(PrismaDateTime),
            })
        })
        .collect::<Result<Vec<_>, sqlx::Error>>()?;

    // Active projects
    let project_rows = sqlx::query(
        "SELECT id, name, color FROM Project WHERE status = 'active' AND archived = 0 ORDER BY updatedAt DESC LIMIT 5"
    ).fetch_all(&st.db).await?;
    let mut active_projects = Vec::new();
    for pr in &project_rows {
        let pid: String = pr.try_get("id")?;
        let tc: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Task WHERE projectId = ?")
            .bind(&pid)
            .fetch_one(&st.db)
            .await?;
        active_projects.push(ProjectMini {
            id: pid,
            name: pr.try_get("name")?,
            color: pr.try_get("color")?,
            count: ProjectCount { tasks: tc },
        });
    }

    Ok(Json(serde_json::json!({
        "tasks": tasks,
        "habits": habits,
        "finance": finance,
        "recentNotes": recent_notes,
        "upcomingEvents": upcoming_events,
        "recentJournalEntries": recent_journal_entries,
        "activeGoals": active_goals,
        "activeProjects": active_projects,
    })))
}
