import { generateChatCompletion } from '../src/lib/ai-provider-service';
import { generateSystemPrompt } from '../src/lib/ai-context-service';
import { db } from '../src/lib/db';

async function main() {
  const accountId = 'acc_mo4pje9qiuzyq8jd';
  
  console.log('=== Testing AI Booking Flow ===\n');

  // Generate real system prompt
  const systemPrompt = await generateSystemPrompt(accountId, '5541999999999');

  // Simulate a booking conversation
  const conversation = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: 'Oi, quero agendar um corte feminino para segunda-feira às 14h' },
  ];

  console.log('1. User: "Oi, quero agendar um corte feminino para segunda-feira às 14h"');
  const result1 = await generateChatCompletion(accountId, conversation, { requestType: 'booking' });
  console.log('   AI:', result1.content);
  console.log('   Has [AGENDAR]:', result1.content?.includes('[AGENDAR]'));
  console.log('');

  // Simulate user confirming
  if (!result1.content?.includes('[AGENDAR]')) {
    conversation.push({ role: 'assistant' as const, content: result1.content || '' });
    conversation.push({ role: 'user' as const, content: 'Sim, pode ser com a Valéria mesmo' });
    console.log('2. User: "Sim, pode ser com a Valéria mesmo"');
    const result2 = await generateChatCompletion(accountId, conversation, { requestType: 'booking' });
    console.log('   AI:', result2.content);
    console.log('   Has [AGENDAR]:', result2.content?.includes('[AGENDAR]'));
  }

  await db.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
