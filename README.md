# PBS Invoicing System

A comprehensive invoicing and billing management system built for PBS (Precision Billing Solutions) to manage laboratory billing, client portals, and payment processing.

---

## 🚨 CRITICAL DEPLOYMENT WARNING 🚨

**WE DEPLOY ONLY VIA WRANGLER - NEVER VIA GITHUB**

- Production URL: https://pbs-invoicing.botpros.ai/
- Cloudflare Pages Project: `pbs-invoicing-frontend`
- Production Branch: `main` (serves the production domain)
- **NEVER use git push to trigger deployments**
- **ALWAYS deploy manually via wrangler CLI**
- **GitHub is for version control only, NOT for deployments**

---

## Architecture

- **Frontend**: React 18 + TypeScript + Vite (Cloudflare Pages)
- **Backend**: Cloudflare Workers (Hono framework)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **Cache**: Cloudflare KV

## Production URL

**PRODUCTION SITE**: https://pbs-invoicing.botpros.ai/

## User Accounts

### PBS Staff
- **Admin**: admin@test.com / password123
- **Admin Alt**: admin@testemail.com / TempPass123
- **Billing**: billing@testemail.com / TempPass123

### Client Portal Users
- **Quest Diagnostics**: john.smith@questdiagnostics.com / ClientPass123!
- **LabCorp**: sarah.jones@labcorp.com / ClientPass123!
- **North Clinic**: mike.chen@northclinic.com / ClientPass123!

### Super Administrators
- **Super Admin**: superadmin@testemail.com / SuperAdmin123!
- **Test User**: test@test.com / Test123456!

---

## DEPLOYMENT INSTRUCTIONS

### 🚨 CRITICAL: DEPLOYMENT RULES 🚨

**READ THIS CAREFULLY - DEPLOYMENT IS MANUAL ONLY**

**THE CORRECT WAY TO DEPLOY:**
- ✅ **ONLY use wrangler CLI** - Manual deployment only
- ✅ **Deploy to branch: `main`** (this is the production branch)
- ✅ **Production URL**: https://pbs-invoicing.botpros.ai/
- ✅ **Project name**: `pbs-invoicing-frontend`
- ✅ **Always build before deploying**: `npm run build` first

**NEVER DO THIS - ZERO TOLERANCE:**
- ❌ **NEVER use `git push` to deploy** - GitHub push does NOT trigger deployments
- ❌ **NEVER deploy to any branch other than `main`** - Only `main` serves production
- ❌ **NEVER use `--branch=production`** - The correct branch is `main`
- ❌ **NEVER enable Cloudflare automatic deployments from GitHub**
- ❌ **NEVER use npm/netlify/vercel or any other deployment platform**

**REMEMBER: GitHub is for version control only. Deployments are manual via wrangler.**

### Prerequisites

1. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **Authenticate with Cloudflare**
   ```bash
   wrangler login
   ```
   This will open a browser window to authenticate with your Cloudflare account.

3. **Verify Authentication**
   ```bash
   wrangler whoami
   ```

### Frontend Deployment (Cloudflare Pages)

**STEP-BY-STEP DEPLOYMENT PROCESS**

**Step 1: Build the Application**
```bash
npm run build
```
This creates the production build in the `dist/` directory.

**Step 2: Deploy to Cloudflare Pages**
```bash
wrangler pages deploy dist --project-name=pbs-invoicing-frontend --branch=main
```

**Step 3: Verify Deployment**
After 30-60 seconds, the deployment will be live at: https://pbs-invoicing.botpros.ai/

**IMPORTANT NOTES FOR AI AGENTS:**
- The `--branch=main` flag is REQUIRED (not `production`, not any other name)
- The `main` branch serves the production domain
- If you get uncommitted changes warning, add `--commit-dirty=true` flag
- The `dist` directory contains the built React application
- Each deployment creates a new deployment ID automatically
- Deployment propagates globally in ~30-60 seconds

**Complete Command with All Flags:**
```bash
wrangler pages deploy dist --project-name=pbs-invoicing-frontend --branch=main --commit-dirty=true
```

### Backend Deployment (Cloudflare Workers)

**Deploy the API Worker:**

```bash
# Navigate to backend directory
cd ../backend

# Deploy to Cloudflare Workers
wrangler deploy

# Return to frontend directory
cd ../PBS_Invoicing
```

**Backend Details:**
- Worker Name: `pbs-invoicing`
- API Endpoint: https://pbs-invoicing.botpros.ai/api
- Database: Cloudflare D1 (`pbs-invoicing-db`)

### Environment Variables

Frontend uses these environment variables (configured in Cloudflare Pages):

```env
VITE_API_URL=https://pbs-invoicing.botpros.ai/api
VITE_SUPABASE_URL=https://qwvukolqraoucpxjqpmu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Note:** Supabase variables are dummy values required for build compatibility but are NOT used at runtime. The application uses the Cloudflare Workers API exclusively.

---

## Development

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Access at: http://localhost:5174

### Build for Production

```bash
npm run build
```

---

## Project Structure

```
PBS_Invoicing/
├── src/
│   ├── api/           # API client and utilities
│   ├── components/    # React components
│   ├── context/       # React context providers
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utility libraries
│   ├── pages/         # Page components
│   ├── services/      # Business logic services
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Helper functions
├── public/            # Static assets
├── dist/              # Production build output
└── package.json

../backend/
├── src/
│   └── index.ts       # Cloudflare Worker API
├── schema.sql         # D1 database schema
└── wrangler.toml      # Worker configuration
```

---

## Key Features

- Multi-tenant architecture with role-based access control (RBAC)
- Laboratory-focused billing and invoicing
- Client portal for invoice viewing and payment
- Invoice dispute management
- Payment processing integration
- Real-time updates
- Comprehensive reporting and analytics

---

## Technology Stack

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- React Query (TanStack Query)

### Backend
- Cloudflare Workers
- Hono Framework
- Cloudflare D1 (SQLite)
- JWT Authentication
- bcrypt for password hashing

---

## Development Workflow

### Working Directory
**Local Directory:** `C:\Users\Agent\Desktop\CLIENTS\PBS`
- This is your source of truth
- All development happens here
- Most up-to-date version is always local

### Branch Strategy
**ONE BRANCH ONLY:** `main`
- ✅ We use ONLY the `main` branch
- ❌ NEVER create other branches (no dev, staging, feature branches)
- ❌ NEVER merge from other branches

### Complete Workflow (Step by Step)

**When you make code changes:**

```bash
# 1. Test locally
npm run dev

# 2. Build for production
npm run build

# 3. Deploy to Cloudflare (MANUAL - does NOT happen automatically)
wrangler pages deploy dist --project-name=pbs-invoicing-frontend --branch=main --commit-dirty=true

# 4. Commit to GitHub (SEPARATE from deployment)
git add .
git commit -m "your commit message"
git push origin main
```

### Important Notes

**Cloudflare and GitHub are SEPARATE operations:**
- Deploying to Cloudflare ≠ Pushing to GitHub
- Pushing to GitHub ≠ Deploying to Cloudflare
- You must do BOTH manually
- Order: Deploy first, then commit (so git history matches production)

**GitHub is version control ONLY:**
- GitHub stores your code history
- GitHub push does NOT trigger deployments
- No automatic deployments from GitHub

**Cloudflare is hosting ONLY:**
- Cloudflare serves the live site
- You deploy manually via wrangler CLI
- Each deployment is independent of GitHub

---

## Support

For issues or questions, contact the development team.

**Production Site**: https://pbs-invoicing.botpros.ai/
