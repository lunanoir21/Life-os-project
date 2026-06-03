use axum::extract::State;
use axum::Json;
use serde_json::Value;
use sqlx::Row;

use crate::error::AppError;
use crate::prisma_dt::PrismaDateTime;
use crate::utils::{gen_id, now_ms};
use crate::AppState;

pub async fn export_data(State(st): State<AppState>) -> Result<Json<Value>, AppError> {
    macro_rules! fetch {
        ($q:expr) => { sqlx::query($q).fetch_all(&st.db).await? };
    }

    let rows_to_json = |rows: Vec<sqlx::sqlite::SqliteRow>| -> Vec<Value> {
        rows.iter().map(|_| serde_json::json!(null)).collect() // placeholder
    };
    let _ = rows_to_json;

    // Use raw SQL and return JSON arrays via serde_json
    let profile = sqlx::query("SELECT * FROM UserProfile").fetch_all(&st.db).await?;
    let settings = sqlx::query("SELECT * FROM Settings").fetch_all(&st.db).await?;
    let tags = sqlx::query("SELECT * FROM Tag").fetch_all(&st.db).await?;
    let projects = sqlx::query("SELECT * FROM Project").fetch_all(&st.db).await?;
    let tasks = sqlx::query("SELECT * FROM Task").fetch_all(&st.db).await?;
    let note_folders = sqlx::query("SELECT * FROM NoteFolder").fetch_all(&st.db).await?;
    let notes = sqlx::query("SELECT * FROM Note").fetch_all(&st.db).await?;
    let habits = sqlx::query("SELECT * FROM Habit").fetch_all(&st.db).await?;
    let habit_logs = sqlx::query("SELECT * FROM HabitLog").fetch_all(&st.db).await?;
    let journal_entries = sqlx::query("SELECT * FROM JournalEntry").fetch_all(&st.db).await?;
    let finance_accounts = sqlx::query("SELECT * FROM FinanceAccount").fetch_all(&st.db).await?;
    let transaction_categories = sqlx::query("SELECT * FROM TransactionCategory").fetch_all(&st.db).await?;
    let transactions = sqlx::query("SELECT * FROM \"Transaction\"").fetch_all(&st.db).await?;
    let budgets = sqlx::query("SELECT * FROM Budget").fetch_all(&st.db).await?;
    let budget_items = sqlx::query("SELECT * FROM BudgetItem").fetch_all(&st.db).await?;
    let goals = sqlx::query("SELECT * FROM Goal").fetch_all(&st.db).await?;
    let milestones = sqlx::query("SELECT * FROM Milestone").fetch_all(&st.db).await?;
    let courses = sqlx::query("SELECT * FROM Course").fetch_all(&st.db).await?;
    let course_resources = sqlx::query("SELECT * FROM CourseResource").fetch_all(&st.db).await?;
    let calendar_events = sqlx::query("SELECT * FROM CalendarEvent").fetch_all(&st.db).await?;
    let time_entries = sqlx::query("SELECT * FROM TimeEntry").fetch_all(&st.db).await?;

    fn rows_to_val(rows: Vec<sqlx::sqlite::SqliteRow>) -> Vec<Value> {
        use sqlx::Column;
        rows.iter().map(|r| {
            let mut map = serde_json::Map::new();
            for col in r.columns() {
                let name = col.name();
                // Try each type in order; fall back to null
                let val: Value = if let Ok(v) = r.try_get::<Option<String>, _>(name) {
                    v.map(|s| Value::String(s)).unwrap_or(Value::Null)
                } else if let Ok(v) = r.try_get::<Option<i64>, _>(name) {
                    v.map(|i| Value::Number(i.into())).unwrap_or(Value::Null)
                } else if let Ok(v) = r.try_get::<Option<f64>, _>(name) {
                    v.and_then(|f| serde_json::Number::from_f64(f).map(Value::Number)).unwrap_or(Value::Null)
                } else {
                    Value::Null
                };
                map.insert(name.to_string(), val);
            }
            Value::Object(map)
        }).collect()
    }

    Ok(Json(serde_json::json!({
        "version": "1.0.0",
        "exportedAt": PrismaDateTime(now_ms()).to_iso(),
        "data": {
            "profile": rows_to_val(profile),
            "settings": rows_to_val(settings),
            "tags": rows_to_val(tags),
            "projects": rows_to_val(projects),
            "tasks": rows_to_val(tasks),
            "noteFolders": rows_to_val(note_folders),
            "notes": rows_to_val(notes),
            "habits": rows_to_val(habits),
            "habitLogs": rows_to_val(habit_logs),
            "journalEntries": rows_to_val(journal_entries),
            "financeAccounts": rows_to_val(finance_accounts),
            "transactionCategories": rows_to_val(transaction_categories),
            "transactions": rows_to_val(transactions),
            "budgets": rows_to_val(budgets),
            "budgetItems": rows_to_val(budget_items),
            "goals": rows_to_val(goals),
            "milestones": rows_to_val(milestones),
            "courses": rows_to_val(courses),
            "courseResources": rows_to_val(course_resources),
            "calendarEvents": rows_to_val(calendar_events),
            "timeEntries": rows_to_val(time_entries),
        }
    })))
}

