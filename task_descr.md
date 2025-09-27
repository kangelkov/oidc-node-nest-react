### OIDC + Node.js/React Assessment — Candidate Instructions

Build a small system that includes an API and a React SPA integrated with an OpenID Connect provider (Keycloak) using the metadata and test users provided to you.

Estimated time: 4 hours. Use TypeScript for both API and SPA.

You may organize your solution as a small monorepo:
- `api/` — Node.js API (Express/Fastify/Nest) in TypeScript
- `spa/` — React (Vite/Next) in TypeScript

You are provided:
- Issuer URL and metadata: `.well-known/openid-configuration`, `jwks_uri`, `authorization_endpoint`, `token_endpoint`, `end_session_endpoint`, `userinfo_endpoint`
- SPA client: `client_id`, allowed redirect/logout URIs (public client with PKCE)
- API audience or resource identifier expected in tokens
- Test user credentials and their roles

Example (for local testing; replace with the values provided to you):
```
OIDC_ISSUER=https://demo.point-iam.com/auth/realms/interview
OIDC_OPENID_CONFIG=https://demo.point-iam.com/auth/realms/interview/.well-known/openid-configuration
OIDC_JWKS_URI=https://demo.point-iam.com/auth/realms/interview/protocol/openid-connect/certs
SPA_CLIENT_ID=react-app
SPA_REDIRECT_URI=http://localhost:5173/callback
SPA_LOGOUT_REDIRECT_URI=http://localhost:5173/
API_CLIENT_ID=api-client
API_CLIENT_SECRET=wMrrPv1Yvk5njziGx5ZIVVaJhN4JGI3g
```

You are provided 2–3 test users, for example:
- `reader@example.com` (roles: read)
- `writer@example.com` (roles: read, write)
- `admin@example.com` (roles: read, write, admin)

Password for all users is "123".

Use discovery, JWKS validation, roles in tokens, and the userinfo endpoint when required.

---

### Task 1: REST API Development (Unauthenticated)

Build a minimal Todo API.

- Requirements
  - Node.js API with TypeScript (You can use any framework)
  - Endpoints:
    - `GET /api/health` → `{ status: "ok" }`
    - `GET /api/todos` → list todos
    - `POST /api/todos` → create todo
    - `PATCH /api/todos/:id` → update `title`, `completed`
    - `DELETE /api/todos/:id` → delete todo
  - Model: `{ id: string, title: string, completed: boolean, ownerId?: string }`
  - Persistence: in-memory is OK; SQLite/Postgres via Docker is a plus.
  - OpenAPI JSON at `GET /api/docs.json` (Swagger acceptable).
  - Validation with proper status codes: `400` (validation), `404` (not found).
  - Tests: unit tests for services; API tests for happy/error paths.

- I/O Examples
  - Create request: `{ "title": "Buy milk" }`
  - Create response: `201 { "id": "...", "title": "Buy milk", "completed": false }`
  - Validation error: `400 { "error": "title is required" }`
  - Not found: `404 { "error": "not_found" }`

- Verification
  - `GET /api/health` returns 200.
  - CRUD works per spec with correct status codes.
  - `GET /api/docs.json` returns OpenAPI.
  - `npm test` (or `pnpm test`) passes.

---

### Task 2: Secure API and SPA with OIDC (Auth Code + PKCE)

Integrate the React SPA with the provided Keycloak realm using Authorization Code + PKCE, and secure the API.

- Frontend (React, TypeScript)
  - Implement login using the provided issuer and `client_id`.
  - After login, display:
    - ID Token claims (`sub`, `email` if present)
    - Access Token expiry (countdown or timestamp)
    - Roles/permissions found in the Access Token
  - Call the API with `Authorization: Bearer <access_token>` to:
    - List, create, update, delete todos
  - Token renewal:
    - If refresh tokens are provided, use refresh flow.
    - Otherwise, implement silent re-auth (`prompt=none`) or SDK equivalent.
  - Store tokens in memory (avoid localStorage).

- Backend (Node, TypeScript)
  - Require Bearer JWT for all `/api/todos*` routes.
  - Validate JWT using JWKS from discovery:
    - Verify signature by `kid`/`alg` (RS256), cache keys, and support rotation.
    - Validate `iss`, `aud` (or resource), `exp`, and `nbf` if present.
  - Authorization via roles in the token:
    - realm roles at `realm_access.roles` (e.g., `read`, `write`, `admin`).
  - Route policy:
    - `GET /api/todos` → require `read`
    - `POST|PATCH|DELETE /api/todos*` → require `write`
  - Ownership rule (if you implement `ownerId`): only the creator (`sub`) can modify or delete.
  - Return `401` for missing/invalid token; `403` for insufficient role.

- Verification
  - Unauthenticated `GET /api/todos` → `401`.
  - Reader cannot `POST/PATCH/DELETE` (→ `403`).
  - Writer can mutate todos.
  - SPA shows claims and tokens; CRUD works after login.

---

### Task 3: RP‑Initiated Logout + Clean Post‑Logout State

Add a logout flow that ends the user session at the identity provider and returns the app to a clean, logged‑out state.

- SPA (React, TypeScript)
  - Add a "Logout" button that performs RP‑initiated logout via the provider's `end_session_endpoint`.
  - Include `id_token_hint` (the current ID token) and `post_logout_redirect_uri` (your SPA URL).
  - After redirect back to the SPA, clear all in‑memory auth state so the UI shows "logged out" and no tokens remain in memory.
  - Any API calls made in this state must fail with `401`, and the UI should surface a friendly message.

---

### Deliverables

- Code
  - API: JWT validation with JWKS caching, RBAC, OpenAPI at `/api/docs.json`.
  - SPA: PKCE login, claims display, token renewal, RP‑logout, CRUD UI.
- Tests (Plus)
  - API: unit + integration for authN/authZ, error paths.
  - Optional e2e happy path.
- Docs (`README.md` in your project root)
  - Setup with env vars, run commands, ports, and any assumptions.
  - Test users and their expected access (as provided to you).

---

### Submission

- Provide a Git repository or archive containing `api/`, `spa/`, and this `README.md`.
- Include sample `.env.example` files for both API and SPA.
- Include any seed data and notes about supported Node.js version.
- Add instructions to run the projects
