# PBS_Invoicing - Remaining Tasks TODO List

## 🚨 CRITICAL - Database Relationship Errors (Priority 1)
- [ ] **Fix PGRST201 errors in dashboard.service.ts**
  - Line 396: getTopClientsByRevenue function
  - Error: "Could not embed because more than one relationship was found for 'invoices' and 'clients'"
  - Solution: Add explicit foreign key hints to Supabase queries
  
- [ ] **Fix PGRST201 errors in invoice.service.ts**
  - Line 247: getInvoices function
  - Same relationship ambiguity error
  - Solution: Use specific constraint names in select statements

## 💰 HIGH PRIORITY - Payment Features (Priority 2)
- [ ] **Implement overpayment handling**
  - Create payment_credits table in database
  - Add credit tracking to payment service
  - Implement automatic credit application to future invoices
  - Update AllocationSummary.tsx to store overpayments
  
- [ ] **Test partial payment allocation**
  - Verify allocation amounts don't exceed payment total
  - Test multiple invoice allocation from single payment
  - Ensure proper balance updates
  
- [ ] **Complete payment allocation workflow testing**
  - End-to-end payment flow testing
  - Edge cases: zero payments, negative amounts, decimal precision

## 🧪 HIGH PRIORITY - Stripe Integration Testing (Priority 3)
- [ ] **Write unit tests for stripeService.ts**
  - Payment intent creation tests
  - Payment confirmation tests
  - Webhook signature verification tests
  - Error handling tests
  
- [ ] **Write integration tests**
  - End-to-end payment processing
  - Webhook delivery simulation
  - Payment failure scenarios
  - Refund processing tests

## 🎨 MEDIUM PRIORITY - UI/UX Improvements (Priority 4)
- [ ] **Add loading states to payment forms**
  - PaymentAllocationForm.tsx - Add loading during save
  - AllocationTable.tsx - Add loading during invoice fetch
  - PaymentHistory.tsx - Add loading during history retrieval
  
- [ ] **Enhance form validation**
  - Prevent negative payment amounts
  - Add future date restrictions
  - Real-time allocation validation feedback
  - Payment method validation for Stripe

## 🔧 MEDIUM PRIORITY - Infrastructure (Priority 5)
- [ ] **Set up monitoring and logging**
  - Implement error tracking (Sentry or similar)
  - Add performance monitoring
  - Create audit logs for payments
  
- [ ] **Deploy migrations to production**
  - Create backup of production database
  - Deploy RLS policies
  - Deploy security migrations
  - Verify production environment

## 📝 LOW PRIORITY - Future Features (Priority 6)
- [ ] Line-level allocation for complex payment cases
- [ ] Multiple invoice allocation UI improvements
- [ ] Enhanced dashboard widgets
- [ ] Client portal enhancements
- [ ] Batch payment processing
- [ ] Payment scheduling system

## 🐛 Bug Fixes
- [ ] Fix 2 failing authentication test cases
- [ ] Resolve TypeScript type mismatches in payment.ts
- [ ] Add React error boundaries for better error handling
- [ ] Fix unhandled promise rejections in async operations

## 📊 Current Status
- ✅ 147 tests written, 145 passing (98.6% pass rate)
- ✅ Security fixes implemented (RLS, XSS protection, input sanitization)
- ✅ Database indexes created for performance
- ✅ Custom hooks created to refactor large components
- ⚠️ PGRST201 errors blocking invoice and dashboard functionality
- ⚠️ Overpayment handling incomplete
- ⚠️ Stripe integration untested

## 🚀 Recommended Execution Order
1. Fix PGRST201 errors (blocking issue)
2. Complete overpayment implementation
3. Add Stripe integration tests
4. Implement loading states
5. Enhance form validation
6. Deploy to production with backup

## 📅 Estimated Timeline
- **Week 1**: Critical fixes (PGRST201, overpayment handling)
- **Week 2**: Testing and validation improvements
- **Week 3**: UI/UX polish and production deployment

## 🔍 Testing Commands
```bash
# Run existing tests
npm test

# Run tests in watch mode
npm run test:watch

# Check test coverage
npm run test:coverage

# Run specific test file
npm test -- src/services/stripeService.test.ts

# Lint and type check
npm run lint
npm run type-check
```

## 📦 Deployment Checklist
- [ ] All tests passing
- [ ] Lint checks passing
- [ ] Type checks passing
- [ ] Database backup created
- [ ] Environment variables verified
- [ ] Stripe webhooks configured
- [ ] SSL certificates valid
- [ ] Monitoring configured
- [ ] Error tracking enabled
- [ ] Performance baselines established

## 🛠️ Development Environment
- Node.js: 18.x
- React: 18.2.0
- TypeScript: 5.0.2
- Vite: 4.4.5
- Supabase: Latest
- Stripe: Latest

## 📞 Support Resources
- Supabase Docs: https://supabase.com/docs
- Stripe Docs: https://stripe.com/docs
- React Query: https://tanstack.com/query
- Tailwind CSS: https://tailwindcss.com

---
*Last Updated: 2025-08-16*
*Status: In Progress*
*Priority: Fix PGRST201 errors first*