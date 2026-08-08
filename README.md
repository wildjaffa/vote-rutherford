# Vote Rutherford

A modern voting information platform and candidate outreach system for Rutherford County, built with Astro 5, Prisma 7, PostgreSQL, and Tailwind CSS 4.

This application provides comprehensive information about elections, races, and candidates, and includes internal tools for managing candidate responses and automated outreach.

## Features

- **Candidate Database**: Comprehensive tracking of elections, races, and candidate profiles.
- **Candidate Policy Responses**: Support for multi-question policy surveys with markdown formatting and versioned responses.
- **Candidate Outreach**: Automated email outreach system using BullMQ, Redis, and Google OAuth.
- **Voter Address Search**: Advanced Full-Text Search (FTS5) for Rutherford County addresses, supporting thousands of records for precinct-based candidate filtering.
- **Admin Portal**: Secure management interface for all election data, integrated with Firebase Authentication.
- **Image Hosting**: Integration with Cloudflare R2 for candidate and election imagery.
- **Performance**: Edge-ready caching with Cloudflare-compatible middleware and localized DB syncing via LibSQL (Turso).

## Tech Stack

- **Framework**: Astro 5 (Hybrid SSR)
- **Database**: PostgreSQL with Prisma 7 ORM
- **Styling**: Tailwind CSS 4
- **Background Jobs**: BullMQ and IORedis
- **Search**: Meilisearch
- **Deployment**: Docker with PM2 (clustering & worker management)
- **External Services**: Cloudflare (R2, Caching), Google APIs (OAuth, Gmail), Firebase (Admin/Auth)

## Development Setup

### Prerequisites

- **Node.js**: 22+
- **PostgreSQL**: 14+ (local or remote)
- **Redis**: Required for background email workers

### Local Installation

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment**

   ```bash
   cp .env.example .env
   # Update .env with your PostgreSQL connection string and other variables
   DATABASE_URL="postgresql://user:password@localhost:5432/vote_rutherford_staging"
   ```

3. **Set Up PostgreSQL**

   Ensure PostgreSQL is running:
   
   **Option A: Local PostgreSQL**
   ```bash
   # macOS with Homebrew
   brew install postgresql
   brew services start postgresql
   
   # Linux
   sudo systemctl start postgresql
   ```
   
   **Option B: Docker PostgreSQL**
   ```bash
   docker run -d --name postgres -p 5432:5432 \
     -e POSTGRES_PASSWORD=postgres \
     postgres:16-alpine
   ```

4. **Database Setup**

   ```bash
   npx prisma generate
   npx prisma migrate deploy
   npx prisma db seed  # optional: seed sample data
   ```

5. **Start Redis**

   If you don't already have Redis running locally, start it with Docker:

   ```bash
   docker run -d --name vote-rutherford-redis -p 6379:6379 redis:7-alpine
   ```

   Or, if using Docker Compose:

   ```bash
   docker-compose up -d redis
   ```

6. **Start Development Servers**

   ```bash
   # Start the Astro development portal
   npm run dev

   # Start the email background worker (separate terminal)
   npx tsx src/lib/jobs/emailWorker.ts
   
   # Start the district import worker (separate terminal)
   npx tsx src/lib/jobs/districtImportWorker.ts
   ```

   Or run all together:
   ```bash
   npm run dev:all
   ```

## Migrating from SQLite to PostgreSQL

If you're migrating from SQLite, see [POSTGRES_MIGRATION.md](docs/POSTGRES_MIGRATION.md) for detailed migration instructions.

## Docker Development

The included `docker-compose.yml` starts the application in development mode.

```bash
docker-compose up
```

## Available Commands

| Command                               | Action                                                              |
| :------------------------------------ | :------------------------------------------------------------------ |
| `npm run dev`                         | Start Astro dev server at `localhost:4321`                          |
| `npm run build`                       | Build production site to `./dist/`                                  |
| `npm run preview`                     | Preview production build locally                                    |
| `npx prisma studio`                   | Open Prisma Studio GUI                                              |
| `npx prisma migrate dev`              | Create and apply new migrations                                     |
| `npx tsx src/lib/jobs/emailWorker.ts` | Start the background email worker locally                           |
| `npm run worker:email`                | Start the background email worker locally                           |
| `npm run worker:district-import`      | Start the background district import worker locally                 |
| `npm run dev:all`                     | Start Astro + email worker + district import worker in one terminal |
| `npm run import:addresses`            | Parse and import voter address data                                 |

## Project Structure

```
/
├── prisma/
│   ├── schema.prisma          # Database schema (LibSQL/SQLite)
│   ├── auditExtension.ts      # Custom Prisma extension for audit logging
│   └── seed.ts                # Database seeding script
├── src/
│   ├── actions/               # Astro Actions (Contact forms, Admin tasks)
│   ├── components/            # Astro & UI components
│   ├── firebase/              # Server-side Firebase Admin setup
│   ├── layouts/               # Page layouts
│   ├── lib/
│   │   ├── jobs/              # BullMQ Producers and Workers (Email)
│   │   ├── services/          # Core business logic (Email, Candidates, Search)
│   │   └── prisma.ts          # Lazily initialized Prisma Client
│   ├── pages/
│   │   ├── admin/             # Restricted administrative portal
│   │   ├── api/               # Server-side API endpoints
│   │   └── elections/         # Public-facing election pages
│   └── middleware.ts          # Auth and Cache-Control logic
├── voter-data-parsing/        # Tooling for processing TN voter GIS data
├── Dockerfile                 # Multi-stage production build
├── ecosystem.config.cjs       # PM2 configuration for process clustering
└── astro.config.mjs           # Astro configuration
```

## Production Deployment

The application is designed to be deployed as a Docker container managed by PM2.

1. **Build the image**:

   ```bash
   docker build -t vote-rutherford .
   ```

2. **Run the container**:
   Ensure environment variables for `DATABASE_URL`, `REDIS_URL`, and Cloudflare/Firebase credentials are provided.

3. **PM2 Management**:
   The container starts `entrypoint.sh` which launches PM2 using `ecosystem.config.cjs`. This manages:
   - Astro SSR Server (clustered)
   - Email Background Worker (singleton)

## License

See [LICENSE](LICENSE) file for details.
