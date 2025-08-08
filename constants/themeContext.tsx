"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../config/supabase"
import { useAuth } from "./AuthContext"

type ThemeMode = "system" | "light" | "dark"

interface ThemeContextType {
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
}

const ThemePreferenceContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemePreferenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system")

  useEffect(() => {
    const load = async () => {
      try {
        if (!user) return
        const { data } = await supabase.from("profiles").select("theme_preference").eq("id", user.id).single()
        if (data?.theme_preference) {
          setThemeModeState(data.theme_preference as ThemeMode)
        }
      } catch {}
    }
    load()
  }, [user])

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode)
    try {
      if (!user) return
      await supabase.from("profiles").update({ theme_preference: mode }).eq("id", user.id)
    } catch {}
  }

  return (
    <ThemePreferenceContext.Provider value={{ themeMode, setThemeMode }}>
      {children}
    </ThemePreferenceContext.Provider>
  )
}

export const useThemePreference = () => {
  const ctx = useContext(ThemePreferenceContext)
  if (!ctx) throw new Error("useThemePreference must be used within ThemePreferenceProvider")
  return ctx
}


