# Vote Rutherford

A modern voting information platform built with Astro, Prisma, and PostgreSQL. This application provides comprehensive information about elections, races, and candidates to help voters make informed decisions.

## Features

- **Hybrid Rendering**: Static site generation with server-side rendering for dynamic content
- **Content Collections**: Astro content collections backed by Prisma for efficient data management
- **Database-Driven**: PostgreSQL database with Prisma ORM
- **Docker Support**: Full Docker development and production environments
- **Modern Stack**: Astro 5, TypeScript, Tailwind CSS 4, and Prisma

## Quick Start with Docker

The fastest way to get started is using Docker Compose:

```bash
# Clone the repository
git clone <repository-url>
cd vote-rutherford

# Start the application and database
docker-compose up

# The application will be available at http://localhost:4321
```

This will:

- Start a PostgreSQL database
- Run database migrations
- Start the Astro development server with hot-reload
- Seed the database with sample data (on first run)

## Development Setup

### Prerequisites

- Docker and Docker Compose (recommended)
- **OR** Node.js 20+ and PostgreSQL 16+ (for local development)

### Option 1: Docker Development (Recommended)

```bash
# Start all services
docker-compose up

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down

# Reset database (removes all data)
docker-compose down -v
```

### Option 2: Local Development

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Start PostgreSQL**

   ```bash
   # Using Docker for just the database
   docker-compose up database -d

   # OR use your local PostgreSQL installation
   ```

4. **Run database migrations**

   ```bash
   npx prisma migrate deploy
   ```

5. **Generate Prisma Client**

   ```bash
   npx prisma generate
   ```

6. **Seed the database (optional)**

   ```bash
   npx tsx -r dotenv/config prisma/seed.ts
   ```

7. **Start development server**
   ```bash
   npm run dev
   ```

## Available Commands

| Command                  | Action                               |
| :----------------------- | :----------------------------------- |
| `npm install`            | Install dependencies                 |
| `npm run dev`            | Start dev server at `localhost:4321` |
| `npm run build`          | Build production site to `./dist/`   |
| `npm run preview`        | Preview production build locally     |
| `npx prisma studio`      | Open Prisma Studio to view/edit data |
| `npx prisma migrate dev` | Create and apply new migration       |
| `npx prisma generate`    | Generate Prisma Client               |

## Docker Commands

### Development

```bash
# Start development environment
docker-compose up

# Rebuild after dependency changes
docker-compose up --build

# Run Prisma commands in container
docker-compose exec app npx prisma studio
docker-compose exec app npx prisma migrate dev

# Access database directly
docker-compose exec database psql -U username -d default_database

# Seed the database
docker-compose exec app npx tsx -r dotenv/config prisma/seed.ts
```

### Production

```bash
# Build and start production environment
docker-compose -f docker-compose.prod.yml up --build

# Run in background
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop production environment
docker-compose -f docker-compose.prod.yml down
```

## Project Structure

```
/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Database seeding script
├── src/
│   ├── components/            # Astro components
│   ├── content/
│   │   └── config.ts          # Content collections configuration
│   ├── layouts/               # Page layouts
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client instance
│   │   └── types.ts           # TypeScript types
│   ├── pages/
│   │   ├── api/               # API endpoints
│   │   └── elections/         # Election pages
│   └── styles/                # Global styles
├── docker-compose.yml         # Development Docker setup
├── docker-compose.prod.yml    # Production Docker setup
├── Dockerfile                 # Production Dockerfile
├── Dockerfile.dev             # Development Dockerfile
└── astro.config.mjs           # Astro configuration
```

## Database Management

### Migrations

```bash
# Create a new migration
npx prisma migrate dev --name description_of_changes

# Apply migrations in production
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Prisma Studio

Access the database GUI:

```bash
# Local development
npx prisma studio

# Docker development
docker-compose exec app npx prisma studio
```

## Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/default_database?schema=public"
```

For Docker, these are configured in `docker-compose.yml`.

## Troubleshooting

### Port Already in Use

If port 4321 or 5432 is already in use:

```bash
# Change ports in docker-compose.yml
# For app: "3000:4321" (access at localhost:3000)
# For database: "5433:5432" (update DATABASE_URL accordingly)
```

### Database Connection Issues

```bash
# Check database is running
docker-compose ps

# View database logs
docker-compose logs database

# Restart database
docker-compose restart database
```

### Hot Reload Not Working

```bash
# Rebuild the development container
docker-compose up --build

# Ensure volumes are mounted correctly in docker-compose.yml
```

### Prisma Client Out of Sync

```bash
# Regenerate Prisma Client
npx prisma generate

# In Docker
docker-compose exec app npx prisma generate
```

## Production Deployment

1. **Build the Docker image**

   ```bash
   docker build -t vote-rutherford:latest .
   ```

2. **Run with production compose**

   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Set environment variables** for your production environment

4. **Run migrations**
   ```bash
   docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
   ```

## Contributing

1. Create a feature branch
2. Make your changes
3. Create a migration if database changes are needed
4. Test with Docker: `docker-compose up --build`
5. Submit a pull request

## License

See [LICENSE](LICENSE) file for details.
