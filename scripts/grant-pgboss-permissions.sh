#!/usr/bin/env bash
# grant-pgboss-permissions.sh
#
# Grants the app database user the privileges needed for pg-boss to create
# and manage its own `pgboss` schema. Run this once per environment as a
# Postgres superuser (e.g. `postgres`).
#
# Usage:
#   bash scripts/grant-pgboss-permissions.sh [path/to/.env]
#
# The script reads DATABASE_URL from the .env file (default: .env in the
# current directory) and connects as the `postgres` superuser.

set -euo pipefail

ENV_FILE="${1:-.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌  Could not find env file: $ENV_FILE"
  exit 1
fi

# Extract DATABASE_URL from the env file (handles optional surrounding quotes)
DB_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if [[ -z "$DB_URL" ]]; then
  echo "❌  DATABASE_URL not found in $ENV_FILE"
  exit 1
fi

# Parse the connection URL: postgresql://user:password@host:port/dbname
# Strip the scheme
STRIPPED="${DB_URL#postgresql://}"
STRIPPED="${STRIPPED#postgres://}"

# Extract user (and optional password)
USERINFO="${STRIPPED%%@*}"
APP_USER="${USERINFO%%:*}"

# Extract host:port/dbname
HOSTDB="${STRIPPED#*@}"
HOST="${HOSTDB%%/*}"
DB_NAME="${HOSTDB#*/}"
# Strip any query params from dbname
DB_NAME="${DB_NAME%%\?*}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  pg-boss permission grant"
echo "  Database : $DB_NAME"
echo "  App user : $APP_USER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Connecting as 'postgres' superuser. You may be prompted for a password."
echo ""

psql -h "${HOST%%:*}" -U postgres -d "$DB_NAME" <<SQL
-- Allow the app user to create new schemas (required for pg-boss to set up
-- its own 'pgboss' schema on first start).
GRANT CREATE ON DATABASE "$DB_NAME" TO "$APP_USER";

-- If the pgboss schema already exists (e.g. from a previous partial run),
-- make sure the app user owns it and has full access.
DO \$\$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'pgboss') THEN
    EXECUTE 'ALTER SCHEMA pgboss OWNER TO "$APP_USER"';
    EXECUTE 'GRANT ALL PRIVILEGES ON SCHEMA pgboss TO "$APP_USER"';
    EXECUTE 'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA pgboss TO "$APP_USER"';
    EXECUTE 'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA pgboss TO "$APP_USER"';
    RAISE NOTICE 'Existing pgboss schema ownership transferred to $APP_USER';
  ELSE
    RAISE NOTICE 'pgboss schema does not exist yet — pg-boss will create it on first start';
  END IF;
END
\$\$;

SELECT 'Done! $APP_USER can now manage the pgboss schema in $DB_NAME.' AS result;
SQL

echo ""
echo "✅  Permissions granted. You can now start the email worker."
