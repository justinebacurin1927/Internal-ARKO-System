import { PrismaClient, TaskStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  // 4-person internal team: 1 admin + 3 members.
  const [admin, alex, sam, jordan] = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@arko.local" },
      update: {},
      create: { email: "admin@arko.local", name: "Avery Admin", role: "ADMIN", passwordHash },
    }),
    prisma.user.upsert({
      where: { email: "alex@arko.local" },
      update: {},
      create: { email: "alex@arko.local", name: "Alex Member", role: "MEMBER", passwordHash },
    }),
    prisma.user.upsert({
      where: { email: "sam@arko.local" },
      update: {},
      create: { email: "sam@arko.local", name: "Sam Member", role: "MEMBER", passwordHash },
    }),
    prisma.user.upsert({
      where: { email: "jordan@arko.local" },
      update: {},
      create: { email: "jordan@arko.local", name: "Jordan Member", role: "MEMBER", passwordHash },
    }),
  ]);

  // Fresh task data each run.
  await prisma.task.deleteMany();
  await prisma.milestone.deleteMany();

  const sprint1 = await prisma.milestone.create({
    data: { name: "Sprint 1 — MVP Foundation", description: "Auth, tasks, docs.", order: 0 },
  });
  const launch = await prisma.milestone.create({
    data: { name: "MVP Launch", description: "Ship to the team.", order: 1 },
  });

  await prisma.task.createMany({
    data: [
      { title: "Set up accounts & roles", status: TaskStatus.DONE, order: 0, milestoneId: sprint1.id, assigneeId: admin.id },
      { title: "Task board kanban view", status: TaskStatus.DEV, order: 1, milestoneId: sprint1.id, assigneeId: alex.id },
      { title: "Comments + @mentions", status: TaskStatus.DESIGN, order: 2, milestoneId: sprint1.id, assigneeId: sam.id },
      { title: "Markdown documentation pages", status: TaskStatus.BACKLOG, order: 3, milestoneId: sprint1.id, assigneeId: jordan.id },
      { title: "File attachments via S3", status: TaskStatus.BACKLOG, order: 4, milestoneId: sprint1.id },
      { title: "Deploy & onboard the team", status: TaskStatus.BACKLOG, order: 0, milestoneId: launch.id },
    ],
  });

  await prisma.document.create({
    data: {
      title: "Welcome to ARKO",
      contentMd:
        "# Welcome to ARKO\n\nThis is the internal collaboration platform.\n\n- Track work on the **Board**\n- Write **Docs** like this one\n- Mention teammates with `@alex`\n",
      authorId: admin.id,
      milestoneId: sprint1.id,
    },
  });

  console.log("Seed complete. Login with any of:");
  console.log("  admin@arko.local / password123  (ADMIN)");
  console.log("  alex@arko.local  / password123  (MEMBER)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
