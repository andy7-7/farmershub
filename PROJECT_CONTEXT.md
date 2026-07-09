# FarmersHub Project Context

## Project Overview

FarmersHub is a livestock trading platform for farmer association members. It combines a public animal marketplace, farmer member profiles, admin approval workflows, and digital membership verification.

The intended product is not just a public classified ads board. It is a controlled trading hub where farmers register, wait for admin approval, receive a verified membership identity, and then list animals for sale to other members or buyers.

Target users:

- Farmers who want to sell livestock.
- Buyers looking for verified animal listings.
- Farmer association administrators.
- Platform owners who approve members, moderate listings, and manage membership cards.

Core business model:

- Farmers join an association-backed livestock marketplace.
- Admin approves legitimate farmers and issues membership IDs/cards.
- Approved/verified farmers can list animals.
- Buyers can browse animals and contact sellers.
- Future monetization can include listing fees, transaction commissions, premium seller profiles, promoted listings, verification fees, or association subscription plans.

## Current Architecture

### Frontend Structure

The frontend is a static HTML/CSS/JavaScript application in `frontend/`.

Main public/farmer pages:

- `frontend/index.html` - homepage.
- `frontend/register.html` - farmer application/registration page.
- `frontend/login.html` - farmer login.
- `frontend/dashboard.html` - farmer dashboard/profile/listings.
- `frontend/marketplace.html` - animal marketplace with filters.
- `frontend/add-animal.html` - add animal listing.
- `frontend/edit-animal.html` - edit existing animal listing.
- `frontend/animal-detail.html` - animal detail and contact seller page.
- `frontend/admin.html` - legacy entry page that redirects/links to the separate admin site.
- `frontend/app.js` - shared public frontend helpers, auth helpers, API calls, navbar, animal card renderer.
- `frontend/config.js` - frontend API base URL config. Defaults to `http://localhost:5000/api`.
- `frontend/style.css` - main shared visual design system.

Admin frontend:

- `frontend/admin/login.html` - admin login.
- `frontend/admin/dashboard.html` - admin stats dashboard.
- `frontend/admin/farmers.html` - farmer application management.
- `frontend/admin/membership-cards.html` - digital membership card management.
- `frontend/admin/app.js` - admin frontend API/auth/card helper functions.
- `frontend/admin/admin.css` - admin-specific UI styles.

The frontend directly calls the backend API with `fetch`. There is no frontend build system, router, bundler, or framework.

### Backend Structure

The backend is an Express application in `backend/`.

Important files:

- `backend/server.js` - Express server setup, route mounting, static admin serving, verification page route, schema initialization.
- `backend/config/db.js` - PostgreSQL connection pool.
- `backend/config/schema.js` - startup schema initializer using `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE IF NOT EXISTS`.
- `backend/Middleware/authMiddleware.js` - JWT auth, admin guard, approved farmer guard.

Routes:

- `backend/Routes/authRoutes.js`
- `backend/Routes/animalRoutes.js`
- `backend/Routes/farmerRoutes.js`
- `backend/Routes/adminRoutes.js`
- `backend/Routes/associationRoutes.js`
- `backend/Routes/messageRoutes.js`
- `backend/Routes/verificationRoutes.js`

Controllers:

- `backend/controllers/authController.js`
- `backend/controllers/animalController.js`
- `backend/controllers/farmerController.js`
- `backend/controllers/adminController.js`
- `backend/controllers/associationController.js`
- `backend/controllers/messageController.js`
- `backend/controllers/verificationController.js`

Uploads:

- `backend/Uploads/` stores uploaded animal and profile images locally.

### Database Structure

Database: PostgreSQL.

The schema is initialized at backend startup by `ensureSchema()` in `backend/config/schema.js`. This is convenient for local development, but production should use proper migration tooling.

## Database Schema

### `associations`

Fields:

- `id SERIAL PRIMARY KEY`
- `name VARCHAR(160) NOT NULL UNIQUE`
- `description TEXT`
- `region VARCHAR(120)`
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

Purpose:

- Stores farmer association records.
- A default association is inserted: `Ghana Farmers Animal Traders Association`.

### `farmers`

Base fields:

- `id SERIAL PRIMARY KEY`
- `full_name VARCHAR(160) NOT NULL`
- `email VARCHAR(160) NOT NULL UNIQUE`
- `password VARCHAR(255) NOT NULL`
- `phone VARCHAR(60)`
- `location VARCHAR(160)`
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

Added/altered fields:

