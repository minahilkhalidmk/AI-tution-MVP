const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('========================================');
  console.log('🌱 SEEDING MYSQL DATABASE VIA PRISMA ORM');
  console.log('========================================\n');

  const hashedPass = await bcrypt.hash('Admin123!', 10);

  // 1. Seed Users
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@aituition.app' },
    update: { full_name: 'Super Admin User', role: 'Super_Admin', status: 'active' },
    create: {
      full_name: 'Super Admin User',
      email: 'superadmin@aituition.app',
      password_hash: hashedPass,
      role: 'Super_Admin',
      account_type: 'institutional',
      status: 'active'
    }
  });
  console.log(`✔ Super Admin created: ${superAdmin.email} (ID: ${superAdmin.id})`);

  const student = await prisma.user.upsert({
    where: { email: 'student@example.com' },
    update: { full_name: 'Sample Student Ali Khan', role: 'student', grade: 10 },
    create: {
      full_name: 'Sample Student Ali Khan',
      email: 'student@example.com',
      password_hash: hashedPass,
      role: 'student',
      account_type: 'private',
      status: 'active',
      student_code: 'ALI101',
      grade: 10
    }
  });
  console.log(`✔ Student created: ${student.email} (ID: ${student.id})`);

  const tutor = await prisma.user.upsert({
    where: { email: 'tutor@example.com' },
    update: { full_name: 'Sample Tutor Sara Ahmed', role: 'tutor' },
    create: {
      full_name: 'Sample Tutor Sara Ahmed',
      email: 'tutor@example.com',
      password_hash: hashedPass,
      role: 'tutor',
      account_type: 'institutional',
      status: 'active'
    }
  });
  console.log(`✔ Tutor created: ${tutor.email} (ID: ${tutor.id})`);

  const parent = await prisma.user.upsert({
    where: { email: 'parent@example.com' },
    update: { full_name: 'Sample Parent Bilal Shah', role: 'parent' },
    create: {
      full_name: 'Sample Parent Bilal Shah',
      email: 'parent@example.com',
      password_hash: hashedPass,
      role: 'parent',
      account_type: 'private',
      status: 'active'
    }
  });
  console.log(`✔ Parent created: ${parent.email} (ID: ${parent.id})\n`);

  // 2. Link Parent and Student
  await prisma.parentStudentLink.upsert({
    where: {
      uk_parent_student: {
        parent_id: parent.id,
        student_id: student.id
      }
    },
    update: {},
    create: {
      parent_id: parent.id,
      student_id: student.id,
      relationship_type: 'parent'
    }
  });
  console.log(`✔ Linked Parent (${parent.id}) to Student (${student.id})`);

  // 3. Seed AI Prompt
  const existingPrompt = await prisma.aiPrompt.findFirst({ where: { id: 1 } });
  if (!existingPrompt) {
    await prisma.aiPrompt.create({
      data: {
        title: 'Math & Science Tutor Prompt',
        system_prompt: 'You are an empathetic, highly structured AI tutor for Mathematics and Physics. Guide students step by step.',
        learning_guardrails: 'Never solve homework directly. Use Socratic questioning techniques.',
        version: 1,
        updated_by: superAdmin.id
      }
    });
    console.log(`✔ Seeded AI Prompt`);
  }

  console.log('\n========================================');
  console.log('🎉 PRISMA SEED COMPLETED SUCCESSFULLY!');
  console.log('========================================\n');
}

main()
  .catch(e => {
    console.error('❌ Prisma Seed Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
