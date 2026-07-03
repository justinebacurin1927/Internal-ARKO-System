import os
import dj_database_url

# Import everything from the base settings
from .settings import *  # noqa: F401, F403 — intentional: we override only what's needed

# --- Core Django ---
DEBUG = False

SECRET_KEY = os.environ["SECRET_KEY"]

ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", ".vercel.app").split(",")

# --- Database (Supabase PostgreSQL via DATABASE_URL) ---
DATABASES = {
    "default": dj_database_url.config(
        default=os.environ["DATABASE_URL"],
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# --- CORS (locked to frontend origin) ---
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = os.environ.get(
    "CORS_ALLOWED_ORIGINS",
    "https://*.vercel.app",
).split(",")
CORS_ALLOW_CREDENTIALS = True

# --- S3 / Object Storage (Supabase Storage) ---
S3_ENDPOINT = os.environ.get("S3_ENDPOINT", "")
S3_REGION = os.environ.get("S3_REGION", "us-east-1")
S3_ACCESS_KEY_ID = os.environ.get("S3_ACCESS_KEY_ID", "")
S3_SECRET_ACCESS_KEY = os.environ.get("S3_SECRET_ACCESS_KEY", "")
S3_BUCKET = os.environ.get("S3_BUCKET", "arko-attachments")
S3_FORCE_PATH_STYLE = os.environ.get("S3_FORCE_PATH_STYLE", "true") == "true"

# --- Email (SMTP) ---
EMAIL_HOST = os.environ.get("SMTP_HOST", "")
EMAIL_PORT = int(os.environ.get("SMTP_PORT", "587"))
EMAIL_HOST_USER = os.environ.get("SMTP_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("SMTP_PASS", "")
DEFAULT_FROM_EMAIL = os.environ.get("SMTP_FROM", "ARKO <no-reply@arko.app>")
EMAIL_USE_TLS = True
