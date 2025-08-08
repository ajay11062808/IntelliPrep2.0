"use client"

import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { router, useFocusEffect } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  RefreshControl,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../constants/AuthContext"
import type { Note } from "../../constants/types"
import { useNotesStore } from "../../stores/useNotesStore"

const { width } = Dimensions.get("window")

export default function NotesScreen() {
  const { notes, loading, error, fetchNotes, deleteNote, clearError } = useNotesStore()
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [fadeAnim] = useState(new Animated.Value(0))
  const { user, signOut } = useAuth()

  const categories = [
    { id: "all", name: "All", icon: "apps", color: "#6366F1" },
    { id: "general", name: "General", icon: "document-text", color: "#10B981" },
    { id: "calculation", name: "Calculations", icon: "calculator", color: "#F59E0B" },
    { id: "interview", name: "Interviews", icon: "mic", color: "#EF4444" },
    { id: "voice", name: "Voice", icon: "mic", color: "#10B981" },
  ]
  useEffect(() => {
    if (user) {
      fetchNotes(user.id)
    }
  }, [user])
  // Refresh notes when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchNotes(user.id)
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start()
      }
    }, [user]),
  )

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error, [{ text: "OK", onPress: clearError }])
    }
  }, [error])

  const handleRefresh = async () => {
    if (!user) return

    setRefreshing(true)
    try {
      await fetchNotes(user.id)
    } finally {
      setRefreshing(false)
    }
  }

  const handleDeleteNote = async (noteId: string, noteTitle: string) => {
    Alert.alert("Delete Note", `Are you sure you want to delete "${noteTitle}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteNote(noteId)
          } catch (error: any) {
            // Error is handled by the store
          }
        },
      },
    ])
  }

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: signOut,
      },
    ])
  }

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
    
    let matchesCategory = selectedCategory === "all" || note.category === selectedCategory
    
    // Special handling for voice category
    if (selectedCategory === "voice") {
      matchesCategory = note.is_voice_transcription === true
    }
    
    return matchesSearch && matchesCategory
  })

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "calculation":
        return "calculator"
      case "interview":
        return "mic"
      default:
        return "document-text"
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "calculation":
        return "#F59E0B"
      case "interview":
        return "#EF4444"
      default:
        return "#10B981"
    }
  }

  const renderNoteCard = ({ item, index }: { item: Note; index: number }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [
          {
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          },
        ],
      }}
    >
      <TouchableOpacity
        onPress={() => router.push(`/note/${item.id}`)}
        className="mb-4"
        style={{ marginLeft: 16, marginRight: 16 }}
      >
        <LinearGradient
          colors={["rgba(255,255,255,0.9)", "rgba(255,255,255,0.7)"]}
          style={{
            borderRadius: 20,
            padding: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 8,
            borderLeftWidth: 4,
            borderLeftColor: item.color_theme || "#6366F1",
          }}
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: getCategoryColor(item.category) + "20" }}
              >
                <Ionicons
                  name={getCategoryIcon(item.category) as any}
                  size={20}
                  color={getCategoryColor(item.category)}
                />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-800 mb-1" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text className="text-sm text-gray-500 capitalize">
                  {item.category} • {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => handleDeleteNote(item.id, item.title)}
              className="w-8 h-8 rounded-full bg-red-100 items-center justify-center"
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>

          <Text className="text-gray-700 text-base leading-6" numberOfLines={3}>
            {item.content}
          </Text>

          {/* Tags Display */}
          {item.tags && item.tags.length > 0 && (
            <View className="flex-row flex-wrap mt-3 mb-2">
              {item.tags.slice(0, 3).map((tag, tagIndex) => (
                <View
                  key={tagIndex}
                  className="bg-blue-100 px-2 py-1 rounded-full mr-2 mb-1"
                >
                  <Text className="text-blue-700 text-xs font-medium">#{tag}</Text>
                </View>
              ))}
              {item.tags.length > 3 && (
                <View className="bg-gray-100 px-2 py-1 rounded-full mr-2 mb-1">
                  <Text className="text-gray-600 text-xs font-medium">+{item.tags.length - 3} more</Text>
                </View>
              )}
            </View>
          )}

          {/* Feature Indicators */}
          <View className="flex-row mt-3 space-x-2">
            {item.is_calculation && (
              <View className="bg-amber-100 px-3 py-1 rounded-full">
                <Text className="text-amber-700 text-xs font-medium">Calculation</Text>
              </View>
            )}
            {item.is_interview_transcript && (
              <View className="bg-red-100 px-3 py-1 rounded-full">
                <Text className="text-red-700 text-xs font-medium">Interview</Text>
              </View>
            )}
            {item.is_voice_transcription && (
              <View className="bg-green-100 px-3 py-1 rounded-full">
                <Text className="text-green-700 text-xs font-medium">Voice</Text>
              </View>
            )}
            {item.markdown_content && (
              <View className="bg-purple-100 px-3 py-1 rounded-full">
                <Text className="text-purple-700 text-xs font-medium">Markdown</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  )

  const renderCategoryFilter = () => (
    <View className="px-4 mb-4">
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setSelectedCategory(item.id)} className="mr-3">
            <LinearGradient
              colors={
                selectedCategory === item.id
                  ? [item.color, item.color + "CC"]
                  : ["rgba(255,255,255,0.8)", "rgba(255,255,255,0.6)"]
              }
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 25,
                flexDirection: "row",
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Ionicons name={item.icon as any} size={18} color={selectedCategory === item.id ? "white" : item.color} />
              <Text className={`ml-2 font-semibold ${selectedCategory === item.id ? "text-white" : "text-gray-700"}`}>
                {item.name}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      />
    </View>
  )

  const renderEmptyState = () => (
    <Animated.View style={{ opacity: fadeAnim }} className="flex-1 justify-center items-center px-8">
      <LinearGradient
        colors={["rgba(99, 102, 241, 0.1)", "rgba(139, 92, 246, 0.1)"]}
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <Ionicons name="document-text-outline" size={60} color="#6366F1" />
      </LinearGradient>
      <Text className="text-2xl font-bold text-gray-800 mb-3 text-center">No Notes Yet</Text>
      <Text className="text-gray-500 text-center text-base leading-6 mb-8">
        Start creating notes to organize your thoughts, calculations, and interview transcripts
      </Text>
      <TouchableOpacity
        onPress={() => router.push("/note/new")}
        className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-4 rounded-full"
      >
        <LinearGradient
          colors={["#6366F1", "#8B5CF6"]}
          style={{
            paddingHorizontal: 32,
            paddingVertical: 16,
            borderRadius: 25,
          }}
        >
          <Text className="text-white font-semibold text-lg">Create Your First Note</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  )

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
      <LinearGradient colors={["#6366F1", "#8B5CF6", "#EC4899"]} style={{ flex: 1 }}>
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="px-6 py-4">
            <View className="flex-row items-center justify-between mb-6">
              <View>
                <Text className="text-white text-3xl font-bold">My Notes</Text>
                <Text className="text-white/80 text-base mt-1">
                  {filteredNotes.length} {filteredNotes.length === 1 ? "note" : "notes"}
                </Text>
              </View>
              <View className="flex-row space-x-3">
                <TouchableOpacity
                  onPress={() => router.push("/note/new")}
                  className="w-12 h-12 rounded-full bg-white/20 items-center justify-center"
                >
                  <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSignOut}
                  className="w-12 h-12 rounded-full bg-white/20 items-center justify-center"
                >
                  <Ionicons name="log-out-outline" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Bar */}
            <View className="bg-white/20 rounded-2xl px-4 py-3 flex-row items-center">
              <Ionicons name="search" size={20} color="white" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search notes..."
                placeholderTextColor="rgba(255,255,255,0.7)"
                className="flex-1 ml-3 text-white text-base"
              />
            </View>
          </View>

          {/* Category Filter */}
          {renderCategoryFilter()}

          {/* Notes List */}
          <View className="flex-1 bg-gray-50 rounded-t-3xl pt-6">
            {loading ? (
              <View className="flex-1 justify-center items-center">
                <Text className="text-gray-500 text-lg">Loading notes...</Text>
              </View>
            ) : filteredNotes.length === 0 ? (
              renderEmptyState()
            ) : (
              <FlatList
                data={filteredNotes}
                renderItem={renderNoteCard}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                contentContainerStyle={{ paddingBottom: 100 }}
              />
            )}
          </View>

          {/* Floating Action Button */}
          {filteredNotes.length > 0 && (
            <TouchableOpacity
              onPress={() => router.push("/note/new")}
              className="absolute bottom-8 right-6"
              style={{
                shadowColor: "#6366F1",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <LinearGradient
                colors={["#6366F1", "#8B5CF6"]}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="add" size={28} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </LinearGradient>
    </>
  )
}
