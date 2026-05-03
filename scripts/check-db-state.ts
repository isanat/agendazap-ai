import { db } from '../src/lib/db';

async function main() {
  console.log('=== AI PROVIDERS ===');
  const providers = await db.aIProvider.findMany({ orderBy: { priority: 'asc' } });
  for (const p of providers) {
    console.log(`  ${p.name} | enabled=${p.isEnabled} | health=${p.healthStatus} | model=${p.model} | apiKey=${p.apiKey ? p.apiKey.substring(0, 15) + '...' : 'EMPTY'} | priority=${p.priority}`);
  }

  console.log('\n=== ACCOUNTS ===');
  const accounts = await db.account.findMany();
  for (const a of accounts) {
    const svcCount = await db.service.count({ where: { accountId: a.id } });
    const profCount = await db.professional.count({ where: { accountId: a.id } });
    const apptCount = await db.appointment.count({ where: { accountId: a.id } });
    console.log(`  ${a.id} | ${a.businessName} | plan=${a.plan} | whatsapp=${a.whatsappConnected} | services=${svcCount} | profs=${profCount} | appts=${apptCount}`);
  }

  console.log('\n=== WHATSAPP INTEGRATIONS ===');
  const integrations = await db.integration.findMany({ where: { type: 'whatsapp' } });
  for (const i of integrations) {
    const account = await db.account.findUnique({ where: { id: i.accountId } });
    let creds: any = {};
    try { creds = JSON.parse(i.credentials); } catch {}
    console.log(`  accountId=${i.accountId} | business=${account?.businessName} | status=${i.status} | instance=${creds.instanceName || 'N/A'}`);
  }

  console.log('\n=== SUBSCRIPTION PLANS ===');
  const plans = await db.subscriptionPlan.findMany({ orderBy: { sortOrder: 'asc' } });
  for (const p of plans) {
    console.log(`  ${p.name} | ${p.displayName} | price=${p.priceMonthly} | maxAI=${p.maxAiTokensMonth} | aiType=${p.aiModelType}`);
  }

  console.log('\n=== RECENT WHATSAPP MESSAGES (last 10) ===');
  const msgs = await db.whatsappMessage.findMany({ take: 10, orderBy: { createdAt: 'desc' } });
  for (const m of msgs) {
    console.log(`  ${m.createdAt.toISOString()} | ${m.direction} | ${m.clientPhone} | intent=${m.intent || 'N/A'} | msg=${m.message.substring(0, 80)}`);
  }

  await db.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
