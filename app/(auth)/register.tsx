"use client"

import { Link } from "expo-router"
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

export default function RegisterScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { signUp, error, clearError, loading } = useAuth()

  useEffect(() => {
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
    <KeyboardAvoidingView className="flex-1 bg-gray-50" behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View className="flex-1 justify-center px-5">
        <Text className="text-3xl font-bold text-center mb-2 text-primary-500">Create Account</Text>
        <Text className="text-base text-center mb-10 text-gray-600">Join IntelliPrep today</Text>

        <TextInput
          className="bg-white px-4 py-3 rounded-lg mb-4 text-base border border-gray-200"
          placeholder="Full Name"
          value={fullName}
          onChangeText={(text) => {
            setFullName(text)
            clearError()
          }}
          autoCapitalize="words"
          editable={!isLoading && !loading}
        />

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
          editable={!isLoading && !loading}
        />

        <TextInput
          className="bg-white px-4 py-3 rounded-lg mb-4 text-base border border-gray-200"
          placeholder="Password (min 6 characters)"
          value={password}
          onChangeText={(text) => {
            setPassword(text)
            clearError()
          }}
          secureTextEntry
          autoCapitalize="none"
          editable={!isLoading && !loading}
        />

        <TextInput
          className="bg-white px-4 py-3 rounded-lg mb-4 text-base border border-gray-200"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text)
            clearError()
          }}
          secureTextEntry
          autoCapitalize="none"
          editable={!isLoading && !loading}
        />

        <TouchableOpacity
          className={`bg-primary-500 py-3 rounded-lg mb-4 min-h-[48px] justify-center items-center ${
            isLoading || loading ? "opacity-60" : ""
          }`}
          onPress={handleRegister}
          disabled={isLoading || loading}
        >
          {isLoading || loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center text-base font-semibold">Sign Up</Text>
          )}
        </TouchableOpacity>

        <Link href="../(auth)/login" asChild>
          <TouchableOpacity className="py-2">
            <Text className="text-primary-500 text-center text-sm">Already have an account? Sign In</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  )
}
