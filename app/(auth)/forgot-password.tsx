"use client"

import { Ionicons } from "@expo/vector-icons"
import { BlurView } from "expo-blur"
import { LinearGradient } from "expo-linear-gradient"
import { Link, router } from "expo-router"
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

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const { resetPassword, error, clearError } = useAuth()

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

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address")
      return
    }

    if (!isValidEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address")
      return
    }

    setIsLoading(true)
    try {
      await resetPassword(email)
      setEmailSent(true)
      Alert.alert("Reset Email Sent", "Please check your email for password reset instructions.", [
        {
          text: "OK",
          onPress: () => router.replace("../(auth)/login"),
        },
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
      Alert.alert("Reset Password Error", error)
    }
  }, [error])

  if (emailSent) {
    return (
      <LinearGradient colors={["#667eea", "#764ba2", "#f093fb"]} style={{ flex: 1 }}>
        <SafeAreaView className="flex-1">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
          >
            <ScrollView
              className="flex-1 px-8"
              contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Animated.View
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
                }}
                className="items-center"
              >
                <BlurView intensity={20} tint="light" style={{ borderRadius: 25, overflow: "hidden" }}>
                  <View className="bg-white/90 p-8 rounded-3xl shadow-2xl items-center">
                    <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
                      <Ionicons name="checkmark-circle" size={40} color="#10B981" />
                    </View>
                    <Text className="text-2xl font-bold text-gray-800 mb-4 text-center">
                      Check Your Email
                    </Text>
                    <Text className="text-gray-600 text-center mb-8 leading-6">
                      We've sent password reset instructions to{" "}
                      <Text className="font-semibold text-blue-600">{email}</Text>
                    </Text>

                    <Link href="../(auth)/login" asChild>
                      <TouchableOpacity className="w-full">
                        <LinearGradient
                          colors={["#667eea", "#764ba2"]}
                          style={{ borderRadius: 16, paddingVertical: 16 }}
                        >
                          <Text className="text-white text-center text-lg font-semibold">
                            Back to Login
                          </Text>
                        </LinearGradient>
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
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          {/* Header */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
            className="items-center mb-12"
          >
            <View className="w-20 h-20 bg-white/20 rounded-full items-center justify-center mb-4">
              <Ionicons name="lock-open" size={40} color="white" />
            </View>
            <Text className="text-4xl font-bold text-white mb-2">Reset Password</Text>
            <Text className="text-white/80 text-lg text-center">
              Enter your email to receive reset instructions
            </Text>
          </Animated.View>

          {/* Reset Form */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            }}
          >
            <BlurView intensity={20} tint="light" style={{ borderRadius: 25, overflow: "hidden" }}>
              <View className="bg-white/90 p-8 rounded-3xl shadow-2xl">
                <Text className="text-2xl font-bold text-gray-800 mb-6 text-center">
                  Forgot Password?
                </Text>

                <Text className="text-gray-600 text-center mb-8 leading-6">
                  Don't worry! Enter your email address and we'll send you instructions to reset your password.
                </Text>

                {/* Email Input */}
                <View className="mb-8">
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
                      editable={!isLoading}
                      returnKeyType="done"
                      onSubmitEditing={handleResetPassword}
                    />
                  </View>
                </View>

                {/* Reset Button */}
                <TouchableOpacity
                  className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl py-4 mt-2 mb-6 shadow-lg"
                  onPress={handleResetPassword}
                  disabled={isLoading}
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
                    {isLoading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text className="text-white text-center text-lg font-semibold">
                        Send Reset Email
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Back to Login */}
                <Link href="../(auth)/login" asChild>
                  <TouchableOpacity className="bg-white border border-gray-200 rounded-2xl py-4">
                    <Text className="text-gray-700 text-center text-base font-semibold">
                      Back to Login
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
