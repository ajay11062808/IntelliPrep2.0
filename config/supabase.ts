import AsyncStorage from "@react-native-async-storage/async-storage"
import { createClient } from "@supabase/supabase-js"
import "react-native-url-polyfill/auto"

const EXPO_PUBLIC_SUPABASE_URL = "https://gdfryqnfqdglkpwhvpwo.supabase.co"
const EXPO_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkZnJ5cW5mcWRnbGtwd2h2cHdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MDg2MTYsImV4cCI6MjA2OTA4NDYxNn0.tB17EP3OacMcsXCYhPXz3h9Yz9WZXifrg4s1tVrDiqs"
// const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
// const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
const supabaseUrl = EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = EXPO_PUBLIC_SUPABASE_ANON_KEY
console.log("Supabase URL:", supabaseUrl)
console.log("Supabase Key exists:", !!supabaseAnonKey)

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Please check your .env file.")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Test connection
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error("Supabase connection error:", error)
  } else {
    console.log("Supabase connected successfully")
  }
})