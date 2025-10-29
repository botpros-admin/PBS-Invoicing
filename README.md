# PBS Invoicing System

A comprehensive invoicing and billing management system built for PBS (Precision Billing Solutions) to manage laboratory billing, client portals, and payment processing.

---

## 🚨 CRITICAL DEPLOYMENT WARNING 🚨

**WE MAINTAIN EXACTLY ONE (1) DEPLOYMENT - NEVER CREATE NEW ONES**

- Current Deployment: `4a19b4f7-c8d3-4a73-9a0f-ad6015b395a4`
- Production URL: https://pbs-invoicing.botpros.ai/
- **NEVER create multiple deployments**
- **ALWAYS update the existing deployment via wrangler**
- **DELETE any accidental new deployments immediately**

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

**WE HAVE EXACTLY ONE (1) DEPLOYMENT - NEVER CREATE NEW DEPLOYMENTS**

**ABSOLUTE DEPLOYMENT POLICY:**
- ✅ **ONE SINGLE DEPLOYMENT ONLY**: We maintain exactly ONE deployment
- ✅ **CURRENT DEPLOYMENT ID**: `4a19b4f7-c8d3-4a73-9a0f-ad6015b395a4`
- ✅ **Production URL**: https://pbs-invoicing.botpros.ai/
- ✅ **Deploy ONLY via wrangler** to update the EXISTING deployment
- ✅ **Deploy ONLY to production branch**

**NEVER DO THIS - ZERO TOLERANCE:**
- ❌ **NEVER create new deployments** - We update the existing one
- ❌ **NEVER deploy to preview/staging/feature branches**
- ❌ **NEVER use git push to trigger deployments**
- ❌ **NEVER use Cloudflare Dashboard automatic deployments**
- ❌ **NEVER create multiple deployments** - Delete immediately if created
- ❌ **NEVER use npm/netlify/vercel or any other platform**

**DEPLOYMENT COUNT: EXACTLY 1 (ONE) - NO EXCEPTIONS**

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

**⚠️ THIS UPDATES THE EXISTING DEPLOYMENT - DOES NOT CREATE A NEW ONE ⚠️**

```bash
# Build the frontend
npm run build

# Deploy to Cloudflare Pages (updates existing deployment 4a19b4f7)
wrangler pages deploy dist --project-name=pbs-invoicing-frontend --branch=production

# The deployment will be live at: https://pbs-invoicing.botpros.ai/
```

**Critical Notes:**
- This command **UPDATES** the existing deployment (ID: 4a19b4f7)
- **NEVER** use different branch names - ONLY `--branch=production`
- **NEVER** deploy without the `--branch=production` flag
- The `dist` directory contains the built React application
- Deployment takes ~30-60 seconds to propagate globally
- **If you accidentally create a new deployment, DELETE IT IMMEDIATELY**

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

## Commit Guidelines

When committing changes to GitHub:

```bash
git add .
git commit -m "feat: your feature description"
git push origin main
```

**Remember:** Git commits do NOT trigger deployments. Only manual wrangler deployments update production.

---

## Support

For issues or questions, contact the development team.

**Production Site**: https://pbs-invoicing.botpros.ai/
