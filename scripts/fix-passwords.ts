import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Atualizando senhas com hash correto...\n');
  
  const users = [
    { email: 'sistema@agendazap.com', password: 'Sistema@2024' },
    { email: 'barbeiro@teste.com', password: 'Teste@2024' },
    { email: 'clinica@teste.com', password: 'Teste@2024' },
    { email: 'spa@teste.com', password: 'Teste@2024' },
  ];
  
  for (const user of users) {
    const hashedPassword = await hash(user.password, 12);
    await prisma.user.update({
      where: { email: user.email },
      data: { password: hashedPassword }
    });
    console.log(`  ✅ ${user.email} - senha atualizada`);
  }
  
  console.log('\n✅ Todas as senhas foram atualizadas!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
