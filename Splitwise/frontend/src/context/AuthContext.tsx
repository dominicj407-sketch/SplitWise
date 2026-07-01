import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { UsersApi } from '@api/index'
import type { UserResponse } from '@api/types'

interface AuthContextType {
  user: UserResponse | null
  setUser: (u: UserResponse | null) => void
}

const AuthContext = createContext<AuthContextType>({ user: null, setUser: () => {} })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem('auth_user')
    if (raw) setUser(JSON.parse(raw))
  }, [])

  useEffect(() => {
    if (user) localStorage.setItem('auth_user', JSON.stringify(user))
    else localStorage.removeItem('auth_user')
  }, [user])

  const value = useMemo(() => ({ user, setUser }), [user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }
