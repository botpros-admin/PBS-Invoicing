/**
 * Test Laboratory Page
 * 
 * This page tests the new laboratory migration tables and functionality.
 * It verifies that the _lab_mig tables are accessible and working correctly.
 */

import React, { useState } from 'react';
import { supabase } from '../api/supabase';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  data?: any;
}

const TestLaboratory: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTestResult = (name: string, updates: Partial<TestResult>) => {
    setTestResults(prev => prev.map(test => 
      test.name === name ? { ...test, ...updates } : test
    ));
  };

  const runTests = async () => {
    setIsRunning(true);
    
    // Initialize tests
    const tests: TestResult[] = [
      { name: 'Check laboratories_lab_mig table', status: 'pending' },
      { name: 'Check clinics_lab_mig table', status: 'pending' },
      { name: 'Check invoice_line_items_lab_mig table', status: 'pending' },
      { name: 'Check disputes_lab_mig table', status: 'pending' },
      { name: 'Check price_schedules_lab_mig table', status: 'pending' },
      { name: 'Test accession number uniqueness', status: 'pending' },
      { name: 'Test clinic hierarchy', status: 'pending' },
      { name: 'Count migrated data', status: 'pending' }
    ];
    
    setTestResults(tests);

    // Test 1: Check laboratories_lab_mig table
    try {
      updateTestResult('Check laboratories_lab_mig table', { status: 'running' });
      const { data, error } = await supabase
        .from('laboratories_lab_mig')
        .select('*')
        .limit(1);
      
      if (error) throw error;
      updateTestResult('Check laboratories_lab_mig table', {
        status: 'success',
        message: `Table accessible. Found ${data?.length || 0} laboratories.`,
        data: data
      });
    } catch (error: any) {
      updateTestResult('Check laboratories_lab_mig table', {
        status: 'error',
        message: error.message
      });
    }

    // Test 2: Check clinics_lab_mig table
    try {
      updateTestResult('Check clinics_lab_mig table', { status: 'running' });
      const { data, error } = await supabase
        .from('clinics_lab_mig')
        .select('*')
        .limit(5);
      
      if (error) throw error;
      updateTestResult('Check clinics_lab_mig table', {
        status: 'success',
        message: `Table accessible. Found ${data?.length || 0} clinics.`,
        data: data
      });
    } catch (error: any) {
      updateTestResult('Check clinics_lab_mig table', {
        status: 'error',
        message: error.message
      });
    }

    // Test 3: Check invoice_line_items_lab_mig table
    try {
      updateTestResult('Check invoice_line_items_lab_mig table', { status: 'running' });
      const { data, error, count } = await supabase
        .from('invoice_line_items_lab_mig')
        .select('*', { count: 'exact', head: false })
        .limit(10);
      
      if (error) throw error;
      updateTestResult('Check invoice_line_items_lab_mig table', {
        status: 'success',
        message: `Table accessible. Total items: ${count || 0}`,
        data: data
      });
    } catch (error: any) {
      updateTestResult('Check invoice_line_items_lab_mig table', {
        status: 'error',
        message: error.message
      });
    }

    // Test 4: Check disputes_lab_mig table
    try {
      updateTestResult('Check disputes_lab_mig table', { status: 'running' });
      const { data, error } = await supabase
        .from('disputes_lab_mig')
        .select('*')
        .limit(5);
      
      if (error) throw error;
      updateTestResult('Check disputes_lab_mig table', {
        status: 'success',
        message: `Table accessible. Found ${data?.length || 0} disputes.`,
        data: data
      });
    } catch (error: any) {
      updateTestResult('Check disputes_lab_mig table', {
        status: 'error',
        message: error.message
      });
    }

    // Test 5: Check price_schedules_lab_mig table
    try {
      updateTestResult('Check price_schedules_lab_mig table', { status: 'running' });
      const { data, error } = await supabase
        .from('price_schedules_lab_mig')
        .select('*')
        .limit(5);
      
      if (error) throw error;
      updateTestResult('Check price_schedules_lab_mig table', {
        status: 'success',
        message: `Table accessible. Found ${data?.length || 0} price schedules.`,
        data: data
      });
    } catch (error: any) {
      updateTestResult('Check price_schedules_lab_mig table', {
        status: 'error',
        message: error.message
      });
    }

    // Test 6: Test accession number uniqueness
    try {
      updateTestResult('Test accession number uniqueness', { status: 'running' });
      const { data, error } = await supabase
        .from('invoice_line_items_lab_mig')
        .select('accession_number, cpt_code, invoice_id')
        .limit(100);
      
      if (error) throw error;
      
      // Check for duplicates
      const seen = new Set();
      let duplicates = 0;
      data?.forEach(item => {
        const key = `${item.invoice_id}-${item.accession_number}-${item.cpt_code}`;
        if (seen.has(key)) {
          duplicates++;
        }
        seen.add(key);
      });
      
      updateTestResult('Test accession number uniqueness', {
        status: duplicates === 0 ? 'success' : 'error',
        message: duplicates === 0 
          ? 'No duplicate accession/CPT combinations found' 
          : `Found ${duplicates} duplicate combinations`,
        data: { checked: data?.length || 0, duplicates }
      });
    } catch (error: any) {
      updateTestResult('Test accession number uniqueness', {
        status: 'error',
        message: error.message
      });
    }

    // Test 7: Test clinic hierarchy
    try {
      updateTestResult('Test clinic hierarchy', { status: 'running' });
      const { data, error } = await supabase
        .from('clinics_lab_mig')
        .select('id, name, parent_id')
        .not('parent_id', 'is', null)
        .limit(10);
      
      if (error) throw error;
      updateTestResult('Test clinic hierarchy', {
        status: 'success',
        message: `Found ${data?.length || 0} child clinics with parent relationships`,
        data: data
      });
    } catch (error: any) {
      updateTestResult('Test clinic hierarchy', {
        status: 'error',
        message: error.message
      });
    }

    // Test 8: Count migrated data
    try {
      updateTestResult('Count migrated data', { status: 'running' });
      
      const counts = await Promise.all([
        supabase.from('laboratories_lab_mig').select('*', { count: 'exact', head: true }),
        supabase.from('clinics_lab_mig').select('*', { count: 'exact', head: true }),
        supabase.from('invoice_line_items_lab_mig').select('*', { count: 'exact', head: true }),
        supabase.from('disputes_lab_mig').select('*', { count: 'exact', head: true }),
        supabase.from('price_schedules_lab_mig').select('*', { count: 'exact', head: true })
      ]);
      
      const summary = {
        laboratories: counts[0].count || 0,
        clinics: counts[1].count || 0,
        invoiceLineItems: counts[2].count || 0,
        disputes: counts[3].count || 0,
        priceSchedules: counts[4].count || 0
      };
      
      updateTestResult('Count migrated data', {
        status: 'success',
        message: 'Successfully counted all migrated data',
        data: summary
      });
    } catch (error: any) {
      updateTestResult('Count migrated data', {
        status: 'error',
        message: error.message
      });
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'error':
        return <XCircle className="text-red-500" size={20} />;
      case 'running':
        return <Loader2 className="text-blue-500 animate-spin" size={20} />;
      default:
        return <AlertCircle className="text-gray-400" size={20} />;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Laboratory Migration Test Suite</h2>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                This page tests the new _lab_mig tables created during the laboratory migration.
                Click "Run Tests" to verify that all tables are accessible and functioning correctly.
              </p>
            </div>
          </div>

          <button 
            onClick={runTests} 
            disabled={isRunning}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              isRunning 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isRunning ? (
              <span className="flex items-center justify-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Tests...
              </span>
            ) : (
              'Run Tests'
            )}
          </button>

          {testResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Test Results:</h3>
              {testResults.map((test, index) => (
                <div 
                  key={index} 
                  className="flex items-start space-x-3 p-3 border rounded-lg bg-gray-50"
                >
                  {getStatusIcon(test.status)}
                  <div className="flex-1">
                    <div className="font-medium">{test.name}</div>
                    {test.message && (
                      <div className="text-sm text-gray-600 mt-1">{test.message}</div>
                    )}
                    {test.data && (
                      <details className="mt-2">
                        <summary className="text-sm text-blue-600 cursor-pointer hover:underline">
                          View Data
                        </summary>
                        <pre className="mt-2 p-2 bg-white border rounded text-xs overflow-auto max-h-64">
                          {JSON.stringify(test.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {testResults.length > 0 && !isRunning && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <h4 className="font-semibold mb-2">Summary:</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {testResults.filter(t => t.status === 'success').length}
                  </div>
                  <div className="text-gray-600">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {testResults.filter(t => t.status === 'error').length}
                  </div>
                  <div className="text-gray-600">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-400">
                    {testResults.filter(t => t.status === 'pending').length}
                  </div>
                  <div className="text-gray-600">Pending</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestLaboratory;