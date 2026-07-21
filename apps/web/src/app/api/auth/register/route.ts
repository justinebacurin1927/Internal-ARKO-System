import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@arko/db'
import { z } from 'zod'
import { registerLimiter, requestKey } from '../../../../lib/rate-limit'

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(req: Request) {
  // Rate limit: 5 registrations per minute per IP
  const ipKey = requestKey(req)
  const rateCheck = registerLimiter.check(ipKey)
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)),
        },
      },
    )
  }

  try {
    const json = await req.json()
    const body = registerSchema.parse(json)

    const existing = await prisma.user.findUnique({
      where: { email: body.email },
    })

    if (existing) {
      // Generic error to prevent user enumeration
      return NextResponse.json(
        { error: 'Registration failed. Please check your details and try again.' },
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
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
