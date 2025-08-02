"use client"

import { Ionicons } from "@expo/vector-icons"
import { BlurView } from "expo-blur"
import { LinearGradient } from "expo-linear-gradient"
import { useEffect, useState } from "react"
import { Alert, FlatList, Modal, StatusBar, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../constants/AuthContext"
import type { Calculation } from "../constants/types"
import { CalculatorService } from "../services/calculatorService"

interface CalculationHistoryProps {
  visible: boolean
  onClose: () => void
}

export default function CalculationHistory({ visible, onClose }: CalculationHistoryProps) {
  const { user } = useAuth()
  const [calculations, setCalculations] = useState<Calculation[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState("all")

  const filters = [
    { id: "all", name: "All", icon: "apps", color: "#6366F1" },
    { id: "basic", name: "Basic", icon: "calculator", color: "#10B981" },
    { id: "interest", name: "Interest", icon: "trending-up", color: "#F59E0B" },
    { id: "bmi", name: "BMI", icon: "fitness", color: "#EF4444" },
  ]

  useEffect(() => {
    if (visible && user) {
      loadCalculations()
    }
  }, [visible, user])

  const loadCalculations = async () => {
    if (!user) return

    setLoading(true)
    try {
      const data = await CalculatorService.getCalculationHistory(user.id)
      setCalculations(data)
    } catch (error) {
      Alert.alert("Error", "Failed to load calculation history")
    } finally {
      setLoading(false)
    }
  }

  const filteredCalculations = calculations.filter(
    (calc) => selectedFilter === "all" || calc.calculation_type === selectedFilter,
  )

  const getCalculationIcon = (type: string) => {
    switch (type) {
      case "interest":
        return "trending-up"
      case "bmi":
        return "fitness"
      default:
        return "calculator"
    }
  }

  const getCalculationGradient = (type: string) => {
    switch (type) {
      case "interest":
        return ["#10B981", "#059669"] as const
      case "bmi":
        return ["#EF4444", "#DC2626"] as const
      default:
        return ["#6366F1", "#4F46E5"] as const
    }
  }

  const renderCalculationItem = ({ item, index }: { item: Calculation; index: number }) => (
    <View className="mx-4 mb-4">
      <BlurView intensity={30} tint="light" style={{ borderRadius: 20, overflow: "hidden" }}>
        <LinearGradient colors={["rgba(255,255,255,0.9)", "rgba(255,255,255,0.7)"]} style={{ padding: 20 }}>
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <LinearGradient
                colors={getCalculationGradient(item.calculation_type)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons name={getCalculationIcon(item.calculation_type) as any} size={20} color="white" />
              </LinearGradient>
              <View>
                <Text className="font-bold text-gray-800 text-lg capitalize">{item.calculation_type} Calculation</Text>
                <Text className="text-gray-500 text-sm">{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
            </View>
          </View>

          <View className="bg-gray-50 rounded-lg p-3 mb-3">
            <Text className="text-gray-700 text-sm mb-1">Expression:</Text>
            <Text className="text-gray-800 font-medium">{item.expression}</Text>
          </View>

          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-gray-700 text-sm">Result:</Text>
              <Text className="font-bold text-2xl text-gray-800">
                {item.calculation_type === "interest" ? "$" : ""}
                {item.result.toLocaleString()}
                {item.calculation_type === "bmi" ? " BMI" : ""}
              </Text>
            </View>

            {item.metadata && (
              <View className="bg-blue-50 rounded-lg px-3 py-2">
                {item.calculation_type === "interest" && (
                  <View>
                    <Text className="text-blue-700 text-xs font-medium">Rate: {item.metadata.rate}%</Text>
                    <Text className="text-blue-700 text-xs">{item.metadata.elapsedDays} days</Text>
                  </View>
                )}
                {item.calculation_type === "bmi" && (
                  <Text className="text-blue-700 text-xs font-medium">{item.metadata.category}</Text>
                )}
              </View>
            )}
          </View>
        </LinearGradient>
      </BlurView>
    </View>
  )

  const renderFilterButtons = () => (
    <View className="px-4 mb-4">
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={filters}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setSelectedFilter(item.id)} className="mr-3">
            <BlurView
              intensity={selectedFilter === item.id ? 40 : 20}
              tint="light"
              style={{ borderRadius: 20, overflow: "hidden" }}
            >
              <LinearGradient
                colors={
                  selectedFilter === item.id
                    ? [item.color, item.color + "CC"]
                    : ["rgba(255,255,255,0.3)", "rgba(255,255,255,0.1)"]
                }
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name={item.icon as any}
                  size={18}
                  color={selectedFilter === item.id ? "white" : "rgba(255,255,255,0.8)"}
                />
                <Text className={`ml-2 font-semibold ${selectedFilter === item.id ? "text-white" : "text-white/80"}`}>
                  {item.name}
                </Text>
              </LinearGradient>
            </BlurView>
          </TouchableOpacity>
        )}
      />
    </View>
  )

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <StatusBar barStyle="light-content" backgroundColor="#374151" />
      <LinearGradient colors={["#374151", "#4B5563", "#6B7280"]} style={{ flex: 1 }}>
        <SafeAreaView className="flex-1">
          <View className="px-6 py-4 flex-row items-center justify-between">
            <View>
              <Text className="text-white text-2xl font-bold">Calculation History</Text>
              <Text className="text-white/70 text-base mt-1">{filteredCalculations.length} calculations</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
          </View>

          {renderFilterButtons()}

          <View className="flex-1 bg-gray-50 rounded-t-3xl pt-6">
            {loading ? (
              <View className="flex-1 justify-center items-center">
                <Text className="text-gray-500 text-lg">Loading calculations...</Text>
              </View>
            ) : filteredCalculations.length === 0 ? (
              <View className="flex-1 justify-center items-center px-8">
                <LinearGradient
                  colors={["rgba(107, 114, 128, 0.1)", "rgba(156, 163, 175, 0.1)"]}
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 24,
                  }}
                >
                  <Ionicons name="calculator-outline" size={60} color="#6B7280" />
                </LinearGradient>
                <Text className="text-2xl font-bold text-gray-800 mb-3 text-center">No Calculations Yet</Text>
                <Text className="text-gray-500 text-center text-base leading-6">
                  Your calculation history will appear here once you start calculating
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredCalculations}
                renderItem={renderCalculationItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
              />
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  )
}
