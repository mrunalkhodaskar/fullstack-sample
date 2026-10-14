# React + Spring Boot orders app with JWT authentication

## Order management

- Orders belong to the authenticated account. Listing, editing, status changes, and deletion are scoped to the signed-in user's email.
- Create orders with `POST /api/orders`; edit product details with `PUT /api/orders/{id}`.
- Change status with `PATCH /api/orders/{id}/status` using one of `CREATED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, or `CANCELLED`.
- Delete an order with `DELETE /api/orders/{id}`. An order owned by another account is returned as not found.
- Optional order notes (up to 500 characters) are accepted on create/update and returned with created/updated timestamps.
- The dashboard shows the order notes plus its creation and last-updated timestamps; historical rows without timestamps display them as unavailable.
- `GET /api/orders?page=0&size=10&sort=newest&status=CREATED&search=keyboard` returns an owner-scoped, database-paginated result. Page sizes are limited to 1–100.
- `PATCH /api/orders/bulk/status` updates 1–100 selected orders atomically; `DELETE /api/orders/bulk` deletes 1–100 selected orders atomically. Both operations are scoped to the signed-in account and fail if any requested order is not owned by it.
- `GET /api/orders/report?startDate=2026-01-01&endDate=2026-01-31` returns owner-scoped totals and a status breakdown for the inclusive UTC date range.
- Orders can be selected from the current page and updated or deleted in bulk. Bulk requests accept up to 100 order IDs and do not partially apply when an ID is missing or belongs to another account.
- The dashboard can search by product, order ID, or status; filter by status; sort by order ID, product, or order value; paginate server-side; select orders for bulk actions; and export all matching results to CSV.
- The report dashboard lets users select a date range and shows order, unit, revenue, and status totals for that period.

## Products and inventory

- Signed-in users can navigate between the order workspace, product catalog, and inventory at `/`, `/products`, and `/inventory`.
- Product catalog operations use `GET /api/products?page=0&size=25&sort=name-asc&search=keyboard&lowStockOnly=false`, `POST /api/products`, `PUT /api/products/{id}`, and `DELETE /api/products/{id}`. Product listing is owner-scoped and database-paginated (page sizes 1–100); search, stock filtering, and sorting are applied by the backend. Product SKUs are unique within an account and are normalized to uppercase.
- Products track a unit price, stock quantity, and low-stock threshold. The inventory view highlights products at or below their threshold and allows stock quantities to be updated with `PATCH /api/products/{id}/stock`.
- `GET /api/products/summary` returns owner-scoped product count, stock units, low-stock count, and total stock value without transferring the full catalog.
- Product and inventory API requests are authenticated and scoped to the signed-in account. Negative prices or quantities are rejected, and another account's products are returned as not found.
- To seed 1,000 deterministic sample products for a dedicated test account, stop the normal backend, set `SEED_PRODUCTS_EMAIL` and `SEED_PRODUCTS_PASSWORD` in the environment, then run `SEED_PRODUCTS_ENABLED=true SPRING_MAIN_WEB_APPLICATION_TYPE=none mvn spring-boot:run` from `backend`. In PowerShell, set those three values with `$env:SEED_PRODUCTS_EMAIL`, `$env:SEED_PRODUCTS_PASSWORD`, and `$env:SEED_PRODUCTS_ENABLED`, then run `$env:SPRING_MAIN_WEB_APPLICATION_TYPE = 'none'; mvn spring-boot:run`. The test account is created if needed; an existing account's password is not changed. Seeding is disabled by default and repeat runs only add missing `TEST-DATA-0001` through `TEST-DATA-1000` products.

## Offline support

- The production build precaches the frontend app shell with a service worker. Service workers require HTTPS in production; localhost is supported for local testing.
- Successfully fetched order pages are cached in IndexedDB, scoped by account email and query. The cache is limited to the 20 most recently saved pages for the signed-in account.
- When the backend is unavailable, a previously cached page can be viewed read-only. Create, edit, delete, status updates, bulk actions, and CSV export require a reachable backend.
- Cached order data is cleared when the user signs out. It is stored in the browser and is not encrypted.
- Authentication remains memory-only: the user must sign in while online, and reloading the page signs them out. Offline login, cached reports, and queuing changes for later synchronization are not supported.
- To test the production service worker locally, run `npm run build` and `npm run preview` from `frontend`, then visit the preview URL once while online before testing offline.

## Authentication flow

- Register at `POST /api/auth/register` or sign in at `POST /api/auth/login`.
- Passwords are stored as BCrypt hashes.
- The backend returns a short-lived JWT (15 minutes by default).
- React keeps the access token in memory and sends it as a Bearer token for protected order requests. Reloading the page signs the user out.
- All `/api/orders` and `/api/products` endpoints require a valid token. The authentication endpoints are public.

## Run locally

Requirements: Java 17, Maven, Node.js, npm, and PostgreSQL.

1. Create a PostgreSQL database named `ordersdb`.
2. Set `DB_USERNAME` and `DB_PASSWORD` to the database credentials.
3. Set `JWT_SECRET` to a Base64-encoded random secret of at least 32 bytes. For example, with OpenSSL: `openssl rand -base64 32`.
4. From `backend`, run `mvn spring-boot:run`.
5. From `frontend`, run `npm install` and then `npm run dev`.
6. Open the Vite URL, create an account, then create and view orders.

The frontend origin defaults to `http://localhost:5173`; set `FRONTEND_ORIGIN` if it is served from a different origin. Configure production database credentials and JWT secrets through environment variables or a secret manager, and serve both applications over HTTPS.

### Existing database note

The owner column is added nullable so existing databases can start without a destructive migration. Orders created before ownership was introduced have no account assigned and are intentionally excluded from user-scoped order operations. Assign or archive those legacy rows with a reviewed database migration if they need to be retained.
