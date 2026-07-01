import { Suspense } from 'react'
import LoginClient from './login-client'

export default function LoginPage() {
  return (
    <div className="flex flex-col lg:flex-row min-h-[100dvh] bg-[#09090b]">
      <Suspense fallback={null}>
        <LoginClient />
      </Suspense>
    </div>
  )
}
