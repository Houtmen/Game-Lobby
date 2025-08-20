import { prisma } from './src/lib/prisma';
import { hashPassword } from './src/lib/auth/jwt';

async function createTestUser() {
  try {
    console.log('🔧 Creating test user...');

    const hashedPassword = await hashPassword('testpassword123');

    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        username: 'testuser',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        provider: 'email',
        subscriptionTier: 'FREE',
      },
    });

    console.log('✅ Test user created:', user.email);
    console.log('📧 Email: test@example.com');
    console.log('🔑 Password: testpassword123');
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  }
}

createTestUser()
  .catch(console.error)
  .finally(() => process.exit(0));
