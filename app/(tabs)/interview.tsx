"use client"

import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { Alert, FlatList, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../constants/AuthContext"
import type { MockInterview } from "../../constants/types"
import { InterviewService } from "../../services/interviewService"
import { useInterviewStore } from "../../stores/useInterviewStore"

export default function InterviewScreen() {
  const { interviews, loading, fetchInterviews, addInterview, deleteInterview } = useInterviewStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newInterviewTitle, setNewInterviewTitle] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("general")
  const [selectedDifficulty, setSelectedDifficulty] = useState("medium")
  const [questionCount, setQuestionCount] = useState("5")
  const [creating, setCreating] = useState(false)

  const { user } = useAuth()

  const categories = [
    { id: "general", name: "General", icon: "chatbubble" },
    { id: "technical", name: "Technical", icon: "code-slash" },
    { id: "behavioral", name: "Behavioral", icon: "people" },
    { id: "leadership", name: "Leadership", icon: "ribbon" },
    { id: "problem-solving", name: "Problem Solving", icon: "bulb" },
  ]

  const difficulties = [
    { id: "easy", name: "Easy", color: "#10B981" },
    { id: "medium", name: "Medium", color: "#F59E0B" },
    { id: "hard", name: "Hard", color: "#EF4444" },
  ]

  useEffect(() => {
    if (user) {
      fetchInterviews(user.id)
    }
  }, [user])

  const handleCreateInterview = async () => {
    if (!newInterviewTitle.trim()) {
      Alert.alert("Error", "Please enter an interview title")
      return
    }

    if (!user) return

    setCreating(true)
    try {
      const interview = await InterviewService.createInterview(
        user.id,
        newInterviewTitle.trim(),
        selectedCategory,
        selectedDifficulty,
        Number.parseInt(questionCount),
      )

      addInterview(interview)
      setShowCreateModal(false)
      setNewInterviewTitle("")
      router.push(`../interview/${interview.id}`)
    } catch (error: any) {
      Alert.alert("Error", "Failed to create interview")
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteInterview = async (interviewId: string) => {
    Alert.alert("Delete Interview", "Are you sure you want to delete this interview?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await InterviewService.deleteInterview(interviewId)
            deleteInterview(interviewId)
          } catch (error: any) {
            Alert.alert("Error", "Failed to delete interview")
          }
        },
      },
    ])
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#10B981"
      case "in_progress":
        return "#F59E0B"
      default:
        return "#2196F3"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed"
      case "in_progress":
        return "In Progress"
      default:
        return "Ready to Start"
    }
  }

  const renderInterviewItem = ({ item }: { item: MockInterview }) => (
    <TouchableOpacity
      className="bg-white p-4 rounded-lg mb-3 shadow-sm border border-gray-100"
      onPress={() => router.push(`../interview/${item.id}`)}
    >
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-lg font-semibold text-gray-800 flex-1" numberOfLines={1}>
          {item.title}
        </Text>
        <TouchableOpacity onPress={() => handleDeleteInterview(item.id)} className="p-1">
          <Ionicons name="trash" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm text-gray-600">{item.questions.length} questions</Text>
        <View className="px-2 py-1 rounded-full" style={{ backgroundColor: `${getStatusColor(item.status)}20` }}>
          <Text className="text-xs font-semibold" style={{ color: getStatusColor(item.status) }}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      {item.score && (
        <View className="flex-row items-center mb-2">
          <Text className="text-sm text-gray-600 mr-2">Score:</Text>
          <Text
            className={`text-sm font-semibold ${
              item.score >= 8 ? "text-success-600" : item.score >= 6 ? "text-warning-600" : "text-error-600"
            }`}
          >
            {item.score}/10
          </Text>
        </View>
      )}

      <Text className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString()}</Text>
    </TouchableOpacity>
  )

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center px-8">
      <View className="bg-gray-100 p-6 rounded-full mb-4">
        <Ionicons name="mic" size={48} color="#9CA3AF" />
      </View>
      <Text className="text-xl font-semibold text-gray-400 mb-2">No interviews yet</Text>
      <Text className="text-gray-300 text-center">Create your first AI mock interview to get started</Text>
    </View>
  )

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-5 py-4 bg-white border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-800">Mock Interviews</Text>
      </View>

      <FlatList
        data={interviews}
        renderItem={renderInterviewItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={interviews.length === 0 ? { flex: 1 } : { padding: 16 }}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        className="absolute right-5 bottom-5 w-14 h-14 bg-primary-500 rounded-full justify-center items-center shadow-lg"
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>

      {/* Create Interview Modal */}
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-200">
            <Text className="text-xl font-semibold text-gray-800">Create Mock Interview</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-5">
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-800 mb-3">Interview Title</Text>
              <TextInput
                className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-gray-800"
                value={newInterviewTitle}
                onChangeText={setNewInterviewTitle}
                placeholder="Enter interview title"
              />
            </View>

            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-800 mb-3">Category</Text>
              <View className="flex-row flex-wrap gap-2">
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    className={`flex-row items-center px-3 py-2 rounded-lg border ${
                      selectedCategory === category.id
                        ? "bg-primary-500 border-primary-500"
                        : "bg-gray-50 border-gray-200"
                    }`}
                    onPress={() => setSelectedCategory(category.id)}
                  >
                    <Ionicons
                      name={category.icon as any}
                      size={16}
                      color={selectedCategory === category.id ? "white" : "#6B7280"}
                    />
                    <Text
                      className={`ml-2 text-sm font-medium ${
                        selectedCategory === category.id ? "text-white" : "text-gray-600"
                      }`}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-800 mb-3">Difficulty</Text>
              <View className="flex-row gap-3">
                {difficulties.map((difficulty) => (
                  <TouchableOpacity
                    key={difficulty.id}
                    className={`flex-1 py-3 rounded-lg border ${
                      selectedDifficulty === difficulty.id ? "border-transparent" : "border-gray-200 bg-gray-50"
                    }`}
                    style={selectedDifficulty === difficulty.id ? { backgroundColor: difficulty.color } : {}}
                    onPress={() => setSelectedDifficulty(difficulty.id)}
                  >
                    <Text
                      className={`text-center font-semibold ${
                        selectedDifficulty === difficulty.id ? "text-white" : "text-gray-600"
                      }`}
                    >
                      {difficulty.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="mb-8">
              <Text className="text-lg font-semibold text-gray-800 mb-3">Number of Questions</Text>
              <View className="flex-row gap-3">
                {["3", "5", "7", "10"].map((count) => (
                  <TouchableOpacity
                    key={count}
                    className={`flex-1 py-3 rounded-lg border ${
                      questionCount === count ? "bg-primary-500 border-primary-500" : "bg-gray-50 border-gray-200"
                    }`}
                    onPress={() => setQuestionCount(count)}
                  >
                    <Text
                      className={`text-center font-semibold ${
                        questionCount === count ? "text-white" : "text-gray-600"
                      }`}
                    >
                      {count}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              className={`py-4 rounded-lg ${creating ? "bg-gray-400" : "bg-primary-500"}`}
              onPress={handleCreateInterview}
              disabled={creating}
            >
              <Text className="text-white text-center font-semibold text-lg">
                {creating ? "Creating..." : "Create Interview"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}
