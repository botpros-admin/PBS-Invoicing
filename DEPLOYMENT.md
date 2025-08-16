# PBS Invoicing - Production Deployment Guide

## 📋 Pre-Deployment Checklist

### 1. Environment Setup
- [ ] All required environment variables are set (see `.env.example`)
- [ ] Supabase project is configured
- [ ] Stripe API keys are configured
- [ ] Database connection is verified

### 2. Security Verification
- [ ] RLS policies are enabled on all tables
- [ ] API rate limiting is configured
- [ ] Security headers are set
- [ ] No exposed secrets in code

### 3. Testing
- [ ] All tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Production readiness check passes: `npm run db:check`

## 🚀 Deployment Steps

### Step 1: Backup Current Production Database
```bash
# Create a backup of the production database
npm run db:backup:prod

# Verify backup was created
ls -la backups/
```

### Step 2: Deploy Database Migrations
```bash
# Set your Supabase project reference
export SUPABASE_PROJECT_REF=your-project-ref

# Run migrations
npm run db:migrate:prod

# Verify RLS policies are enabled
npx supabase db remote list --project-ref $SUPABASE_PROJECT_REF
```

### Step 3: Deploy Application

#### Option A: Vercel Deployment
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy to production
vercel --prod

# Set environment variables in Vercel dashboard
```

#### Option B: Manual Deployment
```bash
# Build the application
npm run build

# Upload dist folder to your hosting provider
```

### Step 4: Post-Deployment Verification

1. **Health Check**
   ```bash
   curl https://your-domain.com/api/health
   ```
   Expected response:
   ```json
   {
     "status": "healthy",
     "checks": {
       "database": { "status": "ok" },
       "api": { "status": "ok" },
       "storage": { "status": "ok" },
       "auth": { "status": "ok" }
     }
   }
   ```

2. **Test Critical Paths**
   - [ ] User can log in
   - [ ] Invoices load correctly
   - [ ] Payment form works
   - [ ] Reports generate

3. **Monitor Logs**
   - Check application logs for errors
   - Monitor database performance
   - Review error tracking service

## 🔄 Rollback Procedure

If issues are detected after deployment:

### 1. Immediate Rollback
```bash
# Revert to previous deployment in Vercel
vercel rollback

# OR manually restore previous build
```

### 2. Database Rollback
```bash
# List available backups
npm run db:restore

# Follow prompts to select and restore backup
```

### 3. Verify Rollback
- [ ] Application is accessible
- [ ] Data integrity is maintained
- [ ] No ongoing errors

## 📊 Monitoring Setup

### 1. Application Monitoring
- Set up error tracking (Sentry/Rollbar)
- Configure performance monitoring
- Enable real user monitoring (RUM)

### 2. Database Monitoring
- Enable Supabase query performance insights
- Set up slow query alerts
- Monitor connection pool usage

### 3. Business Metrics
- Track payment success rates
- Monitor invoice processing times
- Set up alerts for failed transactions

## 🔐 Security Considerations

### Critical Security Tasks
1. **Enable 2FA** for all admin accounts
2. **Rotate API keys** after deployment
3. **Review access logs** for suspicious activity
4. **Test rate limiting** is working correctly
5. **Verify SSL certificates** are valid

### Ongoing Security
- Schedule regular security audits
- Keep dependencies updated
- Monitor for CVEs in dependencies
- Regular backup testing

## 📝 Environment Variables

Required environment variables for production:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
DATABASE_URL=postgresql://xxx

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Optional - Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXX

# Optional - Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=xxx
SMTP_PASS=xxx
```

## 🛠️ Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check database URL
echo $DATABASE_URL

# Test connection
npx supabase db remote status
```

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

#### Migration Failures
```bash
# Check migration status
npx supabase migration list

# Reset and reapply if needed
npx supabase db reset
```

## 📞 Support Contacts

- **Technical Lead**: [Contact Info]
- **Database Admin**: [Contact Info]
- **On-Call Engineer**: [Contact Info]
- **Escalation**: [Contact Info]

## 📅 Maintenance Windows

- **Scheduled Maintenance**: Tuesdays 2-4 AM PST
- **Emergency Maintenance**: As needed with 1-hour notice
- **Database Backups**: Daily at 3 AM PST
- **Log Rotation**: Weekly on Sundays

## ✅ Final Checklist

Before marking deployment as complete:

- [ ] All health checks pass
- [ ] Critical user journeys tested
- [ ] Monitoring dashboards show normal metrics
- [ ] Team notified of deployment
- [ ] Documentation updated with any changes
- [ ] Backup verified and accessible
- [ ] Rollback procedure tested
- [ ] Performance metrics baseline established

---

**Last Updated**: December 2024
**Version**: 1.0.0