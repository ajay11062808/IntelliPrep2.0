"use client"

import { Ionicons } from "@expo/vector-icons"
import { BlurView } from "expo-blur"
import { LinearGradient } from "expo-linear-gradient"
import { Link } from "expo-router"
import { useEffect, useRef, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../constants/AuthContext"

export default function RegisterScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { signUp, error, clearError, loading } = useAuth()

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const scaleAnim = useRef(new Animated.Value(0.9)).current

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()

    return () => {
      clearError()
    }
  }, [])

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !fullName.trim() || !confirmPassword.trim()) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    if (!isValidEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address")
      return
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters")
      return
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match")
      return
    }

    if (fullName.trim().length < 2) {
      Alert.alert("Error", "Please enter your full name")
      return
    }

    setIsLoading(true)
    try {
      await signUp(email, password, fullName)
      Alert.alert("Success", "Account created successfully! Please check your email to verify your account.", [
        { text: "OK", onPress: () => {} },
      ])
    } catch (error: any) {
      // Error is handled by the context
    } finally {
      setIsLoading(false)
    }
  }

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  useEffect(() => {
    if (error) {
      Alert.alert("Registration Error", error)
    }
  }, [error])

  return (
    <LinearGradient colors={["#667eea", "#764ba2", "#f093fb"]} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        >
          <ScrollView
            className="flex-1 px-8"
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
              className="items-center mb-8 mt-8"
            >
              <View className="w-20 h-20 bg-white/20 rounded-full items-center justify-center mb-4">
                <Ionicons name="person-add" size={40} color="white" />
              </View>
              <Text className="text-4xl font-bold text-white mb-2">Join IntelliPrep</Text>
              <Text className="text-white/80 text-lg text-center">Create your account to get started</Text>
            </Animated.View>

            {/* Register Form */}
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              }}
              className="mb-8"
            >
              <BlurView intensity={20} tint="light" style={{ borderRadius: 25, overflow: "hidden" }}>
                <View className="bg-white/90 p-8 rounded-3xl shadow-2xl">
                  <Text className="text-2xl font-bold text-gray-800 mb-6 text-center">Create Account</Text>

                  {/* Full Name Input */}
                  <View className="mb-6">
                    <View className="flex-row items-center bg-white/50 rounded-2xl px-4 py-3 border border-white/30">
                      <Ionicons name="person" size={20} color="#667eea" />
                      <TextInput
                        className="flex-1 ml-3 text-gray-800 text-base"
                        placeholder="Full name"
                        placeholderTextColor="#9CA3AF"
                        value={fullName}
                        onChangeText={(text) => {
                          setFullName(text)
                          clearError()
                        }}
                        autoCapitalize="words"
                        editable={!isLoading && !loading}
                        returnKeyType="next"
                      />
                    </View>
                  </View>

                  {/* Email Input */}
                  <View className="mb-6">
                    <View className="flex-row items-center bg-white/50 rounded-2xl px-4 py-3 border border-white/30">
                      <Ionicons name="mail" size={20} color="#667eea" />
                      <TextInput
                        className="flex-1 ml-3 text-gray-800 text-base"
                        placeholder="Email address"
                        placeholderTextColor="#9CA3AF"
                        value={email}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        onChangeText={(text) => {
                          setEmail(text)
                          clearError()
                        }}
                        editable={!isLoading && !loading}
                        returnKeyType="next"
                      />
                    </View>
                  </View>

                  {/* Password Input */}
                  <View className="mb-6">
                    <View className="flex-row items-center bg-white/50 rounded-2xl px-4 py-3 border border-white/30">
                      <Ionicons name="lock-closed" size={20} color="#667eea" />
                      <TextInput
                        className="flex-1 ml-3 text-gray-800 text-base"
                        placeholder="Password"
                        placeholderTextColor="#9CA3AF"
                        value={password}
                        secureTextEntry={!showPassword}
                        onChangeText={(text) => {
                          setPassword(text)
                          clearError()
                        }}
                        editable={!isLoading && !loading}
                        returnKeyType="next"
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        className="ml-2"
                      >
                        <Ionicons
                          name={showPassword ? "eye-off" : "eye"}
                          size={20}
                          color="#667eea"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Confirm Password Input */}
                  <View className="mb-6">
                    <View className="flex-row items-center bg-white/50 rounded-2xl px-4 py-3 border border-white/30">
                      <Ionicons name="lock-closed" size={20} color="#667eea" />
                      <TextInput
                        className="flex-1 ml-3 text-gray-800 text-base"
                        placeholder="Confirm password"
                        placeholderTextColor="#9CA3AF"
                        value={confirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        onChangeText={(text) => {
                          setConfirmPassword(text)
                          clearError()
                        }}
                        editable={!isLoading && !loading}
                        returnKeyType="done"
                        onSubmitEditing={handleRegister}
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="ml-2"
                      >
                        <Ionicons
                          name={showConfirmPassword ? "eye-off" : "eye"}
                          size={20}
                          color="#667eea"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Register Button */}
                  <TouchableOpacity
                    className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl py-4 mt-2 mb-6 shadow-lg"
                    onPress={handleRegister}
                    disabled={isLoading || loading}
                    style={{
                      shadowColor: "#667eea",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 8,
                    }}
                  >
                    <LinearGradient
                      colors={["#667eea", "#764ba2"]}
                      style={{ borderRadius: 16, paddingVertical: 16 }}
                    >
                      {isLoading || loading ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text className="text-white text-center text-lg font-semibold">
                          Create Account
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Divider */}
                  <View className="flex-row items-center mb-6">
                    <View className="flex-1 h-px bg-gray-300" />
                    <Text className="mx-4 text-gray-500 text-sm">or</Text>
                    <View className="flex-1 h-px bg-gray-300" />
                  </View>

                  {/* Sign In Link */}
                  <Link href="../(auth)/login" asChild>
                    <TouchableOpacity className="bg-white border border-gray-200 rounded-2xl py-4">
                      <Text className="text-gray-700 text-center text-base font-semibold">
                        Already have an account? Sign In
                      </Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              </BlurView>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  )
}
