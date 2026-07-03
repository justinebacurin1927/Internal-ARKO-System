import os
import sys

# __file__ is at <deploy_root>/api/index.py → backend is at <deploy_root>/backend/
backend_dir = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, os.path.abspath(backend_dir))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# On Vercel, switch to production settings
if os.environ.get("VERCEL"):
    os.environ["DJANGO_SETTINGS_MODULE"] = "config.production"

from django.core.wsgi import get_wsgi_application

app = get_wsgi_application()
