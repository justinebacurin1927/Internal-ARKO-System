import { prisma } from '../src/index'
import { hash } from 'bcryptjs'

async function main() {
  const email = 'admin@arko.app'
  const password = 'admin123'

  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } })
    console.log(`✓ Upgraded ${email} to ADMIN`)
  } else {
    const hashed = await hash(password, 12)
    await prisma.user.create({
      data: { name: 'Admin', email, password: hashed, role: 'ADMIN' },
    })
    console.log(`✓ Created admin account: ${email} / ${password}`)
  }

  const users = await prisma.user.findMany({
    select: { email: true, name: true, role: true },
  })
  console.log('\nAll users:')
  for (const u of users) {
    console.log(`  ${u.email.padEnd(25)} ${u.role.padEnd(8)} ${u.name ?? ''}`)
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
