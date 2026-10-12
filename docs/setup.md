# Setup

## Prerequisites

Install:

- Node.js 22 or a compatible modern LTS release.
- Yarn `1.22.22`.
- [Ollama](https://ollama.com/).
- [Podman](https://podman.io/) or another way to run PostgreSQL with pgvector.

Verify the tools:

```bash
node --version
yarn --version
ollama --version
podman --version
```

## Ollama Models

Make sure Ollama is running, then download the required models:

```bash
ollama pull qwen3:4b
ollama pull qwen3-embedding:0.6b
ollama list
```

Ollama normally runs at `http://localhost:11434`.

## PostgreSQL and pgvector

From the repository root, start the local database:

```bash
podman-compose -f podman-compose.local.yml up -d
```

The local configuration maps host port `5433` to PostgreSQL port `5432` in the container.

| Setting | Local value |
|---|---|
| Host | `localhost` |
| Port | `5433` |
| Database | `documindDB` |
| Username | `documind` |
| Password | Your local `.env` value |

The database volume must remain intact to preserve documents, chunks, and embeddings.

## Backend

```bash
cd backend
yarn install
```

Create `backend/.env`:

```dotenv
DB_HOST=localhost
DB_PORT=5433
DB_NAME=documindDB
DB_USER=documind
DB_PASSWORD=your_local_password
```

Run migrations and start NestJS:

```bash
yarn migration:run
yarn start:dev
```

The backend listens on port `3001`.

## Frontend

In a second terminal:

```bash
cd frontend
yarn install
```

Create `frontend/.env`:

```dotenv
VITE_API_URL=http://localhost:3001
```

Start Vite:

```bash
yarn dev
```

Open the URL printed by Vite, usually `http://localhost:5173`.

The backend CORS configuration must allow the frontend origin:

```typescript
app.enableCors({
  origin: 'http://localhost:5173',
});
```

Restart the relevant server after changing environment variables.

## Scripts

### Backend

| Command | Purpose |
|---|---|
| `yarn start:dev` | Start NestJS in watch mode |
| `yarn build` | Compile the backend |
| `yarn migration:run` | Apply pending migrations |
| `yarn migration:generate` | Generate a migration |
| `yarn migration:revert` | Revert the last migration |
| `yarn test` | Run backend tests |
| `yarn lint` | Run backend ESLint |

### Frontend

| Command | Purpose |
|---|---|
| `yarn dev` | Start Vite |
| `yarn build` | Build the frontend |
| `yarn lint` | Run frontend ESLint |
| `yarn preview` | Preview the production build |

Review generated migrations before applying them. Do not use automatic schema synchronization as a replacement for migrations.
