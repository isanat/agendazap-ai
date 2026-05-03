import { db } from '../src/lib/db';

async function main() {
  console.log('=== Updating AI Providers ===\n');

  // Update Groq provider with new API key
  const groqUpdate = await db.aIProvider.updateMany({
    where: { name: { contains: 'Groq' } },
    data: { 
      apiKey: 'GROQ_API_KEY_REDACTED',
      isEnabled: true,
      model: 'llama-3.3-70b-versatile',
    }
  });
  console.log(`Groq: Updated ${groqUpdate.count} provider(s)`);

  // Update ZAI/Zhipu provider with correct Z.AI API key
  const zaiUpdate = await db.aIProvider.updateMany({
    where: { name: { contains: 'ZAI' } },
    data: {
      apiKey: 'ed6a82df711947778e3f7dbe7773bdb6.nrydZc7MImQwWWgM',
      isEnabled: true,
      baseUrl: 'https://api.z.ai/api/paas/v4',
      model: 'GLM-4.5-Air',
    }
  });
  console.log(`ZAI: Updated ${zaiUpdate.count} provider(s)`);

  // Update Zhipu provider  
  const zhipuUpdate = await db.aIProvider.updateMany({
    where: { name: { equals: 'zhipu' } },
    data: {
      apiKey: 'ed6a82df711947778e3f7dbe7773bdb6.nrydZc7MImQwWWgM',
      isEnabled: true,
      baseUrl: 'https://api.z.ai/api/paas/v4',
      model: 'GLM-4.5-Air',
    }
  });
  console.log(`Zhipu: Updated ${zhipuUpdate.count} provider(s)`);

  // Verify
  console.log('\n=== Updated Providers ===');
  const providers = await db.aIProvider.findMany({ orderBy: { priority: 'asc' } });
  for (const p of providers) {
    console.log(`  ${p.name} | enabled=${p.isEnabled} | model=${p.model} | baseUrl=${p.baseUrl || 'N/A'} | apiKey=${p.apiKey ? p.apiKey.substring(0, 15) + '...' : 'EMPTY'}`);
  }

  await db.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