- `farm_name VARCHAR(180)`
- `region VARCHAR(120)`
- `profile_image_url TEXT`
- `farm_description TEXT`
- `membership_id VARCHAR(80)`
- `association_id INTEGER REFERENCES associations(id) ON DELETE SET NULL`
- `role VARCHAR(30) DEFAULT 'farmer'`
- `account_status VARCHAR(30) DEFAULT 'pending'`
- `verified BOOLEAN DEFAULT false`
- `is_suspicious BOOLEAN DEFAULT false`
- `approved_at TIMESTAMP`
- `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

Indexes:

- Unique partial index on `membership_id` where it is not null or empty.

Important status values:

- `pending`
- `approved`
- `rejected`
- `suspended`

Purpose:

- Stores farmer accounts, admin users, member profile information, approval status, verification state, and membership IDs.

### `animals`

Fields:

- `id SERIAL PRIMARY KEY`
- `farmer_id INTEGER REFERENCES farmers(id) ON DELETE CASCADE`
- `name VARCHAR(160) NOT NULL`
- `species VARCHAR(120) NOT NULL`
- `breed VARCHAR(120)`
- `age NUMERIC`
- `price NUMERIC NOT NULL`
- `description TEXT`
- `image_url TEXT`
- `status VARCHAR(30) DEFAULT 'available'`
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- `health_status VARCHAR(120) DEFAULT 'Healthy'`
- `animal_location VARCHAR(160)`
- `approval_status VARCHAR(30) DEFAULT 'approved'`
- `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- `sold_at TIMESTAMP`

Important status values:

- `available`
- `sold`

Important approval status values:

- `approved`
- `pending`
- `rejected`

Purpose:

- Stores livestock listings.

### `messages`

Fields:

- `id SERIAL PRIMARY KEY`
- `animal_id INTEGER REFERENCES animals(id) ON DELETE SET NULL`
- `seller_id INTEGER REFERENCES farmers(id) ON DELETE CASCADE`
- `buyer_id INTEGER REFERENCES farmers(id) ON DELETE SET NULL`
- `buyer_name VARCHAR(160)`
- `buyer_phone VARCHAR(60)`
- `buyer_email VARCHAR(160)`
- `message TEXT NOT NULL`
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

Purpose:

- Stores simple in-app contact messages between buyer and seller.

### `sold_records`

Fields:

- `id SERIAL PRIMARY KEY`
- `animal_id INTEGER REFERENCES animals(id) ON DELETE SET NULL`
- `farmer_id INTEGER REFERENCES farmers(id) ON DELETE SET NULL`
- `sale_price NUMERIC`
- `sold_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

Purpose:

- Stores basic sale records when an animal is marked sold.

Known limitation:

- It does not store buyer identity yet.

### `membership_cards`

Fields:

- `id SERIAL PRIMARY KEY`
- `farmer_id INTEGER NOT NULL REFERENCES farmers(id) ON DELETE CASCADE`
- `membership_id VARCHAR(80) NOT NULL UNIQUE`
- `verification_url TEXT NOT NULL`
- `card_data JSONB`
- `generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- `regenerated_at TIMESTAMP`

Purpose:

- Stores generated digital membership card metadata and verification links.

### `admin_users`

Fields:

