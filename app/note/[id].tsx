"use client"

import { Ionicons } from "@expo/vector-icons"
import { router, useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
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

  const { user } = useAuth()
  const isEditing = id !== "new"

  const categories = ["general", "work", "personal", "study", "ideas", "calculation", "interview"]

  useEffect(() => {
    if (isEditing && id) {
      loadNote()
    } else {
      // Reset for new note
      setCurrentNote(null)
      setTitle("")
      setContent("")
      setCategory("general")
      setHasUnsavedChanges(false)
    }

    return () => {
      clearError()
    }
  }, [id])

  useEffect(() => {
    if (currentNote) {
      setTitle(currentNote.title)
      setContent(currentNote.content)
      setCategory(currentNote.category)
      setHasUnsavedChanges(false)
    }
  }, [currentNote])

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error, [{ text: "OK", onPress: clearError }])
    }
  }, [error])

  const loadNote = async () => {
    if (!id || id === "new") return

    try {
      await fetchNote(id)
    } catch (error: any) {
      Alert.alert("Error", "Failed to load note", [{ text: "OK", onPress: () => router.back() }])
    }
  }

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
      if (isEditing && id) {
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

  if (loading && isEditing) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2196F3" />
          <Text className="text-gray-600 mt-4">Loading note...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {/* Header */}
        <View className="flex-row justify-between items-center px-4 py-3 bg-white border-b border-gray-200">
          <TouchableOpacity onPress={handleBack} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-800">{isEditing ? "Edit Note" : "New Note"}</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !title.trim()}
            className={`p-2 ${saving || !title.trim() ? "opacity-50" : ""}`}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#2196F3" />
            ) : (
              <Ionicons name="save" size={24} color="#2196F3" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          {/* Title Input */}
          <View className="mb-4">
            <TextInput
              className="bg-white p-4 rounded-lg text-xl font-semibold text-gray-800 border border-gray-200"
              placeholder="Note title..."
              value={title}
              onChangeText={handleTitleChange}
              multiline
              maxLength={100}
            />
          </View>

          {/* Category Selection */}
          <View className="mb-4">
            <Text className="text-lg font-semibold text-gray-800 mb-3">Category:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  className={`px-4 py-2 rounded-full mr-2 border ${
                    category === cat ? "bg-primary-500 border-primary-500" : "bg-white border-gray-200"
                  }`}
                  onPress={() => handleCategoryChange(cat)}
                >
                  <Text className={`text-sm font-medium ${category === cat ? "text-white" : "text-gray-600"}`}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Content Input */}
          <View className="mb-4">
            <TextInput
              className="bg-white p-4 rounded-lg text-gray-800 border border-gray-200 min-h-[200px]"
              placeholder="Start writing your note..."
              value={content}
              onChangeText={handleContentChange}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* AI Enhancement Section */}
          {isEditing && content.trim() && (
            <View className="bg-white p-4 rounded-lg mb-4 border border-gray-200">
              <Text className="text-lg font-semibold text-gray-800 mb-3">AI Enhancement</Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className={`flex-1 flex-row items-center justify-center py-3 rounded-lg ${
                    aiLoading === "summarize" ? "bg-gray-400" : "bg-success-500"
                  }`}
                  onPress={() => handleAiEnhancement("summarize")}
                  disabled={!!aiLoading}
                >
                  {aiLoading === "summarize" ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="contract" size={20} color="white" />
                  )}
                  <Text className="text-white font-semibold ml-2">Summarize</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`flex-1 flex-row items-center justify-center py-3 rounded-lg ${
                    aiLoading === "expand" ? "bg-gray-400" : "bg-warning-500"
                  }`}
                  onPress={() => handleAiEnhancement("expand")}
                  disabled={!!aiLoading}
                >
                  {aiLoading === "expand" ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="expand" size={20} color="white" />
                  )}
                  <Text className="text-white font-semibold ml-2">Expand</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* AI Results */}
          {currentNote && showAiResults && (currentNote.ai_summary || currentNote.ai_expanded) && (
            <View className="bg-white p-4 rounded-lg mb-4 border border-gray-200">
              <Text className="text-lg font-semibold text-gray-800 mb-3">AI Results</Text>

              {currentNote.ai_summary && (
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-primary-600 mb-2">Summary:</Text>
                  <Text className="text-gray-700 leading-6">{currentNote.ai_summary}</Text>
                </View>
              )}

              {currentNote.ai_expanded && (
                <View>
                  <Text className="text-sm font-semibold text-warning-600 mb-2">Expanded:</Text>
                  <Text className="text-gray-700 leading-6">{currentNote.ai_expanded}</Text>
                </View>
              )}
            </View>
          )}

          {/* Unsaved Changes Indicator */}
          {hasUnsavedChanges && (
            <View className="bg-warning-50 p-3 rounded-lg border border-warning-200 mb-4">
              <View className="flex-row items-center">
                <Ionicons name="warning" size={16} color="#F59E0B" />
                <Text className="text-warning-700 ml-2 text-sm">You have unsaved changes</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
