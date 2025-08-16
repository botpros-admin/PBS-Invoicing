#!/usr/bin/env node

/**
 * Production Readiness Validation Script
 * Ensures the application is ready for production deployment
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const CHECK_CATEGORIES = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

class ProductionReadinessChecker {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: [],
      info: []
    };
    this.criticalFailures = 0;
  }

  // Environment Variable Checks
  checkEnvironmentVariables() {
    console.log('\n🔧 Checking Environment Variables...');
    
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'DATABASE_URL',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET'
    ];

    const optionalVars = [
      'SENTRY_DSN',
      'NEXT_PUBLIC_GA_MEASUREMENT_ID',
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASS'
    ];

    requiredVars.forEach(varName => {
      if (process.env[varName]) {
        this.addResult('passed', `✅ ${varName} is set`, CHECK_CATEGORIES.CRITICAL);
      } else {
        this.addResult('failed', `❌ ${varName} is missing`, CHECK_CATEGORIES.CRITICAL);
        this.criticalFailures++;
      }
    });

    optionalVars.forEach(varName => {
      if (process.env[varName]) {
        this.addResult('passed', `✅ ${varName} is set`, CHECK_CATEGORIES.LOW);
      } else {
        this.addResult('warnings', `⚠️ ${varName} is not set (optional)`, CHECK_CATEGORIES.LOW);
      }
    });
  }

  // Database Connectivity
  async checkDatabaseConnection() {
    console.log('\n🗄️ Checking Database Connection...');
    
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Test connection with a simple query
      const { data, error } = await supabase.from('users').select('count').limit(1);
      
      if (error) throw error;
      
      this.addResult('passed', '✅ Database connection successful', CHECK_CATEGORIES.CRITICAL);
      
      // Check RLS policies
      const { data: tables } = await supabase.rpc('get_tables_with_rls_status');
      if (tables) {
        const tablesWithoutRLS = tables.filter(t => !t.rls_enabled);
        if (tablesWithoutRLS.length > 0) {
          this.addResult('failed', `❌ Tables without RLS: ${tablesWithoutRLS.map(t => t.table_name).join(', ')}`, CHECK_CATEGORIES.CRITICAL);
          this.criticalFailures++;
        } else {
          this.addResult('passed', '✅ All tables have RLS enabled', CHECK_CATEGORIES.CRITICAL);
        }
      }
    } catch (error) {
      this.addResult('failed', `❌ Database connection failed: ${error.message}`, CHECK_CATEGORIES.CRITICAL);
      this.criticalFailures++;
    }
  }

  // Security Checks
  checkSecurityConfiguration() {
    console.log('\n🔒 Checking Security Configuration...');
    
    // Check for exposed secrets in code
    const srcDir = path.join(__dirname, '..', 'src');
    const secretPatterns = [
      /api[_-]?key/i,
      /secret[_-]?key/i,
      /password/i,
      /bearer\s+[a-zA-Z0-9\-._~+\/]+=*/i
    ];

    let exposedSecrets = 0;
    const checkFile = (filePath) => {
      if (filePath.endsWith('.test.js') || filePath.endsWith('.test.ts')) return;
      
      const content = fs.readFileSync(filePath, 'utf8');
      secretPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches && !content.includes('process.env')) {
          exposedSecrets++;
          this.addResult('warnings', `⚠️ Potential exposed secret in ${filePath}`, CHECK_CATEGORIES.HIGH);
        }
      });
    };

    const walkDir = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          walkDir(filePath);
        } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx'))) {
          checkFile(filePath);
        }
      });
    };

    if (fs.existsSync(srcDir)) {
      walkDir(srcDir);
    }

    if (exposedSecrets === 0) {
      this.addResult('passed', '✅ No exposed secrets found in code', CHECK_CATEGORIES.HIGH);
    } else {
      this.addResult('failed', `❌ Found ${exposedSecrets} potential exposed secrets`, CHECK_CATEGORIES.HIGH);
    }

    // Check HTTPS enforcement
    const nextConfig = path.join(__dirname, '..', 'next.config.js');
    if (fs.existsSync(nextConfig)) {
      const config = fs.readFileSync(nextConfig, 'utf8');
      if (config.includes('forceSSL') || config.includes('https')) {
        this.addResult('passed', '✅ HTTPS enforcement configured', CHECK_CATEGORIES.HIGH);
      } else {
        this.addResult('warnings', '⚠️ HTTPS enforcement not explicitly configured', CHECK_CATEGORIES.MEDIUM);
      }
    }

    // Check for security headers
    const middleware = path.join(__dirname, '..', 'src', 'middleware.ts');
    if (fs.existsSync(middleware)) {
      const content = fs.readFileSync(middleware, 'utf8');
      const securityHeaders = [
        'X-Frame-Options',
        'X-Content-Type-Options',
        'X-XSS-Protection',
        'Strict-Transport-Security'
      ];
      
      securityHeaders.forEach(header => {
        if (content.includes(header)) {
          this.addResult('passed', `✅ Security header ${header} configured`, CHECK_CATEGORIES.MEDIUM);
        } else {
          this.addResult('warnings', `⚠️ Security header ${header} not configured`, CHECK_CATEGORIES.MEDIUM);
        }
      });
    }
  }

  // Performance Checks
  async checkPerformance() {
    console.log('\n⚡ Checking Performance Configuration...');
    
    // Check bundle size
    try {
      console.log('   Building production bundle...');
      execSync('npm run build', { stdio: 'ignore' });
      
      const distDir = path.join(__dirname, '..', 'dist');
      if (fs.existsSync(distDir)) {
        const getDirectorySize = (dir) => {
          let size = 0;
          const files = fs.readdirSync(dir);
          files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
              size += stat.size;
            } else if (stat.isDirectory()) {
              size += getDirectorySize(filePath);
            }
          });
          return size;
        };
        
        const bundleSize = getDirectorySize(distDir);
        const bundleSizeMB = (bundleSize / (1024 * 1024)).toFixed(2);
        
        if (bundleSizeMB < 5) {
          this.addResult('passed', `✅ Bundle size is optimal: ${bundleSizeMB} MB`, CHECK_CATEGORIES.MEDIUM);
        } else if (bundleSizeMB < 10) {
          this.addResult('warnings', `⚠️ Bundle size is large: ${bundleSizeMB} MB`, CHECK_CATEGORIES.MEDIUM);
        } else {
          this.addResult('failed', `❌ Bundle size is too large: ${bundleSizeMB} MB`, CHECK_CATEGORIES.HIGH);
        }
      }
    } catch (error) {
      this.addResult('failed', `❌ Build failed: ${error.message}`, CHECK_CATEGORIES.CRITICAL);
      this.criticalFailures++;
    }

    // Check for caching configuration
    const cacheFiles = [
      'next.config.js',
      'vercel.json',
      'public/_headers'
    ];
    
    let cacheConfigured = false;
    cacheFiles.forEach(file => {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('Cache-Control') || content.includes('cache')) {
          cacheConfigured = true;
        }
      }
    });
    
    if (cacheConfigured) {
      this.addResult('passed', '✅ Caching strategy configured', CHECK_CATEGORIES.MEDIUM);
    } else {
      this.addResult('warnings', '⚠️ No caching strategy found', CHECK_CATEGORIES.MEDIUM);
    }
  }

  // Error Handling Checks
  checkErrorHandling() {
    console.log('\n🛡️ Checking Error Handling...');
    
    const errorHandlingFiles = [
      'src/lib/errorHandler.ts',
      'src/lib/logger.ts',
      'src/components/ErrorBoundaryEnhanced.tsx',
      'src/lib/apiClient.ts'
    ];
    
    errorHandlingFiles.forEach(file => {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        this.addResult('passed', `✅ ${path.basename(file)} exists`, CHECK_CATEGORIES.HIGH);
      } else {
        this.addResult('failed', `❌ ${path.basename(file)} missing`, CHECK_CATEGORIES.HIGH);
      }
    });

    // Check for error boundaries in main app
    const mainFile = path.join(__dirname, '..', 'src', 'main.tsx');
    if (fs.existsSync(mainFile)) {
      const content = fs.readFileSync(mainFile, 'utf8');
      if (content.includes('ErrorBoundary')) {
        this.addResult('passed', '✅ Error boundary configured in main app', CHECK_CATEGORIES.HIGH);
      } else {
        this.addResult('warnings', '⚠️ No error boundary in main app', CHECK_CATEGORIES.HIGH);
      }
    }
  }

  // Testing Checks
  checkTestCoverage() {
    console.log('\n🧪 Checking Test Coverage...');
    
    try {
      // Check if tests exist
      const testDirs = [
        'src/__tests__',
        'src/test',
        '__tests__',
        'tests'
      ];
      
      let testFilesFound = 0;
      testDirs.forEach(dir => {
        const dirPath = path.join(__dirname, '..', dir);
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          testFilesFound += files.filter(f => f.includes('.test.') || f.includes('.spec.')).length;
        }
      });
      
      if (testFilesFound > 10) {
        this.addResult('passed', `✅ Found ${testFilesFound} test files`, CHECK_CATEGORIES.MEDIUM);
      } else if (testFilesFound > 0) {
        this.addResult('warnings', `⚠️ Only ${testFilesFound} test files found`, CHECK_CATEGORIES.MEDIUM);
      } else {
        this.addResult('failed', '❌ No test files found', CHECK_CATEGORIES.HIGH);
      }
      
      // Try to run tests
      console.log('   Running tests...');
      execSync('npm test -- --run', { stdio: 'ignore' });
      this.addResult('passed', '✅ Tests pass', CHECK_CATEGORIES.HIGH);
    } catch (error) {
      this.addResult('warnings', '⚠️ Tests failed or not configured', CHECK_CATEGORIES.MEDIUM);
    }
  }

  // Monitoring Checks
  checkMonitoring() {
    console.log('\n📊 Checking Monitoring Configuration...');
    
    // Check for monitoring services
    const monitoringIndicators = [
      { env: 'SENTRY_DSN', name: 'Sentry' },
      { env: 'NEXT_PUBLIC_GA_MEASUREMENT_ID', name: 'Google Analytics' },
      { env: 'DATADOG_API_KEY', name: 'Datadog' },
      { env: 'NEW_RELIC_LICENSE_KEY', name: 'New Relic' }
    ];
    
    let monitoringConfigured = false;
    monitoringIndicators.forEach(({ env, name }) => {
      if (process.env[env]) {
        this.addResult('passed', `✅ ${name} configured`, CHECK_CATEGORIES.MEDIUM);
        monitoringConfigured = true;
      }
    });
    
    if (!monitoringConfigured) {
      this.addResult('warnings', '⚠️ No monitoring service configured', CHECK_CATEGORIES.MEDIUM);
    }

    // Check for health check endpoint
    const healthCheckFiles = [
      'src/app/api/health/route.ts',
      'src/pages/api/health.ts',
      'app/api/health/route.ts'
    ];
    
    let healthCheckExists = false;
    healthCheckFiles.forEach(file => {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        healthCheckExists = true;
        this.addResult('passed', '✅ Health check endpoint exists', CHECK_CATEGORIES.MEDIUM);
      }
    });
    
    if (!healthCheckExists) {
      this.addResult('warnings', '⚠️ No health check endpoint found', CHECK_CATEGORIES.MEDIUM);
    }
  }

  // Backup Checks
  async checkBackupConfiguration() {
    console.log('\n💾 Checking Backup Configuration...');
    
    const backupScript = path.join(__dirname, 'backup-database.js');
    const restoreScript = path.join(__dirname, 'restore-database.js');
    
    if (fs.existsSync(backupScript)) {
      this.addResult('passed', '✅ Backup script exists', CHECK_CATEGORIES.HIGH);
    } else {
      this.addResult('failed', '❌ Backup script missing', CHECK_CATEGORIES.HIGH);
    }
    
    if (fs.existsSync(restoreScript)) {
      this.addResult('passed', '✅ Restore script exists', CHECK_CATEGORIES.HIGH);
    } else {
      this.addResult('failed', '❌ Restore script missing', CHECK_CATEGORIES.HIGH);
    }
    
    // Check for backup directory
    const backupDir = path.join(__dirname, '..', 'backups');
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir);
      const backupFiles = files.filter(f => f.startsWith('backup_'));
      if (backupFiles.length > 0) {
        this.addResult('passed', `✅ ${backupFiles.length} backup files found`, CHECK_CATEGORIES.LOW);
      } else {
        this.addResult('info', 'ℹ️ No backup files yet', CHECK_CATEGORIES.LOW);
      }
    } else {
      this.addResult('info', 'ℹ️ Backup directory will be created on first backup', CHECK_CATEGORIES.LOW);
    }
  }

  // Documentation Checks
  checkDocumentation() {
    console.log('\n📚 Checking Documentation...');
    
    const requiredDocs = [
      'README.md',
      'DEPLOYMENT.md',
      '.env.example'
    ];
    
    requiredDocs.forEach(doc => {
      const docPath = path.join(__dirname, '..', doc);
      if (fs.existsSync(docPath)) {
        const content = fs.readFileSync(docPath, 'utf8');
        if (content.length > 100) {
          this.addResult('passed', `✅ ${doc} exists and has content`, CHECK_CATEGORIES.LOW);
        } else {
          this.addResult('warnings', `⚠️ ${doc} exists but is minimal`, CHECK_CATEGORIES.LOW);
        }
      } else {
        this.addResult('warnings', `⚠️ ${doc} is missing`, CHECK_CATEGORIES.LOW);
      }
    });
  }

  // Helper methods
  addResult(type, message, category) {
    this.results[type].push({ message, category });
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 PRODUCTION READINESS REPORT');
    console.log('='.repeat(60));
    
    const totalChecks = this.results.passed.length + this.results.failed.length;
    const passRate = ((this.results.passed.length / totalChecks) * 100).toFixed(1);
    
    console.log(`\n📊 Summary: ${this.results.passed.length}/${totalChecks} checks passed (${passRate}%)`);
    console.log(`   Critical Failures: ${this.criticalFailures}`);
    
    if (this.results.failed.length > 0) {
      console.log('\n❌ FAILED CHECKS:');
      this.results.failed.forEach(({ message, category }) => {
        console.log(`   [${category}] ${message}`);
      });
    }
    
    if (this.results.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      this.results.warnings.forEach(({ message, category }) => {
        console.log(`   [${category}] ${message}`);
      });
    }
    
    if (this.results.passed.length > 0) {
      console.log('\n✅ PASSED CHECKS:');
      this.results.passed.forEach(({ message, category }) => {
        console.log(`   [${category}] ${message}`);
      });
    }
    
    if (this.results.info.length > 0) {
      console.log('\nℹ️ INFORMATION:');
      this.results.info.forEach(({ message }) => {
        console.log(`   ${message}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (this.criticalFailures > 0) {
      console.log('🚨 RESULT: NOT READY FOR PRODUCTION');
      console.log(`   Fix ${this.criticalFailures} critical issues before deployment`);
    } else if (this.results.failed.length > 0) {
      console.log('⚠️ RESULT: READY WITH WARNINGS');
      console.log('   Consider fixing non-critical issues');
    } else {
      console.log('✅ RESULT: READY FOR PRODUCTION');
      console.log('   All critical checks passed');
    }
    
    console.log('='.repeat(60) + '\n');
    
    return this.criticalFailures === 0;
  }

  async runAllChecks() {
    console.log('🚀 Starting Production Readiness Checks...\n');
    
    this.checkEnvironmentVariables();
    await this.checkDatabaseConnection();
    this.checkSecurityConfiguration();
    await this.checkPerformance();
    this.checkErrorHandling();
    this.checkTestCoverage();
    this.checkMonitoring();
    await this.checkBackupConfiguration();
    this.checkDocumentation();
    
    const isReady = this.printResults();
    
    // Generate detailed report
    const reportPath = path.join(__dirname, '..', 'production-readiness-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      isReady,
      criticalFailures: this.criticalFailures,
      results: this.results,
      passRate: ((this.results.passed.length / (this.results.passed.length + this.results.failed.length)) * 100).toFixed(1)
    }, null, 2));
    
    console.log(`📄 Detailed report saved to: ${reportPath}\n`);
    
    process.exit(isReady ? 0 : 1);
  }
}

// Run checks
const checker = new ProductionReadinessChecker();
checker.runAllChecks().catch(error => {
  console.error('❌ Error running checks:', error);
  process.exit(1);
});