- `id SERIAL PRIMARY KEY`
- `farmer_id INTEGER UNIQUE REFERENCES farmers(id) ON DELETE CASCADE`
- `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

Purpose:

- Tracks admin users by linking to a farmer account with `role = 'admin'`.

## API Routes

Base URL locally:

```text
http://localhost:5000/api
```

### Auth Routes

Mounted at `/api/auth`.

- `POST /api/auth/register`
  - Registers a farmer application.
  - Creates farmer with `account_status = pending`.
  - Does not allow farmer-supplied membership IDs.

- `POST /api/auth/login`
  - Logs in a farmer using email/password.
  - Returns JWT and farmer object.
  - Pending/rejected farmers can currently log in to see dashboard status, but cannot list animals.

- `POST /api/auth/admin-login`
  - Logs in an admin.
  - Requires farmer account with `role = admin`.
  - Returns JWT and admin/farmer object.

### Animal Routes

Mounted at `/api/animals`.

- `GET /api/animals`
  - Public marketplace list.
  - Supports filters:
    - `search`
    - `type`
    - `species`
    - `breed`
    - `location`
    - `health_status`
    - `minPrice`
    - `maxPrice`
    - `minAge`
    - `maxAge`
    - `status`
  - Only returns animals from approved farmers and approved listings.

- `GET /api/animals/my-animals`
  - Protected.
  - Returns logged-in farmer's animals.

- `GET /api/animals/:id`
  - Public animal detail.
  - Only returns listing if seller farmer is approved.

- `POST /api/animals`
  - Protected.
  - Requires approved and verified farmer, unless admin.
  - Accepts `multipart/form-data` with optional image.
  - Creates animal listing.

- `PUT /api/animals/:id`
  - Protected.
  - Requires approved and verified farmer, unless admin.
  - Allows owner/admin to update listing.
  - Can mark animal as sold.

- `DELETE /api/animals/:id`
  - Protected.
  - Requires approved and verified farmer, unless admin.
  - Allows owner/admin to delete listing.

### Farmer Routes

Mounted at `/api/farmers`.

- `GET /api/farmers/me`
  - Protected.
  - Returns logged-in farmer profile and animals.

- `PUT /api/farmers/me`
  - Protected.
  - Updates logged-in farmer profile.
  - Accepts optional `profile_image` upload.

- `GET /api/farmers/:id`
  - Public farmer profile API.
  - Returns approved farmer profile and available approved listings.

### Admin Routes

Mounted at `/api/admin`.

All admin routes require:

- Valid JWT.
- `role = admin`.

Endpoints:

- `GET /api/admin/stats`
  - Returns platform stats:
    - total farmers
    - pending approvals
    - approved members
    - suspended members
    - rejected members
    - total animals
    - sold animals
    - active listings
    - marketplace value
    - top categories

- `GET /api/admin/farmers`
  - Returns all farmers.
  - Optional query:
    - `status=pending`
    - `status=approved`
    - `status=suspended`
    - `status=rejected`

- `GET /api/admin/animals`
  - Returns all animals with farmer info.

- `GET /api/admin/membership-cards`
  - Returns all membership cards.

- `GET /api/admin/membership-cards/:membershipId`
  - Returns a specific membership card.

- `POST /api/admin/farmers/:id/approve`
  - Approves farmer.
  - Sets `account_status = approved`.
  - Sets `verified = true`.
  - Generates membership ID if missing.
  - Creates/updates membership card.

- `PUT /api/admin/farmers/:id`
  - Edits farmer details.

- `PATCH /api/admin/animals/:id/moderate`
  - Sets animal listing `approval_status`.

- `PATCH /api/admin/farmers/:id/status`
  - Sets farmer status to `pending`, `rejected`, or `suspended`.
  - Does not allow direct approval; approval must use the approve endpoint so membership ID/card generation occurs.

- `POST /api/admin/farmers/:farmerId/regenerate-card`
  - Regenerates membership card for an approved farmer with a membership ID.

### Association Routes

Mounted at `/api/association`.

- `GET /api/association/mine`
  - Protected.
  - Returns logged-in farmer's association and approved members.

### Message Routes

Mounted at `/api/messages`.

- `POST /api/messages`
  - Protected.
  - Sends internal message to seller.

- `GET /api/messages/mine`
  - Protected.
  - Returns messages where logged-in farmer is buyer or seller.

### Verification Routes

Mounted at `/api/verify`.

- `GET /api/verify/:membershipId`
  - Public verification API for membership ID.

Server page route:

- `GET /verify/:membershipId`
  - Public HTML verification page.
  - Used by QR code links.

## Authentication Flow

### Farmer Registration

1. Farmer fills out `frontend/register.html`.
2. Frontend calls `POST /api/auth/register`.
3. Backend hashes password with bcrypt.
4. Backend inserts farmer with:
   - `role = farmer`
   - `account_status = pending`
   - `verified = false`
   - `membership_id = NULL`
5. Farmer receives a message that admin approval is required.

Farmers cannot type or choose their own membership ID.

### Farmer Login

1. Farmer fills out `frontend/login.html`.
2. Frontend calls `POST /api/auth/login`.
3. Backend checks password with bcrypt.
4. Backend returns JWT and farmer profile.
5. Pending/rejected farmers can log in to see status messaging.
6. Pending/rejected farmers are blocked from listing animals by backend route guard and frontend UI.

### Admin Login

1. Admin opens `/admin/login`.
2. Frontend calls `POST /api/auth/admin-login`.
3. Backend checks password and requires `role = admin`.
4. Backend returns JWT and admin user data.
5. Admin frontend stores token in `localStorage` as `fh_admin_token`.

### JWT Handling

Public frontend:

- Stores farmer token in `localStorage` as `token`.
- Stores farmer object in `localStorage` as `farmer`.
- Sends `Authorization: Bearer <token>` for protected routes.

Admin frontend:

- Stores admin token in `localStorage` as `fh_admin_token`.
- Stores admin user in `localStorage` as `fh_admin_user`.
- Sends `Authorization: Bearer <token>` for admin routes.

Backend middleware:

- `protect` verifies JWT and loads farmer from database.
- `adminOnly` blocks non-admins.
- `approvedFarmerOnly` blocks pending/rejected/suspended farmers from animal write actions.

## Membership System

### Pending

New registrations start as:

- `account_status = pending`
- `verified = false`
- `membership_id = NULL`

Pending farmers can log in and view dashboard status, but cannot list animals.

Dashboard message:

```text
Your account is pending approval
```

### Approved

Admin approves farmers from `/admin/farmers`.

Approval:

- Sets `account_status = approved`.
- Sets `verified = true`.
- Generates a unique membership ID if missing.
- Sets `approved_at`.
- Creates/updates membership card.

Dashboard message:

```text
Your account has been approved
```

Approved farmers can list animals.

### Rejected

Admin can reject farmer applications.

Rejecting:

- Sets `account_status = rejected`.
- Sets `verified = false`.

Dashboard/Add Animal message:

```text
Your account was rejected
```

Rejected farmers cannot list animals.

### Suspended

Admin can suspend farmers.

Suspending:

- Sets `account_status = suspended`.
- Sets `verified = false`.

Suspended farmers cannot list animals.

### Membership ID Generation

Format:

```text
FH-2026-0001
```

Actual year is generated from the current server year.

Generation happens only inside `POST /api/admin/farmers/:id/approve`.

Duplicate protection:

- Partial unique index on `farmers.membership_id`.
- Unique constraint on `membership_cards.membership_id`.
- Admin approval uses a transaction and advisory lock to reduce duplicate risk under concurrent approvals.

### Verified Badge

Frontend displays verified badges when `verified = true`.

Current locations:

- Farmer dashboard.
- Marketplace animal cards.
- Membership card UI.

### Membership Card

Admin card page:

```text
/admin/membership-cards
```

Membership card contains:

- FarmersHub branding.
- Farmer full name.
- Farm name.
- Phone.
- Region.
- Location.
- Membership ID.
- Approval date.
- QR verification link.

Admin can:

- View card.
- Print/save as PDF through browser print.
- Download PNG.
- Download SVG.
- Copy verification link.
- Regenerate card.

## Admin Features

Current admin capabilities:

- Admin-only login.
- View dashboard statistics.
- View pending/approved/suspended/rejected/all farmers.
- Approve farmer applications.
- Reject farmer applications.
- Suspend farmers.
- Edit farmer details.
- View all animals.
- Moderate animal listing approval status.
- View membership cards.
- Regenerate membership cards.
- Print/save membership cards.
- Download cards as PNG/SVG.
- Copy verification links.

Admin pages:

- `/admin/login`
- `/admin/dashboard`
- `/admin/farmers`
- `/admin/membership-cards`

## Farmer Features

Current farmer capabilities:

- Register as a farmer applicant.
- Log in.
- View dashboard/profile.
- Edit profile:
  - full name
  - farm name
  - phone
  - location
  - region
  - farm description
  - profile image
- View own listings.
- Add animal listings if approved and verified.
- Edit own listings if approved and verified.
- Delete own listings if approved and verified.
- Mark own animal as sold.
- Receive in-app contact messages.
- View approval/rejection/pending status on dashboard.

## Marketplace Features

Current animal listing features:

- Public marketplace page.
- Search by text.
- Filter by:
  - animal type/species
  - breed
  - location/region
  - health status
  - minimum price
  - maximum price
- Animal detail page.
- Animal image upload.
- Animal fields:
  - name
  - species/type
  - breed
  - age
  - price
  - health status
  - animal location
  - description
  - status
  - approval status
- Contact seller by WhatsApp if phone exists.
- Call seller if phone exists.
- Send internal message.
- Shows verified farmer badge on listings.

## Environment Variables

Required backend `.env` values:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=farmer_marketplace
DB_USER=postgres
DB_PASSWORD=your_database_password
JWT_SECRET=replace_with_a_long_random_secret
PUBLIC_APP_URL=http://localhost:5000
```

