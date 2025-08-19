const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupUser() {
  try {
    // Hash the password 'password123'
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Update the test user
    const user = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: { password: hashedPassword },
      create: {
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword,
      },
    });

    console.log('✅ Test user ready:', { username: user.username, email: user.email });
    console.log('🔑 Use password: password123');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupUser();
