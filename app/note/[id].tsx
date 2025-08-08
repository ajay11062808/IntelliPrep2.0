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
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import AudioPermissionRequest from "../../components/AudioPermissionRequest"
import ColorThemeSelector from "../../components/ColorThemeSelector"
import MarkdownPreview from "../../components/MarkdownPreview"
import TagSelector from "../../components/TagSelector"
import VoiceRecorder from "../../components/VoiceRecorder"
import { useAuth } from "../../constants/AuthContext"
import type { VoiceData } from "../../constants/types"
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
  const [markdownContent, setMarkdownContent] = useState("")
  const [category, setCategory] = useState("general")
  const [tags, setTags] = useState<string[]>([])
  const [colorTheme, setColorTheme] = useState("#6366F1")
  const [aiLoading, setAiLoading] = useState<"summarize" | "expand" | null>(null)
  const [showAiResults, setShowAiResults] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false)
  const [showPermissionRequest, setShowPermissionRequest] = useState(false)
  const [voiceData, setVoiceData] = useState<VoiceData | undefined>(undefined)
  
  // New state for dropdowns
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [showTagsDropdown, setShowTagsDropdown] = useState(false)
  const [showColorDropdown, setShowColorDropdown] = useState(false)
  const [showAiDropdown, setShowAiDropdown] = useState(false)

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
    setMarkdownContent("")
    setCategory("general")
    setTags([])
    setColorTheme("#6366F1")
    setVoiceData(undefined)
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
      setMarkdownContent(currentNote.markdown_content || "")
      setCategory(currentNote.category)
      setTags(currentNote.tags || [])
      setColorTheme(currentNote.color_theme || "#6366F1")
      setVoiceData(currentNote.voice_data || undefined)
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
          markdown_content: markdownContent.trim(),
          category,
          tags,
          color_theme: colorTheme,
          voice_data: voiceData,
        })
        Alert.alert("Success", "Note updated successfully", [{ text: "OK", onPress: () => router.back() }])
      } else {
        await createNote(
          user.id,
          title.trim(),
          content.trim(),
          category,
          false,
          false,
          undefined,
          undefined,
          markdownContent.trim(),
          tags,
          colorTheme,
          voiceData,
        )
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
      Alert.alert("Error", error.message || "Failed to enhance note")
    } finally {
      setAiLoading(null)
    }
  }

  const handleVoiceTranscriptionComplete = (newVoiceData: VoiceData) => {
    setVoiceData(newVoiceData)
    setContent((prev) => prev + (prev ? "\n\n" : "") + newVoiceData.transcription || "")
    setShowVoiceRecorder(false)
  }

  const handleBack = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to leave?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Leave", onPress: () => router.back() },
        ]
      )
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

  const handleMarkdownChange = (text: string) => {
    setMarkdownContent(text)
    setHasUnsavedChanges(true)
  }

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory)
    setHasUnsavedChanges(true)
    setShowCategoryDropdown(false)
  }

  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags)
    setHasUnsavedChanges(true)
    setShowTagsDropdown(false)
  }

  const handleColorThemeChange = (newColor: string) => {
    setColorTheme(newColor)
    setHasUnsavedChanges(true)
    setShowColorDropdown(false)
  }

  // Show loading only when editing and not initialized
  if (loading && isEditing && !isInitialized) {
    return (
      <LinearGradient colors={[colorTheme, colorTheme + "CC"]} style={{ flex: 1 }}>
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
    <LinearGradient colors={[colorTheme, colorTheme + "CC"]} style={{ flex: 1 }}>
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
            <View className="flex-row space-x-2">
              <TouchableOpacity
                onPress={() => setShowMarkdownPreview(true)}
                className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
              >
                <Ionicons name="eye" size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowPermissionRequest(true)}
                className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
              >
                <Ionicons name="mic" size={20} color="white" />
              </TouchableOpacity>
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

              {/* Quick Actions Bar */}
              <View className="mb-6">
                <View className="flex-row justify-between items-center">
                  {/* Category Dropdown */}
                  <TouchableOpacity
                    onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className="flex-1 mr-2"
                  >
                    <BlurView intensity={20} tint="light" style={{ borderRadius: 12, overflow: "hidden" }}>
                      <View className="flex-row items-center justify-between p-3 bg-white/30">
                        <View className="flex-row items-center">
                          <Ionicons 
                            name={categories.find(c => c.id === category)?.icon as any} 
                            size={18} 
                            color={categories.find(c => c.id === category)?.color} 
                          />
                          <Text className="ml-2 font-semibold text-gray-700">
                            {categories.find(c => c.id === category)?.name}
                          </Text>
                        </View>
                        <Ionicons name="chevron-down" size={16} color="#6B7280" />
                      </View>
                    </BlurView>
                  </TouchableOpacity>

                  {/* AI Enhancement Button - More Prominent */}
                  <TouchableOpacity
                    onPress={() => setShowAiDropdown(!showAiDropdown)}
                    className="flex-1 ml-2"
                  >
                    <BlurView intensity={20} tint="light" style={{ borderRadius: 12, overflow: "hidden" }}>
                      <LinearGradient
                        colors={["#8B5CF6", "#7C3AED"]}
                        style={{ borderRadius: 12, overflow: "hidden" }}
                      >
                        <View className="flex-row items-center justify-between p-3">
                          <View className="flex-row items-center">
                            <Ionicons name="sparkles" size={18} color="white" />
                            <Text className="ml-2 font-semibold text-white">AI Enhance</Text>
                          </View>
                          <Ionicons name="chevron-down" size={16} color="white" />
                        </View>
                      </LinearGradient>
                    </BlurView>
                  </TouchableOpacity>
                </View>

                {/* Category Dropdown */}
                {showCategoryDropdown && (
                  <View className="mt-2 bg-white rounded-lg shadow-lg">
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => handleCategoryChange(cat.id)}
                        className="flex-row items-center p-3 border-b border-gray-100"
                      >
                        <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                        <Text className="ml-3 font-medium text-gray-700">{cat.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* AI Enhancement Dropdown */}
                {showAiDropdown && (
                  <View className="mt-2 bg-white rounded-lg shadow-lg">
                    <View className="p-3 border-b border-gray-100 bg-purple-50">
                      <Text className="font-semibold text-purple-700">AI Enhancement Tools</Text>
                      <Text className="text-sm text-purple-600">Enhance your note with AI</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleAiEnhancement("summarize")}
                      className="flex-row items-center p-3 border-b border-gray-100"
                      disabled={aiLoading === "summarize"}
                    >
                      <Ionicons name="text" size={18} color="#10B981" />
                      <Text className="ml-3 font-medium text-gray-700">Summarize Content</Text>
                      {aiLoading === "summarize" && <ActivityIndicator size="small" color="#10B981" className="ml-auto" />}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleAiEnhancement("expand")}
                      className="flex-row items-center p-3"
                      disabled={aiLoading === "expand"}
                    >
                      <Ionicons name="expand" size={18} color="#F59E0B" />
                      <Text className="ml-3 font-medium text-gray-700">Expand Content</Text>
                      {aiLoading === "expand" && <ActivityIndicator size="small" color="#F59E0B" className="ml-auto" />}
                    </TouchableOpacity>
                  </View>
                )}
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
                
                {/* Quick AI Enhancement Button - Always visible when there's content */}
                {content.trim().length > 10 && (
                  <View className="mt-3 flex-row space-x-2">
                    <TouchableOpacity
                      onPress={() => handleAiEnhancement("summarize")}
                      disabled={aiLoading === "summarize"}
                      className="flex-1"
                    >
                      <LinearGradient
                        colors={aiLoading === "summarize" ? ["#9CA3AF", "#6B7280"] : ["#10B981", "#059669"]}
                        style={{ borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 }}
                      >
                        <View className="flex-row items-center justify-center">
                          {aiLoading === "summarize" ? (
                            <ActivityIndicator size="small" color="white" />
                          ) : (
                            <Ionicons name="text" size={16} color="white" />
                          )}
                          <Text className="text-white font-semibold ml-2 text-sm">
                            {aiLoading === "summarize" ? "Summarizing..." : "Summarize"}
                          </Text>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => handleAiEnhancement("expand")}
                      disabled={aiLoading === "expand"}
                      className="flex-1"
                    >
                      <LinearGradient
                        colors={aiLoading === "expand" ? ["#9CA3AF", "#6B7280"] : ["#F59E0B", "#D97706"]}
                        style={{ borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 }}
                      >
                        <View className="flex-row items-center justify-center">
                          {aiLoading === "expand" ? (
                            <ActivityIndicator size="small" color="white" />
                          ) : (
                            <Ionicons name="expand" size={16} color="white" />
                          )}
                          <Text className="text-white font-semibold ml-2 text-sm">
                            {aiLoading === "expand" ? "Expanding..." : "Expand"}
                          </Text>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Additional Features Section */}
              <View className="mb-6">
                <Text className="text-lg font-bold text-gray-800 mb-4">Additional Features</Text>
                
                {/* Tags */}
                <TouchableOpacity
                  onPress={() => setShowTagsDropdown(!showTagsDropdown)}
                  className="mb-3"
                >
                  <BlurView intensity={20} tint="light" style={{ borderRadius: 12, overflow: "hidden" }}>
                    <View className="flex-row items-center justify-between p-3 bg-white/30">
                      <View className="flex-row items-center">
                        <Ionicons name="pricetag" size={18} color="#3B82F6" />
                        <Text className="ml-2 font-semibold text-gray-700">
                          Tags {tags.length > 0 && `(${tags.length})`}
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={16} color="#6B7280" />
                    </View>
                  </BlurView>
                </TouchableOpacity>

                {/* Color Theme */}
                <TouchableOpacity
                  onPress={() => setShowColorDropdown(!showColorDropdown)}
                  className="mb-3"
                >
                  <BlurView intensity={20} tint="light" style={{ borderRadius: 12, overflow: "hidden" }}>
                    <View className="flex-row items-center justify-between p-3 bg-white/30">
                      <View className="flex-row items-center">
                        <Ionicons name="color-palette" size={18} color={colorTheme} />
                        <Text className="ml-2 font-semibold text-gray-700">Color Theme</Text>
                      </View>
                      <Ionicons name="chevron-down" size={16} color="#6B7280" />
                    </View>
                  </BlurView>
                </TouchableOpacity>

                {/* Voice Recording */}
                <TouchableOpacity
                  onPress={() => setShowVoiceRecorder(true)}
                  className="mb-3"
                >
                  <BlurView intensity={20} tint="light" style={{ borderRadius: 12, overflow: "hidden" }}>
                    <View className="flex-row items-center justify-between p-3 bg-white/30">
                      <View className="flex-row items-center">
                        <Ionicons name="mic" size={18} color="#EF4444" />
                        <Text className="ml-2 font-semibold text-gray-700">Voice Recording</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#6B7280" />
                    </View>
                  </BlurView>
                </TouchableOpacity>

                {/* Tags Dropdown */}
                {showTagsDropdown && (
                  <View className="mt-2 bg-white rounded-lg shadow-lg p-4">
                    <TagSelector tags={tags} onTagsChange={handleTagsChange} />
                  </View>
                )}

                {/* Color Theme Dropdown */}
                {showColorDropdown && (
                  <View className="mt-2 bg-white rounded-lg shadow-lg p-4">
                    <ColorThemeSelector selectedColor={colorTheme} onColorChange={handleColorThemeChange} />
                  </View>
                )}
              </View>

              {/* AI Results */}
              {currentNote && showAiResults && (currentNote.ai_summary || currentNote.ai_expanded) && (
                <View className="mb-6">
                  <View className="flex-row items-center mb-4">
                    <Ionicons name="sparkles" size={20} color="#8B5CF6" />
                    <Text className="text-lg font-bold text-gray-800 ml-2">AI Enhancements</Text>
                  </View>
                  <BlurView intensity={20} tint="light" style={{ borderRadius: 15, overflow: "hidden" }}>
                    <View className="bg-white/30 p-4">
                      {currentNote.ai_summary && (
                        <View className="mb-4">
                          <View className="flex-row items-center mb-2">
                            <Ionicons name="text" size={16} color="#10B981" />
                            <Text className="text-sm font-semibold text-green-600 ml-2">Summary:</Text>
                          </View>
                          <Text className="text-gray-700 bg-green-50 p-3 rounded-lg">{currentNote.ai_summary}</Text>
                        </View>
                      )}
                      {currentNote.ai_expanded && (
                        <View>
                          <View className="flex-row items-center mb-2">
                            <Ionicons name="expand" size={16} color="#F59E0B" />
                            <Text className="text-sm font-semibold text-amber-600 ml-2">Expanded:</Text>
                          </View>
                          <Text className="text-gray-700 bg-amber-50 p-3 rounded-lg">{currentNote.ai_expanded}</Text>
                        </View>
                      )}
                    </View>
                  </BlurView>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>

        {/* Modals */}
        <Modal visible={showVoiceRecorder} animationType="slide" presentationStyle="pageSheet">
          <VoiceRecorder
            onTranscriptionComplete={handleVoiceTranscriptionComplete}
            onRecordingStart={() => console.log("Recording started")}
            onRecordingStop={() => console.log("Recording stopped")}
          />
          <TouchableOpacity
            onPress={() => setShowVoiceRecorder(false)}
            className="absolute top-12 right-4 w-10 h-10 rounded-full bg-gray-800/50 items-center justify-center"
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </Modal>

        <Modal visible={showMarkdownPreview} animationType="slide" presentationStyle="pageSheet">
          <MarkdownPreview content={markdownContent || content} />
          <TouchableOpacity
            onPress={() => setShowMarkdownPreview(false)}
            className="absolute top-12 right-4 w-10 h-10 rounded-full bg-gray-800/50 items-center justify-center"
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </Modal>

        <AudioPermissionRequest
          visible={showPermissionRequest}
          onPermissionGranted={() => {
            setShowPermissionRequest(false)
            setShowVoiceRecorder(true)
          }}
          onPermissionDenied={() => setShowPermissionRequest(false)}
          onClose={() => setShowPermissionRequest(false)}
        />
      </SafeAreaView>
    </LinearGradient>
  )
}
