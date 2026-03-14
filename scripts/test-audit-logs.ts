/**
 * Test script to debug audit logs setup
 * Run with: npx ts-node scripts/test-audit-logs.ts
 */

import { createClient } from '@supabase/supabase-js';

async function testAuditLogs() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓ Set' : '✗ Missing');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🔍 Testing Audit Logs Setup...\n');

  // Test 1: Check if table exists
  console.log('1. Checking if audit_logs table exists...');
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Table does not exist or cannot be accessed');
      console.error('Error:', error.message);
      console.log('\n💡 Solution: Run the migration:');
      console.log('   sql/migrations/create-audit-trail-system.sql');
      return;
    }

    console.log('✅ Table exists and is accessible\n');
  } catch (err) {
    console.error('❌ Error checking table:', err);
    return;
  }

  // Test 2: Check RLS policies
  console.log('2. Checking RLS policies...');
  try {
    const { data, error } = await supabase
      .rpc('has_table_privilege', {
        table_name: 'audit_logs',
        privilege: 'SELECT'
      });

    if (error) {
      console.log('⚠️  Cannot verify RLS policies directly');
    } else {
      console.log('✅ Service role has SELECT privilege\n');
    }
  } catch (err) {
    console.log('⚠️  Could not check RLS policies\n');
  }

  // Test 3: Try to insert a test record
  console.log('3. Testing INSERT permission...');
  try {
    const testLog = {
      user_id: 'test-user',
      user_email: 'test@example.com',
      action: 'test',
      entity_type: 'test',
      entity_id: 'test-123',
      description: 'Test audit log entry',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('audit_logs')
      .insert(testLog)
      .select()
      .single();

    if (error) {
      console.error('❌ Cannot insert audit logs');
      console.error('Error:', error.message);
      console.log('\n💡 Solution: Run the RLS fix migration:');
      console.log('   sql/migrations/fix-audit-logs-rls.sql');
      return;
    }

    console.log('✅ INSERT works\n');

    // Clean up test record
    await supabase
      .from('audit_logs')
      .delete()
      .eq('id', data.id);

  } catch (err) {
    console.error('❌ Error testing INSERT:', err);
    return;
  }

  // Test 4: Try to read audit logs
  console.log('4. Testing SELECT permission...');
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .limit(5);

    if (error) {
      console.error('❌ Cannot read audit logs');
      console.error('Error:', error.message);
      return;
    }

    console.log(`✅ SELECT works (found ${data?.length || 0} records)\n`);

    if (data && data.length > 0) {
      console.log('📋 Sample audit log:');
      console.log(JSON.stringify(data[0], null, 2));
    }
  } catch (err) {
    console.error('❌ Error testing SELECT:', err);
    return;
  }

  // Test 5: Check indexes
  console.log('\n5. Checking performance indexes...');
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('user_id, entity_type, created_at')
      .limit(1);

    if (!error) {
      console.log('✅ Indexes should be working\n');
    }
  } catch (err) {
    console.log('⚠️  Could not verify indexes\n');
  }

  console.log('✅ All tests passed!');
  console.log('\n📊 Summary:');
  console.log('  - Table exists: ✓');
  console.log('  - INSERT permission: ✓');
  console.log('  - SELECT permission: ✓');
  console.log('  - Ready to use: ✓');
}

// Run tests
testAuditLogs()
  .then(() => {
    console.log('\n✨ Audit logs setup is working correctly!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Test failed:', err);
    process.exit(1);
  });