pub async fn import_data(
    State(st): State<AppState>,
    Json(body): Json<Value>,
) -> Result<Json<Value>, AppError> {
    let version = body.get("version");
    let data = body.get("data");
    if version.is_none() || data.is_none() {
        return Err(AppError::BadRequest("Invalid import format".to_string()));
    }
    let data = data.unwrap();
    let mut results: serde_json::Map<String, Value> = serde_json::Map::new();
    let now = now_ms();

    macro_rules! count_result {
        ($key:expr, $n:expr) => {
            results.insert($key.to_string(), Value::Number($n.into()));
        };
    }

    // Tags
    if let Some(arr) = data.get("tags").and_then(|v| v.as_array()) {
        let mut n = 0i64;
        for t in arr {
            let id = t.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let name = t.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let color = t.get("color").and_then(|v| v.as_str()).unwrap_or("#6b7280").to_string();
            let _ = sqlx::query("INSERT OR REPLACE INTO Tag (id, name, color, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)")
                .bind(&id).bind(&name).bind(&color).bind(now).bind(now)
                .execute(&st.db).await;
            n += 1;
        }
        count_result!("tags", n);
    }

    // NoteFolders
    if let Some(arr) = data.get("noteFolders").and_then(|v| v.as_array()) {
        let mut n = 0i64;
        for f in arr {
            let id = f.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let _ = sqlx::query(
                "INSERT OR REPLACE INTO NoteFolder (id, name, icon, color, parentId, \"order\", createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&id)
            .bind(f.get("name").and_then(|v| v.as_str()).unwrap_or(""))
            .bind(f.get("icon").and_then(|v| v.as_str()))
            .bind(f.get("color").and_then(|v| v.as_str()).unwrap_or("#6b7280"))
            .bind(f.get("parentId").and_then(|v| v.as_str()))
            .bind(f.get("order").and_then(|v| v.as_i64()).unwrap_or(0))
            .bind(now).bind(now)
            .execute(&st.db).await;
            n += 1;
        }
        count_result!("noteFolders", n);
    }

    // Projects
    if let Some(arr) = data.get("projects").and_then(|v| v.as_array()) {
        let mut n = 0i64;
        for p in arr {
            let id = p.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let _ = sqlx::query(
                "INSERT OR REPLACE INTO Project (id, name, description, color, icon, status, archived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&id)
            .bind(p.get("name").and_then(|v| v.as_str()).unwrap_or(""))
            .bind(p.get("description").and_then(|v| v.as_str()))
            .bind(p.get("color").and_then(|v| v.as_str()).unwrap_or("#6b7280"))
            .bind(p.get("icon").and_then(|v| v.as_str()))
            .bind(p.get("status").and_then(|v| v.as_str()).unwrap_or("active"))
            .bind(0_i64).bind(now).bind(now)
            .execute(&st.db).await;
            n += 1;
        }
        count_result!("projects", n);
    }

    // Tasks
    if let Some(arr) = data.get("tasks").and_then(|v| v.as_array()) {
        let mut n = 0i64;
        for t in arr {
            let id = t.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let _ = sqlx::query(
                "INSERT OR REPLACE INTO Task (id, title, description, status, priority, position, archived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&id)
            .bind(t.get("title").and_then(|v| v.as_str()).unwrap_or(""))
            .bind(t.get("description").and_then(|v| v.as_str()))
            .bind(t.get("status").and_then(|v| v.as_str()).unwrap_or("todo"))
            .bind(t.get("priority").and_then(|v| v.as_str()).unwrap_or("medium"))
            .bind(t.get("position").and_then(|v| v.as_i64()).unwrap_or(0))
            .bind(0_i64).bind(now).bind(now)
            .execute(&st.db).await;
            n += 1;
        }
        count_result!("tasks", n);
    }

    // Habits
    if let Some(arr) = data.get("habits").and_then(|v| v.as_array()) {
        let mut n = 0i64;
        for h in arr {
            let id = h.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let _ = sqlx::query(
                "INSERT OR REPLACE INTO Habit (id, name, description, icon, color, frequency, targetCount, archived, reminderEnabled, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&id)
            .bind(h.get("name").and_then(|v| v.as_str()).unwrap_or(""))
            .bind(h.get("description").and_then(|v| v.as_str()))
            .bind(h.get("icon").and_then(|v| v.as_str()))
            .bind(h.get("color").and_then(|v| v.as_str()).unwrap_or("#6b7280"))
            .bind(h.get("frequency").and_then(|v| v.as_str()).unwrap_or("daily"))
            .bind(h.get("targetCount").and_then(|v| v.as_i64()).unwrap_or(1))
            .bind(0_i64).bind(0_i64).bind(now).bind(now)
            .execute(&st.db).await;
            n += 1;
        }
        count_result!("habits", n);
    }

    // Habit logs
    if let Some(arr) = data.get("habitLogs").and_then(|v| v.as_array()) {
        let mut n = 0i64;
        for l in arr {
            let id = l.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let _ = sqlx::query(
                "INSERT OR REPLACE INTO HabitLog (id, habitId, date, count, note, createdAt) VALUES (?, ?, ?, ?, ?, ?)"
            )
            .bind(&id)
            .bind(l.get("habitId").and_then(|v| v.as_str()).unwrap_or(""))
            .bind(l.get("date").and_then(|v| v.as_i64()).unwrap_or(now))
            .bind(l.get("count").and_then(|v| v.as_i64()).unwrap_or(1))
            .bind(l.get("note").and_then(|v| v.as_str()))
            .bind(now)
            .execute(&st.db).await;
            n += 1;
        }
        count_result!("habitLogs", n);
    }

    // Journal entries
    if let Some(arr) = data.get("journalEntries").and_then(|v| v.as_array()) {
        let mut n = 0i64;
        for e in arr {
            let id = e.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let _ = sqlx::query(
                "INSERT OR REPLACE INTO JournalEntry (id, title, content, mood, moodScore, energy, stress, gratitude, tags, isFavorite, date, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&id)
            .bind(e.get("title").and_then(|v| v.as_str()))
            .bind(e.get("content").and_then(|v| v.as_str()).unwrap_or(""))
            .bind(e.get("mood").and_then(|v| v.as_str()))
            .bind(e.get("moodScore").and_then(|v| v.as_i64()))
            .bind(e.get("energy").and_then(|v| v.as_i64()))
            .bind(e.get("stress").and_then(|v| v.as_i64()))
            .bind(e.get("gratitude").and_then(|v| v.as_str()))
            .bind(e.get("tags").and_then(|v| v.as_str()))
            .bind(0_i64)
            .bind(e.get("date").and_then(|v| v.as_i64()).unwrap_or(now))
            .bind(now).bind(now)
            .execute(&st.db).await;
            n += 1;
        }
        count_result!("journalEntries", n);
    }

    // Finance accounts
    if let Some(arr) = data.get("financeAccounts").and_then(|v| v.as_array()) {
        let mut n = 0i64;
        for a in arr {
            let id = a.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let _ = sqlx::query(
                "INSERT OR REPLACE INTO FinanceAccount (id, name, type, balance, currency, color, icon, isDefault, archived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&id)
            .bind(a.get("name").and_then(|v| v.as_str()).unwrap_or(""))
            .bind(a.get("type").and_then(|v| v.as_str()).unwrap_or("checking"))
            .bind(a.get("balance").and_then(|v| v.as_f64()).unwrap_or(0.0))
            .bind(a.get("currency").and_then(|v| v.as_str()).unwrap_or("USD"))
            .bind(a.get("color").and_then(|v| v.as_str()))
            .bind(a.get("icon").and_then(|v| v.as_str()))
            .bind(0_i64).bind(0_i64).bind(now).bind(now)
            .execute(&st.db).await;
            n += 1;
        }
        count_result!("financeAccounts", n);
    }

    // Transaction categories
    if let Some(arr) = data.get("transactionCategories").and_then(|v| v.as_array()) {
        let mut n = 0i64;
        for c in arr {
            let id = c.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let _ = sqlx::query(
                "INSERT OR REPLACE INTO TransactionCategory (id, name, icon, color, type, isSystem, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&id)
            .bind(c.get("name").and_then(|v| v.as_str()).unwrap_or(""))
            .bind(c.get("icon").and_then(|v| v.as_str()))
            .bind(c.get("color").and_then(|v| v.as_str()).unwrap_or("#6b7280"))
            .bind(c.get("type").and_then(|v| v.as_str()).unwrap_or("expense"))
            .bind(0_i64).bind(now).bind(now)
            .execute(&st.db).await;
            n += 1;
        }
        count_result!("transactionCategories", n);
    }

    // Transactions
    if let Some(arr) = data.get("transactions").and_then(|v| v.as_array()) {
        let mut n = 0i64;
        for t in arr {
            let id = t.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let _ = sqlx::query(
                "INSERT OR REPLACE INTO \"Transaction\" (id, amount, description, type, date, note, isRecurring, accountId, categoryId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&id)
            .bind(t.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0))
            .bind(t.get("description").and_then(|v| v.as_str()).unwrap_or(""))
            .bind(t.get("type").and_then(|v| v.as_str()).unwrap_or("expense"))
            .bind(t.get("date").and_then(|v| v.as_i64()).unwrap_or(now))
            .bind(t.get("note").and_then(|v| v.as_str()))
            .bind(0_i64)
            .bind(t.get("accountId").and_then(|v| v.as_str()).unwrap_or(""))
            .bind(t.get("categoryId").and_then(|v| v.as_str()))
            .bind(now).bind(now)
            .execute(&st.db).await;
            n += 1;
        }
        count_result!("transactions", n);
    }

    // Goals
    if let Some(arr) = data.get("goals").and_then(|v| v.as_array()) {
        let mut n = 0i64;
        for g in arr {
            let id = g.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let _ = sqlx::query(
                "INSERT OR REPLACE INTO Goal (id, title, description, category, status, progress, archived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&id)
            .bind(g.get("title").and_then(|v| v.as_str()).unwrap_or(""))
            .bind(g.get("description").and_then(|v| v.as_str()))
            .bind(g.get("category").and_then(|v| v.as_str()).unwrap_or("personal"))
            .bind(g.get("status").and_then(|v| v.as_str()).unwrap_or("not-started"))
            .bind(g.get("progress").and_then(|v| v.as_i64()).unwrap_or(0))
            .bind(0_i64).bind(now).bind(now)
            .execute(&st.db).await;
            n += 1;
        }
        count_result!("goals", n);
    }

    // Milestones
    if let Some(arr) = data.get("milestones").and_then(|v| v.as_array()) {
        let mut n = 0i64;
        for m in arr {
            let id = m.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let _ = sqlx::query(
                "INSERT OR REPLACE INTO Milestone (id, goalId, title, completed, \"order\", createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&id)
            .bind(m.get("goalId").and_then(|v| v.as_str()).unwrap_or(""))
            .bind(m.get("title").and_then(|v| v.as_str()).unwrap_or(""))
            .bind(if m.get("completed").and_then(|v| v.as_bool()).unwrap_or(false) { 1_i64 } else { 0_i64 })
            .bind(m.get("order").and_then(|v| v.as_i64()).unwrap_or(0))
            .bind(now).bind(now)
            .execute(&st.db).await;
            n += 1;
        }
        count_result!("milestones", n);
    }

    // Courses
    if let Some(arr) = data.get("courses").and_then(|v| v.as_array()) {
        let mut n = 0i64;
        for c in arr {
            let id = c.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let _ = sqlx::query(
                "INSERT OR REPLACE INTO Course (id, title, description, provider, status, progress, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&id)
            .bind(c.get("title").and_then(|v| v.as_str()).unwrap_or(""))
            .bind(c.get("description").and_then(|v| v.as_str()))
            .bind(c.get("provider").and_then(|v| v.as_str()))
            .bind(c.get("status").and_then(|v| v.as_str()).unwrap_or("not-started"))
            .bind(c.get("progress").and_then(|v| v.as_i64()).unwrap_or(0))
            .bind(now).bind(now)
            .execute(&st.db).await;
            n += 1;
        }
        count_result!("courses", n);
    }

    // Calendar events
    if let Some(arr) = data.get("calendarEvents").and_then(|v| v.as_array()) {
        let mut n = 0i64;
        for e in arr {
            let id = e.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let _ = sqlx::query(
                "INSERT OR REPLACE INTO CalendarEvent (id, title, description, startDate, endDate, allDay, color, location, taskId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&id)
            .bind(e.get("title").and_then(|v| v.as_str()).unwrap_or(""))
            .bind(e.get("description").and_then(|v| v.as_str()))
            .bind(e.get("startDate").and_then(|v| v.as_i64()).unwrap_or(now))
            .bind(e.get("endDate").and_then(|v| v.as_i64()))
            .bind(if e.get("allDay").and_then(|v| v.as_bool()).unwrap_or(false) { 1_i64 } else { 0_i64 })
            .bind(e.get("color").and_then(|v| v.as_str()).unwrap_or("#6b7280"))
            .bind(e.get("location").and_then(|v| v.as_str()))
            .bind(e.get("taskId").and_then(|v| v.as_str()))
            .bind(now).bind(now)
            .execute(&st.db).await;
            n += 1;
        }
        count_result!("calendarEvents", n);
    }

    // Time entries
    if let Some(arr) = data.get("timeEntries").and_then(|v| v.as_array()) {
        let mut n = 0i64;
        for te in arr {
            let id = te.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let _ = sqlx::query(
                "INSERT OR REPLACE INTO TimeEntry (id, description, startTime, endTime, duration, billable, taskId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&id)
            .bind(te.get("description").and_then(|v| v.as_str()).unwrap_or(""))
            .bind(te.get("startTime").and_then(|v| v.as_i64()).unwrap_or(now))
            .bind(te.get("endTime").and_then(|v| v.as_i64()))
            .bind(te.get("duration").and_then(|v| v.as_i64()))
            .bind(0_i64)
            .bind(te.get("taskId").and_then(|v| v.as_str()))
            .bind(now).bind(now)
            .execute(&st.db).await;
            n += 1;
        }
        count_result!("timeEntries", n);
    }

    // Profile
    if let Some(arr) = data.get("profile").and_then(|v| v.as_array()) {
        if let Some(p) = arr.first() {
            let id = p.get("id").and_then(|v| v.as_str()).unwrap_or_else(|| "").to_string();
            let existing: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM UserProfile").fetch_one(&st.db).await?;
            if existing > 0 {
                let _ = sqlx::query("UPDATE UserProfile SET name = ?, email = ?, updatedAt = ? WHERE 1=1")
                    .bind(p.get("name").and_then(|v| v.as_str()))
                    .bind(p.get("email").and_then(|v| v.as_str()))
                    .bind(now)
                    .execute(&st.db).await;
            } else {
                let new_id = if id.is_empty() { gen_id() } else { id };
                let _ = sqlx::query(
                    "INSERT INTO UserProfile (id, name, email, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)"
                )
                .bind(&new_id)
                .bind(p.get("name").and_then(|v| v.as_str()))
                .bind(p.get("email").and_then(|v| v.as_str()))
                .bind(now).bind(now)
                .execute(&st.db).await;
            }
            results.insert("profile".to_string(), Value::Number(1.into()));
        }
    }

    let total: i64 = results.values().filter_map(|v| v.as_i64()).sum();
    Ok(Json(serde_json::json!({ "success": true, "imported": results, "totalImported": total })))
}

pub async fn reset_data(State(st): State<AppState>) -> Result<Json<Value>, AppError> {
    // Delete in reverse dependency order (no CASCADE on everything)
    sqlx::query("DELETE FROM TimeEntry").execute(&st.db).await?;
    sqlx::query("DELETE FROM PomodoroSession").execute(&st.db).await?;
    sqlx::query("DELETE FROM CalendarEvent").execute(&st.db).await?;
    sqlx::query("DELETE FROM CourseResource").execute(&st.db).await?;
    sqlx::query("DELETE FROM Course").execute(&st.db).await?;
    sqlx::query("DELETE FROM Milestone").execute(&st.db).await?;
    sqlx::query("DELETE FROM GoalProject").execute(&st.db).await.ok();
    sqlx::query("DELETE FROM GoalTag").execute(&st.db).await.ok();
    sqlx::query("DELETE FROM Goal").execute(&st.db).await?;
    sqlx::query("DELETE FROM BudgetItem").execute(&st.db).await?;
    sqlx::query("DELETE FROM Budget").execute(&st.db).await?;
    sqlx::query("DELETE FROM \"Transaction\"").execute(&st.db).await?;
    sqlx::query("DELETE FROM TransactionCategory").execute(&st.db).await?;
    sqlx::query("DELETE FROM FinanceAccount").execute(&st.db).await?;
    sqlx::query("DELETE FROM JournalTag").execute(&st.db).await.ok();
    sqlx::query("DELETE FROM JournalEntry").execute(&st.db).await?;
    sqlx::query("DELETE FROM HabitLog").execute(&st.db).await?;
    sqlx::query("DELETE FROM HabitTag").execute(&st.db).await.ok();
    sqlx::query("DELETE FROM Habit").execute(&st.db).await?;
    sqlx::query("DELETE FROM NoteLink").execute(&st.db).await.ok();
    sqlx::query("DELETE FROM NoteBookmark").execute(&st.db).await.ok();
    sqlx::query("DELETE FROM NoteTag").execute(&st.db).await.ok();
    sqlx::query("DELETE FROM Note").execute(&st.db).await?;
    sqlx::query("DELETE FROM NoteFolder").execute(&st.db).await?;
    sqlx::query("DELETE FROM TaskDependency").execute(&st.db).await.ok();
    sqlx::query("DELETE FROM TaskTag").execute(&st.db).await.ok();
    sqlx::query("DELETE FROM Task").execute(&st.db).await?;
    sqlx::query("DELETE FROM Project").execute(&st.db).await?;
    sqlx::query("DELETE FROM Tag").execute(&st.db).await?;
    sqlx::query("DELETE FROM Settings").execute(&st.db).await?;
    sqlx::query("DELETE FROM UserProfile").execute(&st.db).await?;
    Ok(Json(serde_json::json!({ "success": true, "message": "All data has been reset" })))
}

pub async fn get_stats(State(st): State<AppState>) -> Result<Json<Value>, AppError> {
    let tasks: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Task").fetch_one(&st.db).await?;
    let notes: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Note").fetch_one(&st.db).await?;
    let habits: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Habit").fetch_one(&st.db).await?;
    let habit_logs: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM HabitLog").fetch_one(&st.db).await?;
    let journal_entries: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM JournalEntry").fetch_one(&st.db).await?;
    let transactions: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM \"Transaction\"").fetch_one(&st.db).await?;
    let goals: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Goal").fetch_one(&st.db).await?;
    let courses: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Course").fetch_one(&st.db).await?;
    let calendar_events: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM CalendarEvent").fetch_one(&st.db).await?;
    let time_entries: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM TimeEntry").fetch_one(&st.db).await?;
    let projects: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Project").fetch_one(&st.db).await?;
    let tags: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Tag").fetch_one(&st.db).await?;

    let total = tasks + notes + habits + habit_logs + journal_entries + transactions + goals + courses + calendar_events + time_entries + projects + tags;
    let storage_kb = total * 3 / 2; // ~1.5 KB estimate
    let storage_mb = storage_kb as f64 / 1024.0;

    // Activity streak
    let now = now_ms();
    let today_ms = { let s = now / 1000; (s - s % 86400) * 1000 };
    let mut active_dates = std::collections::HashSet::new();
    for days_back in 0..365i64 {
        let day_ms = today_ms - days_back * 86_400_000;
        let day_end = day_ms + 86_400_000 - 1;
        let has_task: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM Task WHERE createdAt >= ? AND createdAt <= ? LIMIT 1")
            .bind(day_ms).bind(day_end).fetch_one(&st.db).await.unwrap_or(0);
        let has_journal: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM JournalEntry WHERE createdAt >= ? AND createdAt <= ? LIMIT 1")
            .bind(day_ms).bind(day_end).fetch_one(&st.db).await.unwrap_or(0);
        let has_habit: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM HabitLog WHERE createdAt >= ? AND createdAt <= ? LIMIT 1")
            .bind(day_ms).bind(day_end).fetch_one(&st.db).await.unwrap_or(0);
        if has_task + has_journal + has_habit > 0 {
            active_dates.insert(days_back);
        }
    }
    let mut streak = 0i64;
    let start = if active_dates.contains(&0) { 0 } else { 1 };
    for i in start..365i64 {
        if active_dates.contains(&i) { streak += 1; } else { break; }
    }

    let earliest: Option<i64> = sqlx::query_scalar("SELECT createdAt FROM UserProfile ORDER BY createdAt ASC LIMIT 1")
        .fetch_optional(&st.db).await.ok().flatten();
    let account_created = earliest.map(|ms| PrismaDateTime(ms).to_iso()).unwrap_or_else(|| PrismaDateTime(now).to_iso());

    Ok(Json(serde_json::json!({
        "counts": { "tasks": tasks, "notes": notes, "habits": habits, "habitLogs": habit_logs, "journalEntries": journal_entries, "transactions": transactions, "goals": goals, "courses": courses, "calendarEvents": calendar_events, "timeEntries": time_entries, "projects": projects, "tags": tags },
        "totalRecords": total,
        "storageSizeMB": (storage_mb * 100.0).round() / 100.0,
        "storageSizeKB": storage_kb,
        "activityStreak": streak,
        "accountCreated": account_created,
        "moduleRecords": { "Tasks": tasks, "Notes": notes, "Habits": habits + habit_logs, "Journal": journal_entries, "Finance": transactions, "Goals": goals, "Learning": courses, "Calendar": calendar_events, "Time": time_entries, "Projects": projects, "Tags": tags },
    })))
}
