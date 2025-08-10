"use client"

import * as Linking from "expo-linking"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { ActivityIndicator, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { supabase } from "../../config/supabase"

export default function AuthConfirmScreen() {
  const [status, setStatus] = useState<string>("Processing confirmation…")

  useEffect(() => {
    const run = async () => {
      const initial = await Linking.getInitialURL()
      if (initial) {
        const hashIndex = initial.indexOf('#')
        if (hashIndex !== -1) {
          const fragment = initial.slice(hashIndex + 1)
          const params = new URLSearchParams(fragment)
          const errorDescription = params.get('error_description')
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')
          if (errorDescription) {
            setStatus(errorDescription)
            return
          }
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            if (!error) {
              router.replace('/email-confirmation')
              return
            }
          }
        }
      }
      // If nothing processed, go to email-confirmation which will handle fallback
      router.replace('/email-confirmation')
    }
    run()
  }, [])

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ padding: 16, alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>{status}</Text>
      </View>
    </SafeAreaView>
  )
}
