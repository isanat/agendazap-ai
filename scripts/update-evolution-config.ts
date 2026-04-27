import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating Evolution API credentials...');

  // Find or create system configuration
  let systemConfig = await prisma.systemConfiguration.findFirst();
  
  const evolutionConfig = {
    evolutionApiUrl: 'http://95.111.231.60:8080',
    evolutionApiKey: 'AGEND!A_zAP_2026@01070801',
    evolutionWebhookUrl: 'https://agendazap-ai.vercel.app/api/webhooks/evolution',
  };
  
  if (!systemConfig) {
    systemConfig = await prisma.systemConfiguration.create({
      data: {
        systemName: 'AgendaZap',
        platformFeePercent: 5,
        platformFeeFixed: 0.50,
        ...evolutionConfig,
      }
    });
    console.log('System configuration created!');
  } else {
    systemConfig = await prisma.systemConfiguration.update({
      where: { id: systemConfig.id },
      data: evolutionConfig
    });
    console.log('System configuration updated!');
  }

  console.log('\n=== Evolution API Configuration ===');
  console.log('URL:', evolutionConfig.evolutionApiUrl);
  console.log('API Key:', evolutionConfig.evolutionApiKey);
  console.log('Webhook URL:', evolutionConfig.evolutionWebhookUrl);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
