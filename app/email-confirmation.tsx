"use client"

import { Ionicons } from "@expo/vector-icons"
import { BlurView } from "expo-blur"
import { LinearGradient } from "expo-linear-gradient"
import * as Linking from "expo-linking"
import { Link, router, useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { supabase } from "../config/supabase"

export default function EmailConfirmationScreen() {
  const [isLoading, setIsLoading] = useState(true)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const params = useLocalSearchParams()

  useEffect(() => {
    console.log("Email confirmation screen loaded with params:", params)
    // Attempt to handle deep link tokens and set session
    handleDeepLinkAndSession()
    // Listen for deep link events while app is open
    const subscription = Linking.addEventListener('url', (event) => {
      if (event?.url) {
        void processUrlForSupabase(event.url)
      }
    })
    return () => {
      // @ts-ignore - `.remove` exists in Expo Linking subscription
      subscription?.remove?.()
    }
  }, [params])

  const handleDeepLinkAndSession = async () => {
    setIsLoading(true)
    try {
      const initialUrl = await Linking.getInitialURL()
      if (initialUrl) {
        const handled = await processUrlForSupabase(initialUrl)
        if (handled) return
      }

      // Fallback: check user status if no tokens were present
      await checkUserStatus()
    } catch (e) {
      setError("An error occurred while processing the confirmation link")
    } finally {
      setIsLoading(false)
    }
  }

  const processUrlForSupabase = async (url: string): Promise<boolean> => {
    const hashIndex = url.indexOf('#')
    if (hashIndex === -1) return false
    const fragment = url.slice(hashIndex + 1)
    const searchParams = new URLSearchParams(fragment)

    const errorCode = searchParams.get('error_code')
    const errorDescription = searchParams.get('error_description')
    if (errorCode) {
      setError(errorDescription || 'Email confirmation failed. Please try again.')
      return true
    }

    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (error) {
        setError('Failed to establish session after confirmation')
        return true
      }
      if (data?.session?.user) {
        setIsConfirmed(true)
        setTimeout(() => router.replace('/(tabs)'), 1500)
        return true
      }
    }
    return false
  }

  const checkUserStatus = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      // No session yet is expected before clicking the email link
      if (error || !user) {
        setError(null)
        return
      }

      if (user?.email_confirmed_at) {
        setIsConfirmed(true)
        // Show success message and redirect after 2 seconds
        setTimeout(() => {
          router.replace("/(tabs)")
        }, 2000)
      } else {
        setError("Email not yet confirmed. Please check your email and click the confirmation link.")
      }
    } catch (error) {
      setError("An error occurred while verifying your email")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: user.email,
          options: {
            emailRedirectTo: "intelliprep://email-confirmation",
          },
        })
        
        if (error) {
          Alert.alert("Error", "Failed to resend confirmation email")
        } else {
          Alert.alert("Success", "Confirmation email sent! Please check your inbox.")
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to resend confirmation email")
    }
  }

  if (isLoading) {
    return (
      <LinearGradient colors={["#667eea", "#764ba2", "#f093fb"]} style={{ flex: 1 }}>
        <SafeAreaView className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="white" />
          <Text className="text-white text-lg mt-4">Verifying your email...</Text>
        </SafeAreaView>
      </LinearGradient>
    )
  }

  if (isConfirmed) {
    return (
      <LinearGradient colors={["#667eea", "#764ba2", "#f093fb"]} style={{ flex: 1 }}>
        <SafeAreaView className="flex-1">
          <View className="flex-1 justify-center items-center px-8">
            <BlurView intensity={20} tint="light" style={{ borderRadius: 25, overflow: "hidden" }}>
              <View className="bg-white/90 dark:bg-gray-800 p-8 rounded-3xl shadow-2xl items-center">
                <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
                  <Ionicons name="checkmark-circle" size={40} color="#10B981" />
                </View>
                <Text className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 text-center">
                  Email Confirmed!
                </Text>
                <Text className="text-gray-600 dark:text-gray-400 text-center mb-8 leading-6">
                  Your email has been successfully confirmed. You're now ready to use IntelliPrep!
                </Text>
                <ActivityIndicator size="small" color="#667eea" />
                <Text className="text-gray-500 text-sm mt-2">Redirecting to app...</Text>
              </View>
            </BlurView>
          </View>
        </SafeAreaView>
      </LinearGradient>
    )
  }

  return (
    <LinearGradient colors={["#667eea", "#764ba2", "#f093fb"]} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <View className="flex-1 justify-center items-center px-8">
          <BlurView intensity={20} tint="light" style={{ borderRadius: 25, overflow: "hidden" }}>
            <View className="bg-white/90 dark:bg-gray-800 p-8 rounded-3xl shadow-2xl items-center">
              <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-6">
                <Ionicons name="mail" size={40} color="#667eea" />
              </View>
              <Text className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 text-center">
                Confirm Your Email
              </Text>
              <Text className="text-gray-600 dark:text-gray-400 text-center mb-6 leading-6">
                {error || "Please check your email and click the confirmation link to activate your account."}
              </Text>
              
              <TouchableOpacity
                onPress={handleResendEmail}
                className="bg-blue-600 rounded-2xl py-3 px-6 mb-4"
              >
                <Text className="text-white text-center font-semibold">
                  Resend Confirmation Email
                </Text>
              </TouchableOpacity>

              <Link href="../(auth)/login" asChild>
                <TouchableOpacity className="bg-gray-200 dark:bg-gray-700 rounded-2xl py-3 px-6">
                  <Text className="text-gray-700 dark:text-gray-100 text-center font-semibold">
                    Back to Login
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </BlurView>
        </View>
      </SafeAreaView>
    </LinearGradient>
  )
}
