"use client"
import { Redirect } from "expo-router"
import { ActivityIndicator, View } from "react-native"
import { useAuth } from "../constants/AuthContext"

export default function Index() {
  console.log("Index page loaded")
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    )
  }

  if (session) {
    return <Redirect href="/(tabs)" />
  }

  return <Redirect href="/(auth)/login" />
}