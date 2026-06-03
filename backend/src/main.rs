mod activity;
mod courses;
mod dashboard;
mod data;
mod db;
mod error;
mod events;
mod finance;
mod goals;
mod habit_logs;
mod habits;
mod insights;
mod journal;
mod note_folders;
mod notes;
mod notifications;
mod pomodoro;
mod prisma_dt;
mod profile;
mod projects;
mod search;
mod tags;
mod tasks;
mod time_entries;
mod utils;
mod weekly_review;

use axum::{
    routing::{delete, get, patch, post},
    Router,
};
use sqlx::SqlitePool;
use tower_http::cors::CorsLayer;

#[derive(Clone)]
pub struct AppState {
    pub db: SqlitePool,
}

#[tokio::main]
async fn main() {
    let _ = dotenvy::dotenv();

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite:../prisma/dev.db".to_string());
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080);

    let pool = db::make_pool(&database_url)
        .await
        .unwrap_or_else(|e| panic!("failed to open database {database_url}: {e}"));

    let state = AppState { db: pool };

    let app = Router::new()
        // Tasks
        .route("/api/tasks", get(tasks::list_tasks).post(tasks::create_task))
        .route("/api/tasks/{id}", get(tasks::get_task).patch(tasks::update_task).delete(tasks::delete_task))
        // Profile
        .route("/api/profile", get(profile::get_profile).post(profile::create_profile).patch(profile::update_profile))
        // Tags
        .route("/api/tags", get(tags::list_tags).post(tags::create_tag))
        // Note Folders
        .route("/api/note-folders", get(note_folders::list_note_folders).post(note_folders::create_note_folder))
        // Notes
        .route("/api/notes", get(notes::list_notes).post(notes::create_note))
        .route("/api/notes/{id}", get(notes::get_note).patch(notes::update_note).delete(notes::delete_note))
        // Projects
        .route("/api/projects", get(projects::list_projects).post(projects::create_project))
        .route("/api/projects/{id}", get(projects::get_project).patch(projects::update_project).delete(projects::delete_project))
        // Journal
        .route("/api/journal", get(journal::list_journal).post(journal::create_journal))
        .route("/api/journal/{id}", get(journal::get_journal).patch(journal::update_journal).delete(journal::delete_journal))
        // Habits
        .route("/api/habits", get(habits::list_habits).post(habits::create_habit))
        .route("/api/habits/{id}", get(habits::get_habit).patch(habits::update_habit))
        // Habit Logs
        .route("/api/habit-logs", get(habit_logs::list_habit_logs).post(habit_logs::create_habit_log))
        // Goals
        .route("/api/goals", get(goals::list_goals).post(goals::create_goal))
        .route("/api/goals/{id}", get(goals::get_goal).patch(goals::update_goal).delete(goals::delete_goal))
        // Events (Calendar)
        .route("/api/events", get(events::list_events).post(events::create_event))
        .route("/api/events/{id}", get(events::get_event).patch(events::update_event).delete(events::delete_event))
        // Time Entries
        .route("/api/time-entries", get(time_entries::list_time_entries).post(time_entries::create_time_entry).patch(time_entries::stop_time_entry))
        .route("/api/time-entries/{id}", delete(time_entries::delete_time_entry))
        // Pomodoro
        .route("/api/pomodoro-sessions", get(pomodoro::list_pomodoro).post(pomodoro::create_pomodoro))
        .route("/api/pomodoro-sessions/{id}", patch(pomodoro::update_pomodoro).delete(pomodoro::delete_pomodoro))
        // Courses
        .route("/api/courses", get(courses::list_courses).post(courses::create_course))
        .route("/api/courses/{id}", get(courses::get_course).patch(courses::update_course).delete(courses::delete_course))
        // Finance
        .route("/api/finance/accounts", get(finance::list_accounts).post(finance::create_account))
        .route("/api/finance/accounts/{id}", get(finance::get_account).patch(finance::update_account))
        .route("/api/finance/transactions", get(finance::list_transactions).post(finance::create_transaction))
        .route("/api/finance/transactions/{id}", get(finance::get_transaction).delete(finance::delete_transaction))
        .route("/api/finance/categories", get(finance::list_categories).post(finance::create_category))
        .route("/api/finance/budgets", get(finance::list_budgets).post(finance::create_budget))
        // Analytics
        .route("/api/dashboard", get(dashboard::get_dashboard))
        .route("/api/notifications", get(notifications::get_notifications))
        .route("/api/insights", get(insights::get_insights))
        .route("/api/ai/insights", get(insights::get_ai_insights))
        .route("/api/weekly-review", get(weekly_review::get_weekly_review))
        .route("/api/search", get(search::search))
        .route("/api/activity", get(activity::get_activity))
        // Data management
        .route("/api/data/export", get(data::export_data))
        .route("/api/data/import", post(data::import_data))
        .route("/api/data/reset", delete(data::reset_data))
        .route("/api/data/stats", get(data::get_stats))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = format!("0.0.0.0:{port}");
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .unwrap_or_else(|e| panic!("failed to bind {addr}: {e}"));

    println!("lifeos-backend listening on http://{addr}  (db: {database_url})");
    axum::serve(listener, app)
        .await
        .expect("server error");
}
