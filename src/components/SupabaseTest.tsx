'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SupabaseTest() {
  const [testResult, setTestResult] = useState<string>('');
  const [testing, setTesting] = useState(false);

  const testConnection = async () => {
    setTesting(true);
    setTestResult('Testing connection...');

    try {
      console.log('Starting Supabase connection test...');
      
      // Test 1: Basic connection
      const { data, error } = await supabase
        .from('project_boqs')
        .select('id')
        .limit(1);

      console.log('Connection test result:', { data, error });

      if (error) {
        setTestResult(`Connection failed: ${error.message}`);
        return;
      }

      // Test 2: Try to insert a test record
      const testBOQ = {
        project_id: 'test-project',
        contractor_id: 'test-contractor',
        upload_date: new Date().toISOString(),
        total_amount: 100000,
        file_name: 'test-file.xlsx'
      };

      const { data: insertData, error: insertError } = await (supabase as any)
        .from('project_boqs')
        .insert(testBOQ)
        .select()
        .single();

      if (insertError) {
        setTestResult(`Insert test failed: ${insertError.message} (Code: ${insertError.code})`);
        return;
      }

      // Clean up test record
      if (insertData) {
        await supabase
          .from('project_boqs')
          .delete()
          .eq('id', (insertData as any).id);
      }

      setTestResult('✅ All tests passed! Supabase connection is working.');

    } catch (error) {
      console.error('Test error:', error);
      setTestResult(`Test failed with error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-neutral-dark p-4 rounded-lg border border-neutral-medium mb-4">
      <h3 className="text-primary font-semibold mb-2">Supabase Connection Test</h3>
      <button
        onClick={testConnection}
        disabled={testing}
        className="bg-accent-amber text-neutral-dark px-4 py-2 rounded hover:bg-accent-amber/90 disabled:opacity-50 text-sm font-medium mb-2"
      >
        {testing ? 'Testing...' : 'Test Connection'}
      </button>
      {testResult && (
        <div className="text-sm text-secondary mt-2 p-2 bg-neutral-darker rounded">
          {testResult}
        </div>
      )}
    </div>
  );
}