Current `.env` contains real local credentials. For production, do not commit `.env`.

Frontend config:

- `frontend/config.js` defaults API URL to:

```js
window.FARMERS_API_URL = window.FARMERS_API_URL || 'http://localhost:5000/api';
```

Admin frontend:

- `frontend/admin/app.js` uses:

```js
const ADMIN_API = window.FARMERS_ADMIN_API || `${window.location.origin}/api`;
```

## How To Run Locally

Prerequisites:

- Node.js.
- PostgreSQL.
- Database named `farmer_marketplace`.
- Backend `.env` configured.

Install dependencies if needed:

```powershell
cd C:\Users\agyei\farmers-marketplace\backend
npm install
```

Start backend:

```powershell
cd C:\Users\agyei\farmers-marketplace\backend
npm start
```

Development start with nodemon:

```powershell
cd C:\Users\agyei\farmers-marketplace\backend
npm run dev
```

Public frontend:

Open:

```text
C:\Users\agyei\farmers-marketplace\frontend\index.html
```

Admin frontend:

With backend running, open:

```text
http://localhost:5000/admin/login
```

Verification page example:

```text
http://localhost:5000/verify/FH-2026-0001
```

## Deployment Instructions

Recommended deployment model:

1. Deploy PostgreSQL database.
2. Deploy backend Node/Express app.
3. Serve static frontend files from the backend or a static host.
4. Configure production environment variables.
5. Point domain and HTTPS to backend/static frontend.

