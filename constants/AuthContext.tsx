"use client"

import type { AuthError, Session, User } from "@supabase/supabase-js"
import { router } from "expo-router"
import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../config/supabase"

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      if (event === "SIGNED_IN") {
        router.replace("/(tabs)")
      } else if (event === "SIGNED_OUT") {
        router.replace("../(auth)")
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAuthError = (error: AuthError) => {
    let message = "An error occurred"

    if (error.message.includes("Invalid login credentials")) {
      message = "Invalid email or password"
    } else if (error.message.includes("Email not confirmed")) {
      message = "Please check your email and confirm your account"
    } else if (error.message.includes("User already registered")) {
      message = "An account with this email already exists"
    } else if (error.message.includes("Password should be at least")) {
      message = "Password should be at least 6 characters"
    } else if (error.message.includes("Unable to validate email address")) {
      message = "Please enter a valid email address"
    } else {
      message = error.message
    }

    setError(message)
  }

  const signIn = async (email: string, password: string) => {
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (error) throw error
    } catch (error: any) {
      handleAuthError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      })
      if (error) throw error
    } catch (error: any) {
      handleAuthError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setError(null)
    const { error } = await supabase.auth.signOut()
    if (error) {
      handleAuthError(error)
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: "intelliprep20://reset-password",
      })
      if (error) throw error
    } catch (error: any) {
      handleAuthError(error)
      throw error
    }
  }

  const clearError = () => {
    setError(null)
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
