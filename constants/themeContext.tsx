"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useColorScheme as useSystemColorScheme } from "react-native"
import { supabase } from "../config/supabase"
import { useAuth } from "./AuthContext"
// NativeWind programmatic theme control
// If not present, app will still work; this is a no-op fallback in non-NativeWind envs
let setNativeWindColorScheme: undefined | ((scheme: "light" | "dark") => void)
try {
  // @ts-ignore
  const nw = require("nativewind")
  setNativeWindColorScheme = nw?.setColorScheme
} catch {}

type ThemeMode = "system" | "light" | "dark"

interface ThemeContextType {
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
}

const ThemePreferenceContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemePreferenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system")
  const systemScheme = useSystemColorScheme()

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

  // Keep NativeWind color scheme in sync for class-based theming
  useEffect(() => {
    const resolved: "light" | "dark" = (themeMode === "system" ? (systemScheme || "light") : themeMode) as any
    try {
      setNativeWindColorScheme && setNativeWindColorScheme(resolved)
    } catch {}
  }, [themeMode, systemScheme])

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


