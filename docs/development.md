# Development

Tekne is a full stack application written with a React (tanstack-router + vite) frontend,
NodeJS+express backend, and postgres as the database.

## Running

Tekne has a few different development "modes" for trading off convenience vs. fidelity to a
production environment.

The default and recommended way of developing is with 

> pnpm run dev:client-only 

This will run a frontend-only version with TRPC and postgres (via pglite) in the browser.

Some features (currently only hooks) require a full server and it's also helpful to debug issues
with deploying to production. In which case you can run

> pnpm run dev:client-with-server

To run a postgres database (via `docker-compose.yml`), the server and client all at once.

## Deploying and running database migrations

There's currently a very Docker image based on Alpine that can be used to deploy the application to
production. The only required environment variable you'll need to set in that case is `DATABASE_URL`
to a postgres database URL (see `package.json` for an example)
