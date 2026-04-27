import { PrismaClient } from '@prisma/client';
import { hash, compare } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Verifying superadmin...');
  
  const superAdmin = await prisma.user.findFirst({
    where: { role: 'superadmin' }
  });
  
  if (!superAdmin) {
    console.log('No superadmin found!');
    return;
  }
  
  console.log('SuperAdmin found:');
  console.log('- ID:', superAdmin.id);
  console.log('- Email:', superAdmin.email);
  console.log('- Name:', superAdmin.name);
  console.log('- Role:', superAdmin.role);
  console.log('- IsActive:', superAdmin.isActive);
  
  // Check if password is a bcrypt hash (starts with $2)
  const isBcryptHash = superAdmin.password.startsWith('$2');
  console.log('- Has bcrypt hash:', isBcryptHash);
  
  if (!isBcryptHash) {
    console.log('\n⚠️  WARNING: Password is using legacy hash. Migrating to bcrypt...');
    
    // The old password was stored with simpleHash, we need to reset it
    const newPassword = '@!Isa46936698';
    const hashedPassword = await hash(newPassword, 12);
    
    await prisma.user.update({
      where: { id: superAdmin.id },
      data: { password: hashedPassword }
    });
    
    console.log('Password migrated to bcrypt!');
    console.log('Password has been reset to: @!Isa46936698');
  } else {
    // Verify the bcrypt hash works
    const testPassword = '@!Isa46936698';
    const isValid = await compare(testPassword, superAdmin.password);
    console.log('\nPassword verification:');
    console.log('- Password "@!Isa46936698" is valid:', isValid);
    
    if (!isValid) {
      console.log('\nResetting password to default...');
      const hashedPassword = await hash(testPassword, 12);
      await prisma.user.update({
        where: { id: superAdmin.id },
        data: { password: hashedPassword }
      });
      console.log('Password has been reset!');
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
