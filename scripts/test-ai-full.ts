import { generateChatCompletion, canAccountUseAI } from '../src/lib/ai-provider-service';
import { generateSystemPrompt } from '../src/lib/ai-context-service';
import { db } from '../src/lib/db';

async function main() {
  const accountId = 'acc_mo4pje9qiuzyq8jd';
  
  console.log('=== Testing Full AI Pipeline with Real Prompt ===\n');

  // Get account info
  const account = await db.account.findUnique({ where: { id: accountId } });
  console.log('Account:', account?.businessName);
  console.log('Plan:', account?.plan);

  // Get services
  const services = await db.service.findMany({ where: { accountId } });
  console.log('Services:', services.map(s => `${s.name} (R$${s.price})`));

  // Generate real system prompt
  console.log('\n1. Generating system prompt...');
  const systemPrompt = await generateSystemPrompt(accountId, '5541984195685');
  console.log('Prompt length:', systemPrompt.length, 'chars');
  console.log('Prompt preview:', systemPrompt.substring(0, 300) + '...');

  // Get conversation history (last messages)
  const history = await db.whatsappMessage.findMany({
    where: { accountId, clientPhone: '5541984195685' },
    orderBy: { createdAt: 'desc' },
    take: 4,
  });
  
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    // Add history in reverse (oldest first)
    ...history.reverse().map(m => ({
      role: (m.direction === 'incoming' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.message
    })),
    { role: 'user' as const, content: 'Oi, quero agendar um corte de cabelo para amanhã às 14h com a Valéria' }
  ];

  console.log('\n2. Sending to AI with', messages.length, 'messages...');
  
  const result = await generateChatCompletion(accountId, messages, { requestType: 'booking' });
  
  console.log('\n=== AI Response ===');
  console.log('Success:', result.success);
  console.log('Provider:', result.provider);
  console.log('Model used:', result.fallbackUsed ? 'fallback' : 'primary');
  console.log('Tokens:', result.inputTokens, 'in /', result.outputTokens, 'out');
  console.log('\nResponse:');
  console.log(result.content);

  await db.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
