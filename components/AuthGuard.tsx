'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'

const PUBLIC_ROUTES = ['/login', '/signup'] // yaha jo public rakhna ho

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ok, setOk] = React.useState(false)

  React.useEffect(() => {
    // ✅ public pages allow
    if (PUBLIC_ROUTES.some((p) => pathname?.startsWith(p))) {
      setOk(true)
      return
    }

    // ✅ protected pages require token
    const token = localStorage.getItem('token')
    if (!token) {
      router.replace('/login')
      return
    }

    setOk(true)
  }, [pathname, router])

  if (!ok) return null
  return <>{children}</>
}
