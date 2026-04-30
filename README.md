# QueueFlow

A multi-tenant, white-label queueing system built with **Next.js 14** and **Supabase**.

Customers scan a QR code, enter their name, and get a queue number. Cashiers call numbers from their panel. A display monitor shows the current number and window in real-time.

---

## System Modules

| Module | URL | Who uses it |
|--------|-----|-------------|
| Customer Portal | `/q/[tenant-slug]` | Customers (via QR scan) |
| Cashier Panel | `/cashier` | Cashier staff |
| Display Monitor | `/display/[token]` | TV / monitor screen |
| Admin Dashboard | `/admin` | Business admin |
| Tenant Manager | `/admin/tenants` | You (superadmin) |

---

## Prerequisites

- **Node.js** 18.17 or higher
- **npm** or **yarn**
- A **Supabase** account (free at [supabase.com](https://supabase.com))

---

## Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Choose a name (e.g. `queueflow`), set a strong database password, and pick a region close to your users (e.g. Southeast Asia)
4. Click **Create new project** and wait about 2 minutes for it to provision

---

## Step 2 — Run the Database Schema

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `queueflow_schema.sql` from this repo
4. Copy the entire contents and paste it into the SQL editor
5. Click **Run** (or press `Ctrl+Enter`)
6. You should see `Success. No rows returned` — this means all tables, enums, indexes, and triggers were created

### Verify the tables were created

Click **Table Editor** in the left sidebar. You should see these tables:

- `tenants`
- `users`
- `counters`
- `queue_sessions`
- `queue_tickets`
- `ticket_events`
- `display_screens`
- `qr_codes`
- `audit_logs`

---

## Step 3 — Enable Realtime on queue_tickets

The display monitor and customer portal use real-time updates. You must enable this:

1. In Supabase, go to **Database → Replication** (or search "Replication" in the left sidebar)
2. Under **Source**, find the `queue_tickets` table
3. Toggle it **ON**
4. Do the same for the `counters` table

---

## Step 4 — Disable Row Level Security (for development)

For the free/MVP deployment, the simplest approach is to disable RLS temporarily. For production, you should enable RLS with proper policies.

**For development (quick start):**

Go to **SQL Editor** and run:

```sql
ALTER TABLE tenants         DISABLE ROW LEVEL SECURITY;
ALTER TABLE users           DISABLE ROW LEVEL SECURITY;
ALTER TABLE counters        DISABLE ROW LEVEL SECURITY;
ALTER TABLE queue_sessions  DISABLE ROW LEVEL SECURITY;
ALTER TABLE queue_tickets   DISABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_events   DISABLE ROW LEVEL SECURITY;
ALTER TABLE display_screens DISABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes        DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs      DISABLE ROW LEVEL SECURITY;
```

---

## Step 5 — Get Your Supabase API Keys

1. In your Supabase project, go to **Settings → API**
2. You will need three values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon / public key** — a long JWT string under "Project API keys"
   - **service_role key** — another long JWT string (keep this secret — never expose to the browser)

---

## Step 6 — Set Up Environment Variables

In the root of this project, create a file called `.env.local`:

```bash
cp .env.local.example .env.local
```

Then open `.env.local` and fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Replace the placeholder values with the actual keys from Step 5.

---

## Step 7 — Create Your First Tenant

Go to **SQL Editor** in Supabase and run this (edit the values to match your first client):

```sql
INSERT INTO tenants (
  slug, business_name, primary_color, secondary_color,
  accent_color, queue_prefix, welcome_message, plan
) VALUES (
  'demo-clinic',
  'Demo Clinic',
  '#1d4ed8',
  '#f8fafc',
  '#f59e0b',
  'A',
  'Welcome! Please enter your name to get a queue number.',
  'free'
);
```

---

## Step 8 — Create the Superadmin User

The superadmin is **you** — the platform owner who can see and manage all tenants.

### 8a. Create the auth user in Supabase

1. Go to **Authentication → Users** in your Supabase dashboard
2. Click **Add user → Create new user**
3. Enter your email and a strong password
4. Click **Create user**
5. Copy the **User UID** shown (it looks like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### 8b. Insert into the users table

Go to **SQL Editor** and run (replace the values):

```sql
INSERT INTO users (id, tenant_id, email, password_hash, full_name, role)
VALUES (
  'paste-your-uid-here',     -- UID from step 8a
  NULL,                       -- superadmin has no tenant
  'your@email.com',
  'managed_by_supabase_auth',
  'Your Full Name',
  'superadmin'
);
```

---

## Step 9 — Create an Admin User for Your Tenant

An admin is the business client's manager. To create one:

1. Go to **Authentication → Users** and create another user (the client's admin email/password)
2. Copy their UID
3. Get your tenant's ID from the `tenants` table (go to **Table Editor → tenants**)
4. Run in **SQL Editor**:

```sql
INSERT INTO users (id, tenant_id, email, password_hash, full_name, role)
VALUES (
  'admin-user-uid-here',
  'your-tenant-id-here',
  'admin@clientbusiness.com',
  'managed_by_supabase_auth',
  'Admin Name',
  'admin'
);
```

---

## Step 10 — Install and Run the App

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you will be redirected to `/login`.

Sign in with your superadmin credentials from Step 8.

---

## Step 11 — Set Up Your First Counter and Cashier

1. Log in as the **admin** of your tenant
2. Go to **Counters** → click **Add Cashier** to create a cashier account
3. Go to **Counters** → click **New Counter** to create a window and assign the cashier
4. Go to **QR Codes** → click **Generate QR** to create the customer entry QR
5. Go to **Screens** → click **Add Screen** to get a TV monitor URL

---

## URL Reference

Once running, here are the URLs for each module:

| Module | URL |
|--------|-----|
| Customer Portal | `http://localhost:3000/q/your-tenant-slug` |
| Cashier Login | `http://localhost:3000/login` → redirects to `/cashier` |
| Display Monitor | `http://localhost:3000/display/[token]` (get token from Screens page) |
| Admin Panel | `http://localhost:3000/admin` |

---

## Deploying to Vercel (Free)

1. Push this project to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and click **Add New Project**
3. Import your GitHub repo
4. Under **Environment Variables**, add all three variables from your `.env.local`
5. Click **Deploy**

Your app will be live at `your-project.vercel.app`.

---

## Project Structure

```
src/
├── app/
│   ├── q/[slug]/           # Customer portal (QR scan landing)
│   ├── cashier/            # Cashier panel
│   ├── display/[token]/    # TV monitor display
│   ├── admin/              # Admin dashboard
│   │   ├── counters/       # Manage cashier windows
│   │   ├── qrcodes/        # Generate QR codes
│   │   ├── screens/        # Manage display monitors
│   │   ├── logs/           # Queue logs and history
│   │   └── tenants/        # Superadmin: manage all clients
│   ├── api/
│   │   └── admin/
│   │       └── create-cashier/  # API route for creating cashier accounts
│   ├── login/              # Login page
│   └── layout.tsx          # Root layout
├── components/
│   └── admin/
│       └── AdminSidebar.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # Browser Supabase client
│   │   └── server.ts       # Server Supabase client
│   └── utils.ts            # Helper functions
├── types/
│   └── index.ts            # TypeScript types matching the ERD
└── middleware.ts            # Auth route protection
```

---

## Common Issues

**"relation does not exist" error**
→ The SQL schema was not run. Go back to Step 2.

**Login works but redirects to login again**
→ The user row is missing from the `users` table. Go back to Step 8b.

**Realtime not working on display monitor**
→ Replication is not enabled. Go back to Step 3.

**"permission denied" error on data fetch**
→ RLS is enabled but no policies are set. For development, disable RLS (Step 4).

**QR code scanned but "Page not found"**
→ The tenant `slug` in the URL doesn't match what's in the `tenants` table.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime (WebSockets) |
| Storage | Supabase Storage |
| Hosting | Vercel |
| QR Codes | qrcode.react |
| Icons | lucide-react |
