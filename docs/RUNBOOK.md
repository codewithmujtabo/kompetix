# Competzy Runbook

On-call procedures for production incidents. Keep this file short — long
runbooks don't get read at 2 AM.

## Quick links

- Production:  https://competzy.com · https://api.competzy.com · https://admin.competzy.com
- Staging:     https://staging.competzy.com · https://staging-api.competzy.com
- Sentry:      project `competzy-backend`, project `competzy-app`
- Midtrans:    https://dashboard.midtrans.com (production) / sandbox.midtrans.com (dev)
- Postgres:    `psql competzy` on the VPS (sudo as `competzy` user)
- VPS access:  `ssh competzy@<vps-ip>` (key in 1Password "Competzy VPS")

## Deploy

```bash
ssh competzy@<vps-ip>
cd /var/www/competzy
git fetch origin && git checkout origin/main
cd backend && npm ci && npm run build && cd ..
cd web && npm ci && npm run build && cd ..
pm2 reload deploy/pm2.config.js
pm2 logs --lines 50
```

Migrations: `cd backend && npm run db:migrate`

## "API is down" / 502 from nginx

1. `pm2 status` — is `competzy-api` online?
2. If errored: `pm2 logs competzy-api --lines 100` — usually env var or DB.
3. If memory: `pm2 restart competzy-api`. Investigate leak in Sentry.
4. If DB: `psql competzy -c 'SELECT count(*) FROM pg_stat_activity;'` — kill
   stuck queries with `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
   WHERE state='idle in transaction' AND query_start < now() - interval '1 hour';`

## Payments not settling

1. Check Midtrans dashboard → Transactions for the stuck order_id.
2. `psql competzy -c "SELECT * FROM payment_webhook_events WHERE order_id='<id>' ORDER BY received_at DESC;"`
   — was the webhook received?
3. If yes but registration not flipped: re-trigger via `GET /api/payments/verify/:registrationId`
   while logged in as the student or admin.
4. If webhook never arrived: check Midtrans dashboard → Notification log → resend.

## File downloads return 403

1. Signed URLs expire after 15 min. Get a fresh one from `GET /api/documents`.
2. If S3-mode: check MinIO is reachable from backend
   (`curl -I http://minio.local:9000/minio/health/live`).

## Soft-delete recovery

Accidentally deleted user / registration:
```sql
UPDATE users SET deleted_at = NULL WHERE email = '...';
```
Use `restore()` helper from `backend/src/db/query-helpers.ts` for
programmatic recoveries.

## Audit log queries (forensics)

```sql
-- Recent admin actions
SELECT created_at, user_id, action, resource_id, payload
  FROM audit_log
 WHERE action LIKE 'admin.%'
   AND created_at > now() - interval '24 hours'
 ORDER BY created_at DESC
 LIMIT 50;

-- Who approved a specific registration?
SELECT * FROM audit_log
 WHERE action = 'admin.registration.approve' AND resource_id = '<reg-id>';
```

## Roll back a release

```bash
git log --oneline -10           # find last good SHA
git checkout <sha>
cd backend && npm run build
cd ../web && npm run build
pm2 reload deploy/pm2.config.js
```

If a migration is the problem: roll forward with a corrective migration
rather than down-migrating, unless you really know what you're doing.

## Contact

- Backend / mobile: Mujtabo
- Web portals: TBD
- Eduversal product owner: TBD
- Legal / privacy issues: privacy@competzy.com (still TBD)
