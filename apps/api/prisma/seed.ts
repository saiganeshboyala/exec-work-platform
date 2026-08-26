/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

/**
 * Demo data for local development and for the QA environment.
 * Idempotent: safe to run repeatedly.
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  const passwordHash = await argon2.hash('DemoPassword123', { type: argon2.argon2id });

  const organization = await prisma.organization.upsert({
    where: { slug: 'cis-technologies' },
    update: { name: 'CIS Technologies' },
    create: { name: 'CIS Technologies', slug: 'cis-technologies' },
  });

  const people = [
    { email: 'ceo@northwind.test', fullName: 'Priya Raghavan', jobTitle: 'Chief executive', role: 'OWNER' as const },
    { email: 'coo@northwind.test', fullName: 'Daniel Okafor', jobTitle: 'Chief operating officer', role: 'ADMIN' as const },
    { email: 'pmo@northwind.test', fullName: 'Sara Lindqvist', jobTitle: 'Head of PMO', role: 'MANAGER' as const },
    { email: 'lead@northwind.test', fullName: 'Marcus Ivanov', jobTitle: 'Engineering lead', role: 'MEMBER' as const },
  ];

  const users = [];
  for (const person of people) {
    const user = await prisma.user.upsert({
      where: { email: person.email },
      update: { fullName: person.fullName, jobTitle: person.jobTitle },
      create: {
        email: person.email,
        fullName: person.fullName,
        jobTitle: person.jobTitle,
        passwordHash,
      },
    });
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
      update: { role: person.role },
      create: { userId: user.id, organizationId: organization.id, role: person.role },
    });
    users.push(user);
  }

  const workspace = await prisma.workspace.findFirst({
    where: { organizationId: organization.id, name: 'Company strategy' },
  }) ?? await prisma.workspace.create({
    data: {
      organizationId: organization.id,
      name: 'Company strategy',
      description: 'Board-level initiatives tracked for the executive committee',
    },
  });

  const boardSpecs = [
    { name: 'Market expansion', isPortfolio: true },
    { name: 'ERP migration', isPortfolio: true },
    { name: 'Hiring plan Q3', isPortfolio: false },
    { name: 'Compliance audit', isPortfolio: false },
  ];

  const day = 86_400_000;
  let seededItems = 0;

  for (const spec of boardSpecs) {
    const board =
      (await prisma.board.findFirst({ where: { workspaceId: workspace.id, name: spec.name } })) ??
      (await prisma.board.create({ data: { workspaceId: workspace.id, ...spec } }));

    const existing = await prisma.item.count({ where: { boardId: board.id } });
    if (existing > 0) continue;

    await prisma.item.createMany({
      data: [
        {
          boardId: board.id,
          title: `${spec.name}: define success measures`,
          status: 'DONE',
          priority: 'HIGH',
          ownerId: users[2]?.id,
          completedAt: new Date(Date.now() - 10 * day),
          dueDate: new Date(Date.now() - 12 * day),
        },
        {
          boardId: board.id,
          title: `${spec.name}: vendor shortlist`,
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
          ownerId: users[3]?.id,
          dueDate: new Date(Date.now() + 6 * day),
        },
        {
          boardId: board.id,
          title: `${spec.name}: budget sign-off`,
          status: 'BLOCKED',
          priority: 'CRITICAL',
          ownerId: users[1]?.id,
          blockedReason: 'Waiting on finance to release the revised capital envelope',
          dueDate: new Date(Date.now() - 2 * day),
        },
      ],
    });
    seededItems += 3;
  }

  console.log(`Seeded ${users.length} people, ${boardSpecs.length} boards, ${seededItems} items.`);
  console.log('Sign in with ceo@northwind.test / DemoPassword123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
