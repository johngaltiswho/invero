import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

// POST - Migrate clients from existing projects (one-time operation)
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Only allow this migration for admin/owner users
    // You might want to add additional checks here

    console.log('Starting client migration from projects...');

    // 1. Get unique client names from existing projects
    const { data: projectClients, error: fetchError } = await supabaseAdmin
      .from('projects')
      .select('contractor_id, client_name')
      .not('client_name', 'is', null)
      .neq('client_name', '');

    if (fetchError) {
      console.error('Error fetching project clients:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch project data'
      }, { status: 500 });
    }

    // 2. Group by contractor and deduplicate client names
    const clientsToInsert = [];
    const seenClients = new Set();

    for (const project of projectClients) {
      const key = `${project.contractor_id}-${project.client_name.toLowerCase().trim()}`;
      if (!seenClients.has(key)) {
        seenClients.add(key);
        clientsToInsert.push({
          contractor_id: project.contractor_id,
          name: project.client_name.trim(),
          status: 'active'
        });
      }
    }

    console.log(`Found ${clientsToInsert.length} unique clients to migrate`);

    // 3. Check which clients already exist to avoid duplicates
    const existingClientsQuery = await supabaseAdmin
      .from('clients')
      .select('contractor_id, name');

    const existingClients = new Set();
    if (existingClientsQuery.data) {
      for (const client of existingClientsQuery.data) {
        const key = `${client.contractor_id}-${client.name.toLowerCase().trim()}`;
        existingClients.add(key);
      }
    }

    // 4. Filter out clients that already exist
    const newClients = clientsToInsert.filter(client => {
      const key = `${client.contractor_id}-${client.name.toLowerCase().trim()}`;
      return !existingClients.has(key);
    });

    console.log(`${newClients.length} new clients to insert (${clientsToInsert.length - newClients.length} already exist)`);

    // 5. Insert new clients
    let insertedCount = 0;
    if (newClients.length > 0) {
      const { data: insertedClients, error: insertError } = await supabaseAdmin
        .from('clients')
        .insert(newClients)
        .select();

      if (insertError) {
        console.error('Error inserting clients:', insertError);
        return NextResponse.json({
          success: false,
          error: 'Failed to insert clients'
        }, { status: 500 });
      }

      insertedCount = insertedClients?.length || 0;
    }

    // 6. Get summary statistics
    const { data: summary } = await supabaseAdmin
      .from('clients')
      .select(`
        name,
        contractor_id,
        contractors!inner(company_name)
      `);

    const summaryByContractor = {};
    if (summary) {
      for (const client of summary) {
        const contractorName = client.contractors.company_name;
        if (!summaryByContractor[contractorName]) {
          summaryByContractor[contractorName] = 0;
        }
        summaryByContractor[contractorName]++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalClientsFound: clientsToInsert.length,
        clientsAlreadyExisted: clientsToInsert.length - newClients.length,
        newClientsInserted: insertedCount,
        summaryByContractor
      }
    });

  } catch (error) {
    console.error('Error in client migration:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error during migration'
    }, { status: 500 });
  }
}