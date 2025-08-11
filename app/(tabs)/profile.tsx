"use client"

import { ExternalLink } from "../../components/ExternalLink"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import * as SecureStore from "expo-secure-store"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import SupportUsRewarded from "../../components/SupportUsRewarded"
import { supabase } from "../../config/supabase"
import { useAuth } from "../../constants/AuthContext"
import { useThemePreference } from "../../constants/themeContext"

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
  const { themeMode, setThemeMode } = useThemePreference()
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
  const [showPasswordModal, setShowPasswordModal] = useState(false)

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
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2196F3" />
          <Text className="text-gray-600 dark:text-gray-300 mt-4">Loading profile...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black">
      {/* Header */}
      <View className="mb-3">
        <LinearGradient colors={["#6366F1", "#8B5CF6", "#EC4899"]} style={{ height: 140 }}>
          <View className="flex-1 flex-row items-end justify-between px-5 pb-4">
            <View>
              <Text className="text-white text-2xl font-bold">Profile</Text>
              <Text className="text-white/80 text-sm">Manage your account & preferences</Text>
            </View>
            <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center">
              <Ionicons name="person" size={22} color="#fff" />
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView className="flex-1">
        {/* Plan Card */}
        <View className="p-5 pt-0">
          <LinearGradient
            colors={profile?.is_premium ? ["#F59E0B", "#EF4444"] : ["#6366F1", "#8B5CF6"]}
            style={{ borderRadius: 16, padding: 16 }}
          >
            <View className="flex-row justify-between items-center">
              <View className="flex-1 mr-3">
                <Text className="text-white text-lg font-bold">
                  {profile?.is_premium ? "Premium Plan" : "Free Plan"}
                </Text>
                <Text className="text-white/90 mt-1">
                  {profile?.is_premium ? "Enjoy 100 AI requests/day and priority features" : "10 AI requests/day. Upgrade for more."}
                </Text>
              </View>
              {!profile?.is_premium && (
                <TouchableOpacity
                  onPress={() => Alert.alert("Premium", "Contact support to enable premium or connect billing.")}
                  className="bg-white/20 rounded-full px-4 py-2"
                >
                  <Text className="text-white font-semibold">Go Premium</Text>
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>
        </View>
        {/* Profile Section (Premium look) */}
        <View className="bg-white dark:bg-gray-900 p-5 border-b border-gray-200 dark:border-gray-800">
          <View className="flex-row items-center mb-6">
            <LinearGradient colors={["#6366F1", "#8B5CF6"]} style={{ width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginRight: 16 }}>
              <View className="w-14 h-14 bg-white dark:bg-gray-800 rounded-full items-center justify-center">
                <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  {(fullName || user?.email || "U").charAt(0).toUpperCase()}
                </Text>
            </View>
            </LinearGradient>
            <View className="flex-1">
              <Text className="text-xl font-semibold text-gray-800 dark:text-gray-100" numberOfLines={1}>
                {fullName || profile?.full_name || "User"}
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400" numberOfLines={1}>{user?.email}</Text>
            </View>
          </View>

          <View className="mb-4">
            <View className="flex-row items-center bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
              <Ionicons name="person" size={18} color="#6366F1" />
            <TextInput
                className="flex-1 ml-3 text-gray-800 dark:text-gray-100"
              value={fullName}
              onChangeText={setFullName}
                placeholder="Your full name"
              autoCapitalize="words"
            />
          <TouchableOpacity
            className={`py-3 px-3 rounded-xl ${updating ? "bg-gray-400" : "bg-indigo-600"}`}
            onPress={updateProfile}
            disabled={updating}
          >
            <Text className="text-white text-center font-semibold">{updating ? "Updating..." :"Update"}</Text>
          </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Theme Preference & API Key */}
        <View className="bg-white dark:bg-gray-900 p-5 mt-6 border-b border-gray-200 dark:border-gray-800">
          <Text className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Preferences</Text>
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</Text>
          <View className="flex-row mb-4">
            {(["system","light","dark"] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                className={`px-4 py-2 rounded-full mr-2 ${themePreference===opt?"bg-indigo-600":"bg-gray-100 dark:bg-gray-800"}`}
                onPress={() => {
                  setThemePreference(opt)
                  setThemeMode(opt)
                }}
              >
                <Text className={`${themePreference===opt?"text-white":"text-gray-700 dark:text-gray-300"} font-medium capitalize`}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gemini API Key (device only)</Text>
          <TextInput
            className="bg-gray-50 dark:bg-gray-800 dark:text-gray-100 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
            value={geminiKey}
            onChangeText={setGeminiKey}
            placeholder="Paste your Gemini API key"
            autoCapitalize="none"
            placeholderTextColor={themePreference === "dark" ? "#9CA3AF" : "#6B7280"} // Tailwind's gray-400 / gray-500
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
            <Text className="text-gray-700 dark:text-gray-300">{hasGeminiKey ? "Using your personal Gemini key" : "Using app default key"}</Text>
          </View>

          <View className="mt-5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
            <Text className="font-semibold text-indigo-800 dark:text-indigo-200 mb-1">Where to get a Gemini API key</Text>
            <Text className="text-indigo-700 dark:text-indigo-300 mb-3">Create a key in Google AI Studio and paste it here to use your own quota.</Text>
            <ExternalLink className="bg-indigo-600 rounded-lg text-white text-center font-semibold py-2" href="https://aistudio.google.com/app/apikey" target="_blank">Open Google AI Studio</ExternalLink>
            
            <Text className="text-xs text-indigo-700 dark:text-indigo-300 mt-2">Docs: https://ai.google.dev/gemini-api/docs/api-key</Text>
          </View>
          {profile?.is_premium ? (
            <Text className="text-green-600 dark:text-green-400 mt-3">Premium active: 100 AI requests/day</Text>
          ) : (
            <Text className="text-gray-600 dark:text-gray-400 mt-3">Free plan: 10 AI requests/day</Text>
          )}
        </View>

        {/* Security Tile */}
        <View className="bg-white dark:bg-gray-900 p-5 mt-6 border-b border-gray-200 dark:border-gray-800">
          <Text className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Security</Text>
          <TouchableOpacity
            className="flex-row items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800"
            onPress={() => setShowPasswordModal(true)}
          >
            <View className="flex-row items-center">
              <Ionicons name="lock-closed" size={20} color="#6366F1" />
              <Text className="ml-3 text-gray-800 dark:text-gray-100 font-medium">Change password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Support & Contact */}
        <View className="bg-white dark:bg-gray-900 p-5 mt-6 border-b border-gray-200 dark:border-gray-800">
          <Text className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Support & Feedback</Text>

          <View className="space-y-3">
            <TouchableOpacity
              className="flex-row items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800"
              onPress={() => Linking.openURL("mailto:intelliprep25@gmail.com?subject=Support%20Request")}
            >
              <Ionicons name="mail" size={20} color="#4F46E5" />
              <Text className="ml-3  text-gray-800 dark:text-gray-100 font-medium">Contact Support</Text>
            </TouchableOpacity>
{/* 
            <TouchableOpacity
              className="flex-row items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800"
              onPress={() => Linking.openURL("https://github.com/your-org/intelliprep/issues/new")}
            >
              <Ionicons name="bug" size={20} color="#DC2626" />
              <Text className="ml-3 text-gray-800 dark:text-gray-100 font-medium">Report a bug</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800"
              onPress={() => Linking.openURL("https://discord.gg/your-community")}
            >
              <Ionicons name="chatbubbles" size={20} color="#10B981" />
              <Text className="ml-3 text-gray-800 dark:text-gray-100 font-medium">Join our community</Text>
            </TouchableOpacity> */}

            <TouchableOpacity
              className="flex-row items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800"
              onPress={async () => {
                try {
                  await Share.share({
                    title: "IntelliPrep",
                    message: Platform.select({
                      ios: "Check out IntelliPrep – AI-powered study companion!",
                      android: "Check out IntelliPrep – AI-powered study companion!",
                      default: "Check out IntelliPrep – AI-powered study companion!",
                    }) as string,
                    url: "https://intelliprep.app",
                  })
                } catch {}
              }}
            >
              <Ionicons name="share-social" size={20} color="#2563EB" />
              <Text className="ml-3 text-gray-800 dark:text-gray-100 font-medium">Share app</Text>
            </TouchableOpacity>

            {/* Rewarded Ad button */}
            <View className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <View className="flex-row items-center mb-2">
                <Ionicons name="gift" size={20} color="#10B981" />
                <Text className="ml-3 text-gray-800 dark:text-gray-100 font-medium">Support us</Text>
              </View>
              <SupportUsRewarded />
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Watching a short ad helps us keep improving the app. Thank you!
              </Text>
            </View>
          </View>
        </View>

        {/* Legal */}
        <View className="bg-white dark:bg-gray-900 p-5 mt-6 border-b border-gray-200 dark:border-gray-800">
          <Text className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">About</Text>
          <View className="space-y-3">
            <TouchableOpacity className="flex-row items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800" onPress={() => Alert.alert("Privacy Policy", "Coming soon")}>
              <Ionicons name="shield-checkmark" size={20} color="#6366F1" />
              <Text className="ml-3 text-gray-800 dark:text-gray-100 font-medium">Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800" onPress={() => Alert.alert("Terms of Service", "Coming soon")}>
              <Ionicons name="document-text" size={20} color="#6366F1" />
              <Text className="ml-3 text-gray-800 dark:text-gray-100 font-medium">Terms of Service</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Actions */}
        <View className="bg-white dark:bg-gray-900 mt-6">
          <TouchableOpacity
            className="flex-row items-center justify-center p-5 border-b border-gray-100 dark:border-gray-800"
            onPress={handleSignOut}
          >
            <Ionicons name="log-out" size={20} color="#EF4444" />
            <Text className="text-error-600 ml-3 font-semibold">Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View className="bg-white dark:bg-gray-900 p-5 mt-6">
          <Text className="text-center text-gray-500 dark:text-gray-400 text-sm">IntelliPrep v1.0.0</Text>
          <Text className="text-center text-gray-400 dark:text-gray-500 text-xs mt-1">Your AI-powered study companion</Text>
        </View>
      </ScrollView>
      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPasswordModal(false)}>
        <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
          <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <Text className="text-xl font-semibold text-gray-800 dark:text-gray-100">Change Password</Text>
            <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-5">
          <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</Text>
            <TextInput
                className="bg-gray-50 dark:bg-gray-800 dark:text-gray-100 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</Text>
            <TextInput
                className="bg-gray-50 dark:bg-gray-800 dark:text-gray-100 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
              className={`py-4 rounded-lg ${updating ? "bg-gray-400" : "bg-indigo-600"}`}
              onPress={async () => {
                await updatePassword()
                setShowPasswordModal(false)
              }}
            disabled={updating}
          >
              <Text className="text-white text-center font-semibold text-base">{updating ? "Updating..." : "Update Password"}</Text>
          </TouchableOpacity>
      </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}
