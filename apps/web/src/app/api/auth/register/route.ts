import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@arko/db'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const body = registerSchema.parse(json)

    const existing = await prisma.user.findUnique({
      where: { email: body.email },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 },
      )
    }

    const hashedPassword = await hash(body.password, 12)

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashedPassword,
      },
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 422 })
    }
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
