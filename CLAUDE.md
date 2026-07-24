@AGENTS.md

## Deployment & Infrastructure Protocol

**NEVER DELETE anything (projects, env vars, deployments, databases) without first:**

1. **Exporting/backing up all configuration** — env vars, project settings, secrets, connection strings
2. **Saving the backup to a known file** (e.g. `.env.backup-YYYY-MM-DD`)
3. **Confirming the backup is complete** before proceeding with any deletion

This includes Vercel projects, GitHub repos, database resources, cloud services, etc.

*Learned the hard way: deleted a Vercel project and lost all production env vars (DATABASE_URL, SECRET_KEY, etc.) that weren't backed up. The database was fine (Supabase), but reconnecting the app was painful.*
