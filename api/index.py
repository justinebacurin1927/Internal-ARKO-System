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

# Run pending migrations on cold start so the database schema is up-to-date.
# If a table already exists but has no migration record (e.g. from an earlier
# deploy that created the schema before migration files existed), fake that
# migration so it is marked applied without re-creating the table.
from django.core.management import call_command, CommandError
from django.db.utils import ProgrammingError
import re, traceback, sys

MIGRATE_RETRIES = 15

def _run_migrate(retries=MIGRATE_RETRIES):
    """Run pending migrations, faking any that fail because the table already exists."""
    for attempt in range(retries):
        try:
            call_command("migrate", "--noinput", verbosity=0)
            return  # success
        except ProgrammingError as e:
            err_str = str(e)
            if "already exists" not in err_str:
                raise  # unexpected error — don't swallow
            # Extract the table name from the error
            m = re.search(r'relation "(\w+)" already exists', err_str)
            if not m:
                sys.stderr.write(f"MIGRATION: can't parse table name, retrying...\n")
                continue
            table_name = m.group(1)
            # Map table → app_label so we can fake just that app's migration
            from django.apps import apps
            app_label = None
            for ac in apps.get_app_configs():
                for model in ac.get_models():
                    if model._meta.db_table == table_name:
                        app_label = ac.label
                        break
                if app_label:
                    break
            if app_label:
                sys.stderr.write(f"MIGRATION: faking {app_label} (table '{table_name}' already exists, attempt {attempt+1})\n")
                call_command("migrate", app_label, "--fake", "--noinput", verbosity=0)
            else:
                sys.stderr.write(f"MIGRATION: unknown table '{table_name}', faking all...\n")
                call_command("migrate", "--fake", "--noinput", verbosity=0)
        except Exception as e2:
            # Log and continue — better to serve requests with partial schema
            sys.stderr.write(f"MIGRATION ERROR: {e2}\n")
            traceback.print_exc(file=sys.stderr)
            return

try:
    _run_migrate()
except Exception as e:
    sys.stderr.write(f"MIGRATION FATAL: {e}\n")
    traceback.print_exc(file=sys.stderr)

from django.core.wsgi import get_wsgi_application

app = get_wsgi_application()
