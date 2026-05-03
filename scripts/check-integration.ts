import { db } from '../src/lib/db';

async function main() {
  const integrations = await db.integration.findMany({ where: { type: 'whatsapp' } });
  for (const i of integrations) {
    const account = await db.account.findUnique({ where: { id: i.accountId } });
    console.log('=== Integration:', account?.businessName, '===');
    console.log('Status:', i.status);
    console.log('Config:', i.config);
    try {
      const creds = JSON.parse(i.credentials);
      console.log('Credentials keys:', Object.keys(creds));
      console.log('Instance:', creds.instanceName);
      console.log('Has ApiKey:', !!creds.apiKey);
    } catch {
      console.log('Credentials (raw):', i.credentials.substring(0, 200));
    }
  }
  await db.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
