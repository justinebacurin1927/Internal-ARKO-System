import os
import sys

# __file__ is at <deploy_root>/api/index.py → backend is at <deploy_root>/backend/
backend_dir = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, os.path.abspath(backend_dir))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# On Vercel, switch to production settings
if os.environ.get("VERCEL"):
    os.environ["DJANGO_SETTINGS_MODULE"] = "config.production"

import django
django.setup()

# Run pending migrations on cold start so the database schema is up-to-date
from django.core.management import call_command
try:
    call_command("migrate", "--noinput", verbosity=0)
except Exception:
    pass  # non-fatal — the app will still attempt queries

from django.core.wsgi import get_wsgi_application

app = get_wsgi_application()
