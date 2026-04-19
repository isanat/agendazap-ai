import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
});

async function updatePassword() {
  const email = 'netlinkassist@gmail.com';
  const newPassword = '@!Isa46936698';
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  console.log('New hash:', hashedPassword);
  
  const user = await prisma.user.update({
    where: { email },
    data: { password: hashedPassword }
  });
  
  console.log('Password updated for:', user.email);
  
  // Verify the hash works
  const isValid = await bcrypt.compare(newPassword, hashedPassword);
  console.log('Hash verification:', isValid);
}

updatePassword()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error('Error:', e);
    prisma.$disconnect();
  });
