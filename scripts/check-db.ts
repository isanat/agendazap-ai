// Use the same db connection as the app
import { db } from '../src/lib/db';

async function main() {
  console.log('=== Checking Database ===\n');
  
  // Check SystemConfiguration
  const sysConfig = await db.systemConfiguration.findFirst();
  console.log('SystemConfiguration:', sysConfig ? 'EXISTS' : 'NOT FOUND');
  if (sysConfig) {
    console.log('  ID:', sysConfig.id);
    console.log('  System Name:', sysConfig.systemName);
    console.log('  Evolution API URL:', sysConfig.evolutionApiUrl || 'NOT SET');
  }
  
  // Check AI Providers
  const providers = await db.aIProvider.findMany({
    orderBy: { priority: 'asc' }
  });
  console.log('\nAI Providers count:', providers.length);
  for (const p of providers) {
    console.log(`  - ${p.displayName} (${p.name})`);
    console.log(`    ID: ${p.id}`);
    console.log(`    API Key: ${p.apiKey ? p.apiKey.substring(0, 15) + '...' : 'EMPTY'}`);
    console.log(`    Base URL: ${p.baseUrl || 'NOT SET'}`);
    console.log(`    Model: ${p.model}`);
    console.log(`    Enabled: ${p.isEnabled}`);
    console.log(`    Priority: ${p.priority}`);
  }
  
  // Check Users
  const users = await db.user.findMany({
    where: { role: 'superadmin' },
    select: { email: true, name: true, role: true }
  });
  console.log('\nSuperAdmin Users:', users.length);
  for (const u of users) {
    console.log(`  - ${u.email} (${u.name})`);
  }
  
  // Check Accounts
  const accounts = await db.account.findMany({
    select: { id: true, businessName: true, whatsappNumber: true }
  });
  console.log('\nAccounts:', accounts.length);
  
  await db.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
