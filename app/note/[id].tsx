"use client"

import { Ionicons } from "@expo/vector-icons"
import { BlurView } from "expo-blur"
import { LinearGradient } from "expo-linear-gradient"
import { router, useFocusEffect, useLocalSearchParams } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
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
import { useNotesStore } from "../../stores/useNotesStore"

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const {
    currentNote,
    loading,
    saving,
    error,
    fetchNote,
    createNote,
    updateNote,
    enhanceNote,
    setCurrentNote,
    clearError,
  } = useNotesStore()

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [category, setCategory] = useState("general")
  const [aiLoading, setAiLoading] = useState<"summarize" | "expand" | null>(null)
  const [showAiResults, setShowAiResults] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  const { user } = useAuth()
  const isEditing = id !== "new"

  const categories = [
    { id: "general", name: "General", icon: "document-text", color: "#10B981" },
    { id: "work", name: "Work", icon: "briefcase", color: "#3B82F6" },
    { id: "personal", name: "Personal", icon: "person", color: "#8B5CF6" },
    { id: "study", name: "Study", icon: "school", color: "#F59E0B" },
    { id: "ideas", name: "Ideas", icon: "bulb", color: "#EF4444" },
    { id: "calculation", name: "Calculation", icon: "calculator", color: "#06B6D4" },
    { id: "interview", name: "Interview", icon: "mic", color: "#84CC16" },
  ]

  // Initialize state properly when screen focuses
  useFocusEffect(
    useCallback(() => {
      // Clear any existing state first
      setCurrentNote(null)
      setIsInitialized(false)
      setShowAiResults(false)
      clearError()

      if (isEditing && id && id !== "new") {
        // Load existing note
        loadNote()
      } else {
        // Initialize for new note
        initializeNewNote()
      }

      return () => {
        // Cleanup when leaving screen
        setCurrentNote(null)
        clearError()
      }
    }, [id]),
  )

  const initializeNewNote = () => {
    setTitle("")
    setContent("")
    setCategory("general")
    setHasUnsavedChanges(false)
    setIsInitialized(true)
  }

  const loadNote = async () => {
    if (!id || id === "new") return

    try {
      await fetchNote(id)
    } catch (error: any) {
      Alert.alert("Error", "Failed to load note", [{ text: "OK", onPress: () => router.back() }])
    }
  }

  // Update form when note is loaded
  useEffect(() => {
    if (currentNote && isEditing) {
      setTitle(currentNote.title)
      setContent(currentNote.content)
      setCategory(currentNote.category)
      setHasUnsavedChanges(false)
      setIsInitialized(true)
    }
  }, [currentNote, isEditing])

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error, [{ text: "OK", onPress: clearError }])
    }
  }, [error])

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title")
      return
    }
    if (!user) {
      Alert.alert("Error", "User not authenticated")
      return
    }

    try {
      if (isEditing && id && id !== "new") {
        await updateNote(id, {
          title: title.trim(),
          content: content.trim(),
          category,
        })
        Alert.alert("Success", "Note updated successfully", [{ text: "OK", onPress: () => router.back() }])
      } else {
        await createNote(user.id, title.trim(), content.trim(), category)
        Alert.alert("Success", "Note created successfully", [{ text: "OK", onPress: () => router.back() }])
      }
      setHasUnsavedChanges(false)
    } catch (error: any) {
      // Error is handled by the store and shown via useEffect
    }
  }

  const handleAiEnhancement = async (action: "summarize" | "expand") => {
    if (!content.trim()) {
      Alert.alert("Error", "Please add some content to enhance")
      return
    }
    if (!id || id === "new") {
      Alert.alert("Error", "Please save the note first")
      return
    }

    setAiLoading(action)
    try {
      await enhanceNote(id, action, content)
      setShowAiResults(true)
      Alert.alert("Success", `Note ${action === "summarize" ? "summarized" : "expanded"} successfully!`)
    } catch (error: any) {
      // Error is handled by the store
    } finally {
      setAiLoading(null)
    }
  }

  const handleBack = () => {
    if (hasUnsavedChanges) {
      Alert.alert("Unsaved Changes", "You have unsaved changes. Do you want to save before leaving?", [
        { text: "Don't Save", style: "destructive", onPress: () => router.back() },
        { text: "Cancel", style: "cancel" },
        { text: "Save", onPress: handleSave },
      ])
    } else {
      router.back()
    }
  }

  const handleTitleChange = (text: string) => {
    setTitle(text)
    setHasUnsavedChanges(true)
  }

  const handleContentChange = (text: string) => {
    setContent(text)
    setHasUnsavedChanges(true)
  }

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory)
    setHasUnsavedChanges(true)
  }

  // Show loading only when editing and not initialized
  if (loading && isEditing && !isInitialized) {
    return (
      <LinearGradient colors={["#6366F1", "#8B5CF6"]} style={{ flex: 1 }}>
        <SafeAreaView className="flex-1">
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="white" />
            <Text className="text-white mt-4 text-lg">Loading note...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    )
  }

  return (
    <LinearGradient colors={["#6366F1", "#8B5CF6"]} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"}>
          {/* Header */}
          <View className="flex-row justify-between items-center px-6 py-4">
            <TouchableOpacity
              onPress={handleBack}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View className="flex-1 mx-4">
              <Text className="text-white text-xl font-bold text-center">{isEditing ? "Edit Note" : "New Note"}</Text>
            </View>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || !title.trim()}
              className={`w-10 h-10 rounded-full bg-white/20 items-center justify-center ${
                saving || !title.trim() ? "opacity-50" : ""
              }`}
            >
              {saving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="save" size={24} color="white" />
              )}
            </TouchableOpacity>
          </View>

          {/* Content Area */}
          <View className="flex-1 bg-gray-50 rounded-t-3xl">
            <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
              {/* Title Input */}
              <View className="mb-6">
                <BlurView intensity={20} tint="light" style={{ borderRadius: 15, overflow: "hidden" }}>
                  <TextInput
                    className="bg-white/30 p-4 text-xl font-semibold text-gray-800"
                    placeholder="Note title..."
                    placeholderTextColor="rgba(0,0,0,0.4)"
                    value={title}
                    onChangeText={handleTitleChange}
                    multiline
                    maxLength={100}
                  />
                </BlurView>
              </View>

              {/* Category Selection */}
              <View className="mb-6">
                <Text className="text-lg font-bold text-gray-800 mb-4">Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row space-x-3">
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => handleCategoryChange(cat.id)}
                        className="items-center"
                      >
                        <BlurView
                          intensity={category === cat.id ? 40 : 20}
                          tint="light"
                          style={{ borderRadius: 20, overflow: "hidden" }}
                        >
                          <LinearGradient
                            colors={
                              category === cat.id
                                ? [cat.color, cat.color + "CC"]
                                : ["rgba(255,255,255,0.8)", "rgba(255,255,255,0.6)"]
                            }
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 10,
                              flexDirection: "row",
                              alignItems: "center",
                              minWidth: 100,
                              justifyContent: "center",
                            }}
                          >
                            <Ionicons
                              name={cat.icon as any}
                              size={18}
                              color={category === cat.id ? "white" : cat.color}
                            />
                            <Text
                              className={`ml-2 font-semibold text-sm ${
                                category === cat.id ? "text-white" : "text-gray-700"
                              }`}
                            >
                              {cat.name}
                            </Text>
                          </LinearGradient>
                        </BlurView>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Content Input */}
              <View className="mb-6">
                <BlurView intensity={20} tint="light" style={{ borderRadius: 15, overflow: "hidden" }}>
                  <TextInput
                    className="bg-white/30 p-4 text-gray-800 min-h-[200px]"
                    placeholder="Start writing your note..."
                    placeholderTextColor="rgba(0,0,0,0.4)"
                    value={content}
                    onChangeText={handleContentChange}
                    multiline
                    textAlignVertical="top"
                  />
                </BlurView>
              </View>

              {/* AI Enhancement Section */}
              {isEditing && content.trim() && (
                <View className="mb-6">
                  <BlurView intensity={30} tint="light" style={{ borderRadius: 20, overflow: "hidden" }}>
                    <LinearGradient colors={["rgba(255,255,255,0.9)", "rgba(255,255,255,0.7)"]} style={{ padding: 20 }}>
                      <Text className="text-lg font-bold text-gray-800 mb-4">AI Enhancement</Text>
                      <View className="flex-row space-x-3">
                        <TouchableOpacity
                          className="flex-1"
                          onPress={() => handleAiEnhancement("summarize")}
                          disabled={!!aiLoading}
                        >
                          <LinearGradient
                            colors={aiLoading === "summarize" ? ["#9CA3AF", "#6B7280"] : ["#10B981", "#059669"]}
                            style={{
                              paddingVertical: 12,
                              borderRadius: 12,
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {aiLoading === "summarize" ? (
                              <ActivityIndicator size="small" color="white" />
                            ) : (
                              <Ionicons name="contract" size={20} color="white" />
                            )}
                            <Text className="text-white font-semibold ml-2">Summarize</Text>
                          </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                          className="flex-1"
                          onPress={() => handleAiEnhancement("expand")}
                          disabled={!!aiLoading}
                        >
                          <LinearGradient
                            colors={aiLoading === "expand" ? ["#9CA3AF", "#6B7280"] : ["#F59E0B", "#D97706"]}
                            style={{
                              paddingVertical: 12,
                              borderRadius: 12,
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {aiLoading === "expand" ? (
                              <ActivityIndicator size="small" color="white" />
                            ) : (
                              <Ionicons name="expand" size={20} color="white" />
                            )}
                            <Text className="text-white font-semibold ml-2">Expand</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  </BlurView>
                </View>
              )}

              {/* AI Results */}
              {currentNote && showAiResults && (currentNote.ai_summary || currentNote.ai_expanded) && (
                <View className="mb-6">
                  <BlurView intensity={30} tint="light" style={{ borderRadius: 20, overflow: "hidden" }}>
                    <LinearGradient colors={["rgba(255,255,255,0.9)", "rgba(255,255,255,0.7)"]} style={{ padding: 20 }}>
                      <Text className="text-lg font-bold text-gray-800 mb-4">AI Results</Text>
                      {currentNote.ai_summary && (
                        <View className="mb-4">
                          <View className="flex-row items-center mb-2">
                            <Ionicons name="contract" size={16} color="#10B981" />
                            <Text className="text-sm font-semibold text-green-600 ml-2">Summary:</Text>
                          </View>
                          <Text className="text-gray-700 leading-6 bg-green-50 p-3 rounded-lg">
                            {currentNote.ai_summary}
                          </Text>
                        </View>
                      )}
                      {currentNote.ai_expanded && (
                        <View>
                          <View className="flex-row items-center mb-2">
                            <Ionicons name="expand" size={16} color="#F59E0B" />
                            <Text className="text-sm font-semibold text-amber-600 ml-2">Expanded:</Text>
                          </View>
                          <Text className="text-gray-700 leading-6 bg-amber-50 p-3 rounded-lg">
                            {currentNote.ai_expanded}
                          </Text>
                        </View>
                      )}
                    </LinearGradient>
                  </BlurView>
                </View>
              )}

              {/* Unsaved Changes Indicator */}
              {hasUnsavedChanges && (
                <View className="mb-6">
                  <BlurView intensity={20} tint="light" style={{ borderRadius: 15, overflow: "hidden" }}>
                    <LinearGradient
                      colors={["rgba(251, 191, 36, 0.2)", "rgba(245, 158, 11, 0.2)"]}
                      style={{ padding: 16 }}
                    >
                      <View className="flex-row items-center">
                        <Ionicons name="warning" size={20} color="#F59E0B" />
                        <Text className="text-amber-700 ml-3 font-medium">You have unsaved changes</Text>
                      </View>
                    </LinearGradient>
                  </BlurView>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  )
}
