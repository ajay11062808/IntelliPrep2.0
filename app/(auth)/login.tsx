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

export default function LoginScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { signIn, error, clearError, loading } = useAuth()

  useEffect(() => {
    return () => {
      clearError()
    }
  }, [])

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    if (!isValidEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address")
      return
    }

    setIsLoading(true)
    try {
      await signIn(email, password)
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
      Alert.alert("Login Error", error)
    }
  }, [error])

  return (
    <KeyboardAvoidingView className="flex-1 bg-gray-50" behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View className="flex-1 justify-center px-5">
        <Text className="text-3xl font-bold text-center mb-2 text-primary-500">IntelliPrep</Text>
        <Text className="text-base text-center mb-10 text-gray-600">Sign in to continue</Text>

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
          placeholder="Password"
          value={password}
          onChangeText={(text) => {
            setPassword(text)
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
          onPress={handleLogin}
          disabled={isLoading || loading}
        >
          {isLoading || loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center text-base font-semibold">Sign In</Text>
          )}
        </TouchableOpacity>

        <Link href="../(auth)/forgot-password" asChild>
          <TouchableOpacity className="py-2">
            <Text className="text-primary-500 text-center text-sm">Forgot Password?</Text>
          </TouchableOpacity>
        </Link>

        <Link href="../(auth)/register" asChild>
          <TouchableOpacity className="py-2">
            <Text className="text-primary-500 text-center text-sm">Don't have an account? Sign Up</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  )
}
