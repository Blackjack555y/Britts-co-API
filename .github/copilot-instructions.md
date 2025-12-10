# Copilot Project Instructions

Purpose: Fast orientation for AI agents contributing to this Node.js Express + MySQL backend used for forms, downloads, and simple auth.

## Architecture & Data Flow
- Entry point: `server.js` sets up Express 5, JSON/urlencoded parsing, CORS, Multer for uploads, and mounts feature routers.
- Routers / features:
  - Form + contact email handling (inline in `server.js`) using `nodemailer` with SMTP env vars (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_TO`).
  - Requerimientos API: mounted at `/api/requerimientosdb` from `requerimientosdb.js` (POST create, GET list/group). Persists into MySQL table `DBW00002` with columns: `Requerimiento, Correo, Asunto, Tipo, Solucion, Programa, Version, Detalle, Contacto, Estado` (Estado CHAR(1) default 'R'). GET groups by `Solucion` and returns `estado` in items.
  - Descargas API: `descargas.js` mounted at root; endpoint `/descargas/:codigo` queries table `DBW00001` returning grouped solution assets (fields aliased: solucion, nombre, imagen, programa, manual).
  - Anuncios API: mounted at `/api/anuncios` from `anuncios.js`. Uses table `DBW00003` for site banner announcements.
    - GET `/api/anuncios/activo` → returns the most recently updated active row within time window, or 204 when none.
    - GET `/api/anuncios` → list ordered by `updated_at` desc.
    - POST `/api/anuncios` and PATCH `/api/anuncios/:id` → basic JSON admin endpoints (no auth yet).
  - Login: POST `/api/login` uses in‑memory user definitions in `login.js` whose credentials resolve from environment variables (`USER_*`, `PASS_*`). Returns `{success,codigo,nombre}`.
- Database access centralized in `db.js` via a MySQL connection pool and exported `query(sql, params, cb)` wrapper adding verbose logging and always releasing connections.
- File uploads: Multer disk storage. General form uploads go to `uploads/`. Requerimientos file uploads go to `uploads/requerimientos` (directory auto-created if missing). Filtration allows only `.jpg,.jpeg,.png,.pdf` for requerimientos.
- Generated codes: `generarCodigoRequerimiento()` pattern: `BRTYYMMDDXXX` appears in multiple modules—prefer a shared util if reused.
## Frontend integration notes
- Static site pages call this API from JS. Notable integrations:
  - Contacto: POST `FormData` to `/api/contacto`; expects `{ message }`.
  - Requerimientos: POST `FormData` to `/api/formulario`; expects `{ message, codigo }`.
  - Banner: Frontend fetches `/api/anuncios/activo`; expects 200 JSON `{ id, activo, tipo, titulo?, mensaje, link_url?, dismissible }` or 204 No Content.

## Conventions & Patterns
- Spanish field and variable naming (e.g., `solucion`, `requerimiento`, `detalle`). Keep naming consistent; do not anglicize existing API fields.
- Logging uses emojis to differentiate stages (📦 pool, 🔌 connection, ✅ success, ❌ errors, 📤 insert, 📡 query). Preserve or extend this style when adding similar diagnostics.
- Responses: Success for creation returns `{ success: true, mensaje, codigo }`. Errors generally return `{ error: <mensaje> }` or `{ success:false, error }` for auth. Follow these shapes for new endpoints.
- Grouping: GET requerimientos groups results by `Solución` value into an object keyed by solution; GET descargas groups by `solucion`. Mirror this grouping approach for similar list endpoints.
- Environment-based credentials only; no DB-stored users currently. Avoid adding plaintext credentials in code.

## Environment Variables (expected)
DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_TO
USER_AA1681, PASS_AA1681, USER_AA1832, PASS_AA1832, USER_AD3235, PASS_AD3235, USER_ZZ2006, PASS_ZZ2006
PORT (optional)

## Adding New Endpoints (Example)
- Use a router file; require and mount in `server.js` after middleware.
- Use the shared `db.query` for database ops; always provide parameter array to avoid SQL injection.
- Follow response shapes above and include emoji logging for actions and errors.
- If accepting uploads, mirror `multer` pattern and restrict extensions explicitly.

Example skeleton:
```js
# Copilot Instructions (backend + frontend contract)

Purpose: Quick orientation for AI agents working on this Node.js Express + MySQL API and the static frontend that consumes it.

## Architecture
- Entry: `server.js` (Express 5, CORS, JSON/urlencoded, Multer `uploads/`).
- Routers/features:
  - Requerimientos DB API: `app.use('/api/requerimientosdb', require('./requerimientosdb'))` → table `DBW00002` (cols: Requerimiento, Correo, Asunto, Tipo, Solucion, Programa, Version, Detalle, Contacto, Estado CHAR(1) default 'R'). GET groups by `Solucion` and includes `estado`.
  - Formulario/Contacto emails: inline in `server.js` with Nodemailer (SMTP envs).
  - Descargas: `app.use('/', require('./descargas'))` → `GET /descargas/:codigo` (groups by `solucion`) from `DBW00001`.
  - Anuncios (banner): `app.use('/api/anuncios', require('./anuncios'))` → table `DBW00003`.

## Frontend integration
- Static pages at repo root; CSS in `css/`, JS in `javascript/`.
- Requerimientos: pages use `#loader-overlay`, form `#formularioRequerimiento`; JS posts `FormData` to `POST /api/requerimientosdb` and shows `{ codigo }` in `#codigoRequerimiento` / success in `#mensajeExito`.
- Contacto: `POST /api/contacto` with `FormData { nombre, email, asunto, mensaje }` → expects `{ message }`.
- Announcements banner: `GET /api/anuncios/activo` → 200 `{ id, activo, tipo: 'info'|'success'|'warning'|'danger', titulo?, mensaje, link_url?, dismissible }` or 204 (no body). Per‑page opt‑out supported via meta/body/window flags in frontend.
 - Announcements banner: `GET /api/anuncios/activo` → 200 `{ id, activo, tipo, titulo?, mensaje, link_url?, dismissible, starts_at, ends_at, include_pages?, exclude_pages? }` or 204. Per‑page opt‑out supported (meta/body/window flags). Targeting rules: if `include_pages` is non‑empty, show only on those filenames; otherwise, hide on any in `exclude_pages`.

## API contracts (summary)
- POST `/api/requerimientosdb` ← FormData `{ email, asunto, tipo, solucion, programa, version, detalle, contacto }` → `{ success, mensaje, codigo }`. INSERT omits `Estado` to use default 'R'.
- GET  `/api/requerimientosdb` → object grouped by `Solucion`, items include `estado`.
- POST `/api/contacto` ← FormData → `{ message }`.
- GET  `/api/anuncios/activo` → active banner or 204; GET `/api/anuncios` → list; POST/PATCH `/api/anuncios` → admin (no auth yet). All include/return `starts_at`, `ends_at`, `include_pages`, `exclude_pages`.
- GET  `/descargas/:codigo` → grouped by `solucion`.

## Conventions
- Spanish naming for fields/JSON. Keep response shapes stable.
- Logging with emojis: 📦 pool, 🔌 connection, 📤 insert/📡 query, ✅ ok, ❌ error.
- Multer uploads: `uploads/` and `uploads/requerimientos`; only `.jpg,.jpeg,.png,.pdf` allowed for requerimientos.
- Code generator: `generarCodigoRequerimiento()` → `BRTYYMMDDXXX` (consider shared util if reused).

## Env & run
- Env: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME; SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_TO; optional `PORT`; login envs (`USER_*`/`PASS_*`) if using `login.js`.
- Run: `npm install` then `npm start` (node server.js). Use a local web server for the static site (avoid `file://`).
 - DB migration: `npm run migrate:anuncios` adds `include_pages`/`exclude_pages` columns to `DBW00003` (idempotent).

## Safety
- Always parameterize queries via `db.query`. Connections auto‑released.
- Avoid table aliases in INSERT (MySQL parse error). Rely on DB defaults (e.g., `Estado` = 'R').
- Don’t log secrets; preserve current emoji logging style.
