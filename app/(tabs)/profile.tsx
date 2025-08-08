"use client"

import { Ionicons } from "@expo/vector-icons"
import * as SecureStore from "expo-secure-store"
import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { supabase } from "../../config/supabase"
import { useAuth } from "../../constants/AuthContext"

interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  theme_preference?: "system" | "light" | "dark"
  is_premium?: boolean
  has_gemini_key?: boolean
  created_at: string
  updated_at: string
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [fullName, setFullName] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [themePreference, setThemePreference] = useState<"system" | "light" | "dark">("system")
  const [geminiKey, setGeminiKey] = useState("")
  const [savingKey, setSavingKey] = useState(false)
  const [hasGeminiKey, setHasGeminiKey] = useState(false)

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (error) {
        console.error("Error loading profile:", error)
        // If profile doesn't exist, create one
        if (error.code === "PGRST116") {
          await createProfile()
        }
      } else {
        setProfile(data)
        setFullName(data.full_name || "")
        setThemePreference((data.theme_preference as any) || "system")
        setHasGeminiKey(!!data.has_gemini_key)
        // Load local key
        try {
          const localKey = await SecureStore.getItemAsync("gemini_api_key")
          setGeminiKey(localKey || "")
        } catch {}
      }
    } catch (error) {
      console.error("Error loading profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const createProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || "",
          theme_preference: themePreference,
          has_gemini_key: false,
        })
        .select()
        .single()

      if (error) throw error
      setProfile(data)
      setFullName(data.full_name || "")
    } catch (error) {
      console.error("Error creating profile:", error)
    }
  }

  const updateProfile = async () => {
    if (!user || !fullName.trim()) {
      Alert.alert("Error", "Please enter your full name")
      return
    }

    setUpdating(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          theme_preference: themePreference,
          has_gemini_key: hasGeminiKey,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error

      Alert.alert("Success", "Profile updated successfully")
      loadProfile()
    } catch (error: any) {
      Alert.alert("Error", "Failed to update profile")
      console.error("Error updating profile:", error)
    } finally {
      setUpdating(false)
    }
  }

  const updatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all password fields")
      return
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match")
      return
    }

    setUpdating(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      Alert.alert("Success", "Password updated successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update password")
    } finally {
      setUpdating(false)
    }
  }

  const saveGeminiKey = async () => {
    setSavingKey(true)
    try {
      if (!geminiKey.trim()) {
        await SecureStore.deleteItemAsync("gemini_api_key")
        setHasGeminiKey(false)
        if (user) await supabase.from("profiles").update({ has_gemini_key: false }).eq("id", user.id)
      } else {
        await SecureStore.setItemAsync("gemini_api_key", geminiKey.trim(), {
          keychainService: "intelliprep_gemini_key",
        })
        setHasGeminiKey(true)
        if (user) await supabase.from("profiles").update({ has_gemini_key: true }).eq("id", user.id)
      }
      Alert.alert("Saved", "Gemini API key updated on this device")
    } catch (e) {
      Alert.alert("Error", "Failed to save key securely")
    } finally {
      setSavingKey(false)
    }
  }

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: signOut,
      },
    ])
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2196F3" />
          <Text className="text-gray-600 mt-4">Loading profile...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-5 py-4 bg-white border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-800">Settings</Text>
      </View>

      <ScrollView className="flex-1">
        {/* Profile Section */}
        <View className="bg-white p-5 border-b border-gray-200">
          <View className="flex-row items-center mb-6">
            <View className="w-16 h-16 bg-primary-100 rounded-full justify-center items-center mr-4">
              <Ionicons name="person" size={32} color="#2196F3" />
            </View>
            <View>
              <Text className="text-xl font-semibold text-gray-800">{profile?.full_name || "User"}</Text>
              <Text className="text-sm text-gray-500">{user?.email}</Text>
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-lg font-semibold text-gray-800 mb-2">Full Name</Text>
            <TextInput
              className="bg-gray-50 p-4 rounded-lg border border-gray-200"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              autoCapitalize="words"
            />
          </View>

          <TouchableOpacity
            className={`py-3 rounded-lg ${updating ? "bg-gray-400" : "bg-primary-500"}`}
            onPress={updateProfile}
            disabled={updating}
          >
            <Text className="text-white text-center font-semibold">{updating ? "Updating..." : "Update Profile"}</Text>
          </TouchableOpacity>
        </View>

        {/* Theme Preference & API Key */}
        <View className="bg-white p-5 mt-6 border-b border-gray-200">
          <Text className="text-xl font-semibold text-gray-800 mb-4">Preferences</Text>
          <Text className="text-sm font-medium text-gray-700 mb-2">Theme</Text>
          <View className="flex-row mb-4">
            {(["system","light","dark"] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                className={`px-4 py-2 rounded-full mr-2 ${themePreference===opt?"bg-indigo-600":"bg-gray-100"}`}
                onPress={() => setThemePreference(opt)}
              >
                <Text className={`${themePreference===opt?"text-white":"text-gray-700"} font-medium capitalize`}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-sm font-medium text-gray-700 mb-2">Gemini API Key (device only)</Text>
          <TextInput
            className="bg-gray-50 p-4 rounded-lg border border-gray-200"
            value={geminiKey}
            onChangeText={setGeminiKey}
            placeholder="Paste your Gemini API key"
            autoCapitalize="none"
            secureTextEntry
          />
          <TouchableOpacity
            className={`py-3 rounded-lg mt-3 ${savingKey ? "bg-gray-400" : "bg-indigo-600"}`}
            onPress={saveGeminiKey}
            disabled={savingKey}
          >
            <Text className="text-white text-center font-semibold">{savingKey?"Saving...":"Save Key Securely"}</Text>
          </TouchableOpacity>
          <View className="mt-3 flex-row items-center">
            <View className={`w-2.5 h-2.5 rounded-full mr-2 ${hasGeminiKey?"bg-green-500":"bg-gray-300"}`} />
            <Text className="text-gray-700">{hasGeminiKey ? "Using your personal Gemini key" : "Using app default key"}</Text>
          </View>

          <View className="mt-5 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <Text className="font-semibold text-indigo-800 mb-1">Where to get a Gemini API key</Text>
            <Text className="text-indigo-700 mb-3">Create a key in Google AI Studio and paste it here to use your own quota.</Text>
            <TouchableOpacity
              className="bg-indigo-600 rounded-lg py-2"
              onPress={() => {
                Alert.alert(
                  "Get Gemini Key",
                  "Open Google AI Studio at https://aistudio.google.com/app/apikey to create a key.",
                  [
                    { text: "Copy URL", onPress: () => {} },
                    { text: "OK" },
                  ]
                )
              }}
            >
              <Text className="text-white text-center font-semibold">Open Google AI Studio</Text>
            </TouchableOpacity>
            <Text className="text-xs text-indigo-700 mt-2">Docs: https://ai.google.dev/gemini-api/docs/api-key</Text>
          </View>
          {profile?.is_premium ? (
            <Text className="text-green-600 mt-3">Premium active: 100 AI requests/day</Text>
          ) : (
            <Text className="text-gray-600 mt-3">Free plan: 10 AI requests/day</Text>
          )}
        </View>

        {/* Password Section */}
        <View className="bg-white p-5 mt-6 border-b border-gray-200">
          <Text className="text-xl font-semibold text-gray-800 mb-4">Change Password</Text>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">New Password</Text>
            <TextInput
              className="bg-gray-50 p-4 rounded-lg border border-gray-200"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Confirm New Password</Text>
            <TextInput
              className="bg-gray-50 p-4 rounded-lg border border-gray-200"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            className={`py-3 rounded-lg ${updating ? "bg-gray-400" : "bg-warning-500"}`}
            onPress={updatePassword}
            disabled={updating}
          >
            <Text className="text-white text-center font-semibold">{updating ? "Updating..." : "Update Password"}</Text>
          </TouchableOpacity>
        </View>

        {/* Account Actions */}
        <View className="bg-white mt-6">
          <TouchableOpacity
            className="flex-row items-center justify-center p-5 border-b border-gray-100"
            onPress={handleSignOut}
          >
            <Ionicons name="log-out" size={20} color="#EF4444" />
            <Text className="text-error-600 ml-3 font-semibold">Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View className="bg-white p-5 mt-6">
          <Text className="text-center text-gray-500 text-sm">IntelliPrep v1.0.0</Text>
          <Text className="text-center text-gray-400 text-xs mt-1">Your AI-powered study companion</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