Backend deployment steps:

```bash
cd backend
npm install --production
npm start
```

Production environment variables:

```env
PORT=5000
DB_HOST=<production-db-host>
DB_PORT=5432
DB_NAME=<production-db-name>
DB_USER=<production-db-user>
DB_PASSWORD=<production-db-password>
JWT_SECRET=<long-random-secret>
PUBLIC_APP_URL=https://your-domain.com
```

Important production notes:

- Use HTTPS.
- Use a strong JWT secret.
- Restrict CORS.
- Move uploads to object storage such as S3, Cloudinary, or similar.
- Replace startup schema creation with real migrations.
- Add backups for PostgreSQL.
- Add process manager/hosting platform logs.
- Add `.env.example` and keep `.env` out of Git.

Possible hosting options:

- Backend: Render, Railway, Fly.io, Heroku-compatible platform, VPS, DigitalOcean App Platform.
- Database: managed PostgreSQL from Render, Railway, Supabase, Neon, DigitalOcean, AWS RDS.
- Static frontend: same Express backend, Netlify, Vercel, or object storage/CDN.

## Known Issues

- Git is not available in the current shell environment.
- No automated tests exist.
- No production migration tool exists; schema is created/altered on startup.
- `.env` currently contains real local credentials and should not be committed.
- CORS is open to all origins.
- JWT secret is weak/default-looking in the local `.env`.
- No rate limiting on auth/message endpoints.
- No password reset.
- No email/phone verification.
- No notification system.
- No full message inbox UI on dashboard yet.
- No farmer ratings/reviews yet.
- No buyer identity in `sold_records`.
- No real transaction history table with buyer/seller/payment/status.
- Animal listing moderation currently defaults new animals to `approved`.
- Uploaded files are stored locally; production should use durable object storage.
- File validation only checks MIME type; stronger validation is needed.
- Some frontend rendering uses `innerHTML`, which can create XSS risk if user-provided content is not sanitized.
- Admin user bootstrap is simplistic: first farmer can be promoted to admin if no admin exists.
- Admin and public frontends use localStorage for JWT tokens.
- No pagination for marketplace or admin tables.
- No audit logs for admin actions.
- No deployment config files or CI/CD pipeline.

## Next Priority Tasks

1. Add `.env.example`, `.gitignore`, and remove real secrets from tracked files.
2. Add validation middleware for all API inputs.
3. Add rate limiting for login, registration, and messaging.
4. Add proper database migration tooling.
5. Add seller profile frontend page using `GET /api/farmers/:id`.
6. Build full in-app message inbox UI.
7. Add farmer ratings/reviews:
   - ratings table
   - API endpoints
   - frontend display
   - post-transaction review flow
8. Improve transaction records:
   - transactions table
   - buyer identity
   - sale price
   - transaction status
   - receipts
9. Build total sales dashboard for farmers and admin.
10. Change animal listing approval to pending by default if admin moderation is required.
11. Add pagination and sorting to marketplace/admin lists.
12. Add report listing/account abuse feature.
13. Harden file uploads and move uploads to object storage.
14. Add password reset and email/phone verification.
15. Add automated tests for auth, approval, animal CRUD, admin approval, and membership ID generation.
16. Add production deployment documentation and checklist.
