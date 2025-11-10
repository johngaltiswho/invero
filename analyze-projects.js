const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  'https://znptpavdrspbrrmqlqzf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpucHRwYXZkcnNwYnJybXFscXpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU0OTA5NiwiZXhwIjoyMDc0MTI1MDk2fQ.d2M3dTNNehWb-5QWjI9egO4OWuSQXmAarbGK1nqsEWc'
);

async function analyzeProjects() {
  try {
    console.log('🔍 Analyzing Projects Database...\n');

    // Get all contractors
    const { data: contractors, error: contractorError } = await supabase
      .from('contractors')
      .select('id, company_name, clerk_user_id');

    if (contractorError) {
      console.error('Error fetching contractors:', contractorError);
      return;
    }

    console.log(`📊 Found ${contractors.length} contractors:\n`);
    contractors.forEach((contractor, i) => {
      console.log(`${i + 1}. ${contractor.company_name} (ID: ${contractor.id})`);
    });

    // Get all projects
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select(`
        id, 
        project_name, 
        client_name, 
        project_status, 
        estimated_value, 
        po_number,
        funding_status,
        contractor_id,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (projectError) {
      console.error('Error fetching projects:', projectError);
      return;
    }

    console.log(`\n📋 Found ${projects.length} projects total:\n`);

    // Group projects by status
    const statusGroups = {};
    projects.forEach(project => {
      const status = project.project_status || 'null';
      if (!statusGroups[status]) {
        statusGroups[status] = [];
      }
      statusGroups[status].push(project);
    });

    // Display by status
    Object.keys(statusGroups).forEach(status => {
      console.log(`\n🏷️  Status: ${status} (${statusGroups[status].length} projects)`);
      console.log('─'.repeat(50));
      
      statusGroups[status].forEach((project, i) => {
        const contractor = contractors.find(c => c.id === project.contractor_id);
        console.log(`${i + 1}. ${project.project_name}`);
        console.log(`   Client: ${project.client_name}`);
        console.log(`   Contractor: ${contractor?.company_name || 'Unknown'}`);
        console.log(`   Value: ₹${project.estimated_value || 0}`);
        console.log(`   Created: ${new Date(project.created_at).toLocaleDateString()}`);
        if (project.po_number) console.log(`   PO: ${project.po_number}`);
        console.log('');
      });
    });

    // Get clients
    const { data: clients, error: clientError } = await supabase
      .from('clients')
      .select('id, name, contractor_id, status, company_type');

    if (!clientError) {
      console.log(`\n👥 Found ${clients.length} clients:\n`);
      
      // Group clients by contractor
      const clientsByContractor = {};
      clients.forEach(client => {
        if (!clientsByContractor[client.contractor_id]) {
          clientsByContractor[client.contractor_id] = [];
        }
        clientsByContractor[client.contractor_id].push(client);
      });

      Object.keys(clientsByContractor).forEach(contractorId => {
        const contractor = contractors.find(c => c.id === contractorId);
        const contractorClients = clientsByContractor[contractorId];
        
        console.log(`\n🏢 ${contractor?.company_name || 'Unknown Contractor'} (${contractorClients.length} clients):`);
        contractorClients.forEach((client, i) => {
          console.log(`   ${i + 1}. ${client.name} (${client.status})`);
          if (client.company_type) console.log(`      Type: ${client.company_type}`);
        });
      });
    }

    console.log('\n✅ Analysis complete!');

  } catch (error) {
    console.error('Error in analysis:', error);
  }
}

analyzeProjects();