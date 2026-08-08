# SQLite to PostgreSQL Migration Guide

This guide walks you through migrating the Vote Rutherford application from SQLite/LibSQL to PostgreSQL.

## Overview

The migration involves:
1. Creating a PostgreSQL database and user
2. Updating Prisma configuration
3. Removing LibSQL dependencies
4. Migrating data from SQLite to PostgreSQL
5. Running Prisma migrations
6. Testing the application

## Prerequisites

Before starting, ensure you have:
- PostgreSQL installed and running (or remote access to a PostgreSQL server)
- `pgloader` installed for data migration
- Access to the current SQLite database file (default: `prod.db`)
- Node.js 22+ installed locally
- All current environment variables saved

### Install pgloader

**macOS:**
```bash
brew install pgloader
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install pgloader
```

**Docker (alternative):**
```bash
docker run --rm -v $(pwd):/data pgloader/pgloader pgloader /data/pgloader.load
```

## Migration Steps

### Step 1: Set Up PostgreSQL Database and User

Run the SQL setup script on your PostgreSQL server as a superuser:

```bash
psql -h jensenwebserver -p 5434 -U postgres -f scripts/setup-postgres.sql
```

**What this does:**
- Creates the `vote_rutherford_staging` database
- Creates a user `vote_rutherford_app` with CRUD permissions
- Grants proper privileges on all current and future tables

**Important**: Change the default password `change_me_to_a_strong_password` in the setup script before running it.

### Step 2: Update Dependencies

The codebase has already had LibSQL dependencies removed from `package.json`. Install the updated dependencies:

```bash
npm install
```

This removes:
- `@libsql/client`
- `@prisma/adapter-libsql`

### Step 3: Update Environment Variables

Update your `.env` file with the PostgreSQL connection string:

```bash
DATABASE_URL="postgresql://vote_rutherford_app:YOUR_PASSWORD@jensenwebserver:5434/vote_rutherford_staging"
```

Replace `YOUR_PASSWORD` with the actual password you set in Step 1.

Also remove these LibSQL-specific variables if they exist:
```bash
# REMOVE these lines:
# SYNC_URL=...
# AUTH_TOKEN=...
# SYNC_INTERVAL=...
```

### Step 4: Generate New Prisma Client

Generate the Prisma Client for PostgreSQL:

```bash
npm run prisma generate
```

Or using npx:
```bash
npx prisma generate
```

### Step 5: Migrate Data from SQLite to PostgreSQL

The migration script handles both Prisma schema creation and data migration automatically:

```bash
chmod +x scripts/migrate-to-postgres.sh
./scripts/migrate-to-postgres.sh ./prod.db jensenwebserver 5434 vote_rutherford_staging vote_rutherford_app
```

**What this does:**
1. **Creates PostgreSQL schema** using `prisma migrate deploy` - creates all tables, indexes, foreign keys
2. **Migrates data** from SQLite using pgloader with proper constraints handling
3. **Ensures data integrity** by disabling/enabling triggers during import
4. **Updates sequences** to proper values for auto-increment fields
5. **Verifies the migration** and shows status

**Required Permissions:**
The PostgreSQL user must have:
- `USAGE` on schema `public`
- `CREATE` on schema `public` (for Prisma migrations to create tables)
- `SELECT`, `INSERT`, `UPDATE`, `DELETE` on all tables
- `USAGE` on all sequences

The setup script (`scripts/setup-postgres.sql`) grants all necessary permissions.

**Output example:**
```
=== PostgreSQL Migration Starting ===

This script will:
  1. Create PostgreSQL schema using Prisma migrations
  2. Migrate all data from SQLite using pgloader
  3. Verify the migration

=== STEP 1: Creating PostgreSQL Schema with Prisma ===

[INFO] Running Prisma migrations to create schema...
✅ Prisma schema created successfully in PostgreSQL

=== STEP 2: Migrating Data with pgloader ===

[INFO] Starting data migration from SQLite to PostgreSQL...
...
[INFO] ✅ Data migration completed successfully!

=== STEP 3: Verifying Migration ===

[INFO] SQLite tables count: 20
[INFO] Migration Complete ✅
```

