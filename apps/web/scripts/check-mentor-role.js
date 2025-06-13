const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkMentorRole() {
  try {
    // glasswerksさんのユーザーを検索
    const user = await prisma.users.findFirst({
      where: {
        email: 'glasswerkskimny@gmail.com'
      },
      include: {
        roles: true
      }
    });

    console.log('ユーザー情報:', {
      id: user?.id,
      email: user?.email,
      role_id: user?.role_id,
      roles: user?.roles
    });

    // 全てのロールを確認
    const allRoles = await prisma.roles.findMany();
    console.log('\n全ロール:', allRoles);

    // メンターロールを持つユーザーを確認
    const mentorUsers = await prisma.users.findMany({
      where: {
        role_id: 'mentor'
      },
      include: {
        roles: true
      }
    });
    console.log('\nメンターユーザー数:', mentorUsers.length);
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMentorRole();