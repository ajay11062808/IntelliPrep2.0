"use client"

import { Link, router } from "expo-router"
import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"
import { useAuth } from "../../constants/AuthContext"

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const { resetPassword, error, clearError } = useAuth()

  useEffect(() => {
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
      <View className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center px-5">
          <Text className="text-3xl font-bold text-center mb-2 text-primary-500">Check Your Email</Text>
          <Text className="text-base text-center mb-10 text-gray-600 leading-6">
            We've sent password reset instructions to {email}
          </Text>

          <Link href="../(auth)/login" asChild>
            <TouchableOpacity className="bg-primary-500 py-3 rounded-lg">
              <Text className="text-white text-center text-base font-semibold">Back to Login</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-gray-50" behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View className="flex-1 justify-center px-5">
        <Text className="text-3xl font-bold text-center mb-2 text-primary-500">Reset Password</Text>
        <Text className="text-base text-center mb-10 text-gray-600 leading-6">
          Enter your email address and we'll send you instructions to reset your password
        </Text>

        <TextInput
          className="bg-white px-4 py-3 rounded-lg mb-4 text-base border border-gray-200"
          placeholder="Email"
          value={email}
          onChangeText={(text) => {
            setEmail(text)
            clearError()
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />

        <TouchableOpacity
          className={`bg-primary-500 py-3 rounded-lg mb-4 min-h-[48px] justify-center items-center ${
            isLoading ? "opacity-60" : ""
          }`}
          onPress={handleResetPassword}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center text-base font-semibold">Send Reset Email</Text>
          )}
        </TouchableOpacity>

        <Link href="../(auth)/login" asChild>
          <TouchableOpacity className="py-2">
            <Text className="text-primary-500 text-center text-sm">Back to Login</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  )
}
