# OIDC + Node.js/React Todo App

## Requirements
- Node v20+
- npm v9+

## Repos/Apps
- `api/` — NestJS API  OpenAPI at `/api/docs.json`
- `spa/` — Vite + React SPA

## Quickstart (local)

1. Install deps:
   ```bash
   npm install
    ```
   
2. Configure env files:

- Copy api/.env.example to api/.env

- Copy spa/.env.example to spa/.env

Replace values with the ones I provided you over email to the recruiter.

3. Run the API:
```bash
npm run dev:api
```
API should be present on http://localhost:3000

Docs: GET http://localhost:3000/api/docs.json

4. Run SPA (in another terminal):

```bash
npm run dev:spa
```
React SPA on http://localhost:5173

Test Users (example)

reader@example.com (roles: read)

writer@example.com (roles: read, write)

admin@example.com (roles: read, write, admin)

Password: 123

## Scripts
```bash
npm run dev:api 
```
— start API in dev
```bash
npm run dev:spa 
```
— start SPA dev server
```bash
npm test
```
— run API tests
