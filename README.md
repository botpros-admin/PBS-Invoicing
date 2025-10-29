# PBS Invoicing System

A comprehensive invoicing and billing management system built for PBS (Precision Billing Solutions) to manage laboratory billing, client portals, and payment processing.

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

### ⚠️ CRITICAL: DEPLOYMENT RULES

**ONLY DEPLOY VIA CLOUDFLARE WRANGLER - DO NOT USE ANY OTHER METHOD**

- ✅ Deploy ONLY via Cloudflare CLI (wrangler)
- ✅ Deploy ONLY to production branch
- ✅ Production URL: https://pbs-invoicing.botpros.ai/
- ❌ DO NOT use `git push` to trigger deployments
- ❌ DO NOT use Cloudflare Dashboard automatic deployments
- ❌ DO NOT deploy to preview/staging environments
- ❌ DO NOT use npm/netlify/vercel or any other platform

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

**Deploy to Production ONLY:**

```bash
# Build the frontend
npm run build

# Deploy to Cloudflare Pages (production)
wrangler pages deploy dist --project-name=pbs-invoicing-frontend --branch=production

# The deployment will be live at: https://pbs-invoicing.botpros.ai/
```

**Important Notes:**
- Always deploy to `--branch=production` to ensure it goes to the production URL
- Do NOT deploy to other branches (main, preview, etc.)
- The `dist` directory contains the built React application
- Deployment takes ~30-60 seconds to propagate globally

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