### Step 6: Verify Data Migration

Compare row counts between SQLite and PostgreSQL to ensure all data was migrated:

**SQLite:**
```bash
sqlite3 prod.db "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'voter_addresses_fts%';" | while read table; do echo "$table: $(sqlite3 prod.db "SELECT COUNT(*) FROM $table")"; done
```

**PostgreSQL:**
```bash
psql -h jensenwebserver -p 5434 -U vote_rutherford_app -d vote_rutherford_staging -c "
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
" | tail -n +3 | while read table; do
  echo "$table: $(psql -h jensenwebserver -p 5434 -U vote_rutherford_app -d vote_rutherford_staging -t -c "SELECT COUNT(*) FROM \"$table\"")"
done
```

### Step 7: Verify Application Works

Test the application with PostgreSQL:

```bash
npm run dev
```

Test key functionality:
- [ ] Elections page loads
- [ ] Races display correctly
- [ ] Candidate profiles display
- [ ] Admin panel can create/edit data
- [ ] Search functionality works
- [ ] Email outreach workers start without errors

### Step 8: Deploy Changes

Update your deployment configuration:

**Docker:**
```bash
docker-compose up --build
```

**PM2/Production:**
```bash
# Update .env with correct PostgreSQL connection string
pm2 restart ecosystem.config.cjs
```

## Troubleshooting

### Connection Refused
```
Error: connect ECONNREFUSED [PostgreSQL host]
```
**Solution**: Check PostgreSQL is running and accessible at the specified host/port.

### Authentication Failed
```
Error: FATAL: password authentication failed for user "vote_rutherford_app"
```
**Solution**: Verify the password in your `.env` DATABASE_URL matches what was set in the SQL setup script.

### pgloader: Command not found
```
pgloader: command not found
```
**Solution**: Install pgloader using the appropriate method for your OS (see Prerequisites).

### Foreign Key Constraint Violations
```
ERROR: insert or update on table "candidates" violates foreign key constraint
```
**Solution**: The migration script disables triggers before import. If this occurs, pgloader may have encountered an issue. Check that all referenced data exists.

### Sequences Out of Sync
```
Error: duplicate key value violates unique constraint
```
**Solution**: The migration script updates sequences. If errors persist, manually reset:
```sql
SELECT pg_catalog.setval('tablename_id_seq', (SELECT MAX(id) FROM tablename));
```

## Rollback (if needed)

If you need to rollback to SQLite:

1. Restore your SQLite backup
2. Revert `.env` DATABASE_URL to SQLite
3. Revert Prisma provider to "sqlite" in `prisma/schema.prisma`
4. Reinstall LibSQL packages: `npm install @libsql/client @prisma/adapter-libsql`
5. Regenerate Prisma Client: `npx prisma generate`

## Performance Considerations

PostgreSQL provides better performance for Vote Rutherford's workload:

- **Concurrent Connections**: PostgreSQL handles multiple application instances better than SQLite
- **FTS Queries**: PostgreSQL's built-in full-text search is more performant (though we use Meilisearch)
- **Large Datasets**: The voter address lookup scales better with PostgreSQL
- **Production Ready**: Easier backup, replication, and monitoring

## Next Steps

1. **Backup**: Keep your SQLite database as backup for 1-2 weeks
2. **Monitor**: Watch application logs for any issues during the first 24 hours
3. **Archive**: After verification, you can delete the SQLite database file
4. **Cleanup**: Update CI/CD and documentation to reflect PostgreSQL

## Support

If you encounter issues:
1. Check the Troubleshooting section above
2. Review Prisma PostgreSQL documentation: https://www.prisma.io/docs/orm/overview/databases/postgresql
3. Check pgloader documentation: https://pgloader.io/docs/index.html
