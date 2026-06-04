use lifeos_backend::{build_app, db};

#[tokio::main]
async fn main() {
    let _ = dotenvy::dotenv();

    // Structured logging — set RUST_LOG env var to control verbosity.
    // Defaults to "info" so startup messages and slow queries are visible.
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    let raw_url =
        std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite:../prisma/dev.db".to_string());
    // Accept Prisma-style `file:` prefix as well as sqlx-style `sqlite:`
    let database_url = if raw_url.starts_with("file:") {
        format!("sqlite:{}", &raw_url[5..])
    } else {
        raw_url
    };
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080);

    let pool = db::make_pool(&database_url)
        .await
        .unwrap_or_else(|e| panic!("failed to open database {database_url}: {e}"));

    let app = build_app(pool);

    let addr = format!("0.0.0.0:{port}");
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .unwrap_or_else(|e| panic!("failed to bind {addr}: {e}"));

    tracing::info!("lifeos-backend listening on http://{addr}  (db: {database_url})");
    axum::serve(listener, app).await.expect("server error");
}
