"use client"

import { Ionicons } from "@expo/vector-icons"
import { BlurView } from "expo-blur"
import { LinearGradient } from "expo-linear-gradient"
import * as Linking from "expo-linking"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { supabase } from "../config/supabase"

export default function ResetPasswordScreen() {
  const [isLoading, setIsLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  useEffect(() => {
    const run = async () => {
      try {
        const url = await Linking.getInitialURL()
        if (url) {
          const handled = await processUrl(url)
          if (handled) return
        }
      } catch (e) {
        Alert.alert('Reset Error', 'Failed to process reset link')
        router.replace('../(auth)/login')
      } finally {
        setIsLoading(false)
      }
    }
    run()

    // Also handle links while app is already open
    const sub = Linking.addEventListener('url', async (event) => {
      if (event?.url) {
        await processUrl(event.url)
      }
    })
    return () => {
      // @ts-ignore remove exists in Expo
      sub?.remove?.()
    }
  }, [])

  const processUrl = async (url: string): Promise<boolean> => {
    const hashIndex = url.indexOf('#')
    const queryIndex = url.indexOf('?')
    const fragment = hashIndex !== -1 ? url.slice(hashIndex + 1) : ''
    const query = queryIndex !== -1 ? url.slice(queryIndex + 1, hashIndex === -1 ? undefined : hashIndex) : ''
    const hashParams = new URLSearchParams(fragment)
    const queryParams = new URLSearchParams(query)

    const accessToken = hashParams.get('access_token') || queryParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token')
    const errorDescription = hashParams.get('error_description') || queryParams.get('error_description')
    const code = hashParams.get('code') || queryParams.get('code')
    if (errorDescription) {
      Alert.alert('Reset Error', errorDescription)
      router.replace('../(auth)/login')
      return true
    }
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (!error) {
        setReady(true)
        return true
      }
    }
    // Handle code-based redirects
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        setReady(true)
        return true
      }
    }
    return false
  }

  const handleUpdatePassword = async () => {
    if (!password || password.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match')
      return
    }
    setIsLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setIsLoading(false)
    if (error) {
      Alert.alert('Update Failed', error.message)
      return
    }
    Alert.alert('Password Updated', 'You can now sign in with your new password', [
      { text: 'OK', onPress: () => router.replace('../(auth)/login') }
    ])
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Checking reset link…</Text>
      </SafeAreaView>
    )
  }

  if (!ready) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <Text>Reset link invalid or expired.</Text>
        <TouchableOpacity onPress={() => router.replace('../(auth)/forgot-password')} style={{ marginTop: 12 }}>
          <Text style={{ color: '#667eea' }}>Request a new reset link</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <LinearGradient colors={["#667eea", "#764ba2", "#f093fb"]} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <View className="flex-1 justify-center items-center px-8">
          <BlurView intensity={20} tint="light" style={{ borderRadius: 25, overflow: 'hidden' }}>
            <View className="bg-white/90 dark:bg-gray-800 p-8 rounded-3xl shadow-2xl items-center">
              <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-6">
                <Ionicons name="key" size={40} color="#667eea" />
              </View>
              <Text className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 text-center">
                Set a New Password
              </Text>

              <View className="w-full mb-4">
                <Text className="text-gray-700 dark:text-gray-300 text-sm mb-2 font-medium">
                  New Password
                </Text>
                <TextInput
                  className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-2xl px-4 py-3"
                  placeholder="Enter new password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  editable={!isLoading}
                />
              </View>

              <View className="w-full mb-6">
                <Text className="text-gray-700 dark:text-gray-300 text-sm mb-2 font-medium">
                  Confirm Password
                </Text>
                <TextInput
                  className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-2xl px-4 py-3"
                  placeholder="Re-enter new password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                onPress={handleUpdatePassword}
                disabled={isLoading}
                className="w-full bg-blue-600 rounded-2xl py-4"
              >
                {isLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-white text-center font-semibold text-lg">
                    Update Password
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.replace('../(auth)/login')} className="mt-4">
                <Text className="text-gray-600 dark:text-gray-300">Back to login</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </SafeAreaView>
    </LinearGradient>
  )
}
