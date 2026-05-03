import { generateChatCompletion, canAccountUseAI, type ChatMessage } from '../src/lib/ai-provider-service';

async function main() {
  console.log('=== Testing AI Pipeline ===\n');

  // Test 1: Check AI permissions
  console.log('1. Checking AI permissions for acc_mo4pje9qiuzyq8jd (Salão da Valéria)...');
  const permResult = await canAccountUseAI('acc_mo4pje9qiuzyq8jd');
  console.log('   Allowed:', permResult.allowed);
  console.log('   Reason:', permResult.reason || 'OK');
  console.log('   Tokens limit:', permResult.tokensLimit);
  console.log('   Tokens used:', permResult.tokensUsed);

  // Test 2: Generate a simple response
  console.log('\n2. Testing AI chat completion...');
  const messages: ChatMessage[] = [
    { role: 'system', content: 'Você é um assistente virtual de um salão de beleza chamado Salão da Valéria. Responda de forma simpática e breve em português.' },
    { role: 'user', content: 'Oi, quero agendar um corte de cabelo' }
  ];
  
  try {
    const result = await generateChatCompletion('acc_mo4pje9qiuzyq8jd', messages, { maxTokens: 500 });
    console.log('   Success:', result.success);
    console.log('   Provider:', result.provider);
    console.log('   Fallback:', result.fallbackUsed);
    console.log('   Response:', result.content?.substring(0, 300));
    if (result.error) console.log('   Error:', result.error);
    console.log('   Tokens in/out/total:', result.inputTokens, result.outputTokens, result.totalTokens);
  } catch (e: any) {
    console.log('   FAILED:', e.message?.substring(0, 300));
  }

  process.exit(0);
}
main();
