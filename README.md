# Vote Rutherford

A modern voting information platform and candidate outreach system for Rutherford County, built with Astro 5, Prisma 7, LibSQL, and Tailwind CSS 4.

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
- **Database**: LibSQL / SQLite with Prisma 7 ORM
- **Styling**: Tailwind CSS 4
- **Background Jobs**: BullMQ and IORedis
- **Search**: SQLite FTS / Meilisearch (optional)
- **Deployment**: Docker with PM2 (clustering & worker management)
- **External Services**: Cloudflare (R2, Caching), Google APIs (OAuth, Gmail), Firebase (Admin/Auth)

## Development Setup

### Prerequisites

- **Node.js**: 22+
- **Redis**: Required for background email workers
- **LibSQL/SQLite**: Local files used by default

### Local Installation

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment**

   ```bash
   cp .env.example .env
   # Update .env with your local Redis and database paths
   ```

3. **Database Preparation**

   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

4. **Seed Database (optional)**

   ```bash
   npx tsx prisma/seed.ts
   ```

5. **Start Development Servers**

   ```bash
   # Start the Astro development portal
   npm run dev

   # Start the email background worker (separate terminal)
   npx tsx src/lib/jobs/emailWorker.ts
   ```

## Docker Development

The included `docker-compose.yml` starts the application in development mode.

```bash
docker-compose up
```

## Available Commands

| Command                               | Action                                     |
| :------------------------------------ | :----------------------------------------- |
| `npm run dev`                         | Start Astro dev server at `localhost:4321` |
| `npm run build`                       | Build production site to `./dist/`         |
| `npm run preview`                     | Preview production build locally           |
| `npx prisma studio`                   | Open Prisma Studio GUI                     |
| `npx prisma migrate dev`              | Create and apply new migrations            |
| `npx tsx src/lib/jobs/emailWorker.ts` | Start the background email worker locally  |
| `npm run import:addresses`            | Parse and import voter address data        |

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
