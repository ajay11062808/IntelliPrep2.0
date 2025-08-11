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
  Modal,
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

  // Filters & sorting state
  const [showFilters, setShowFilters] = useState(false)
  const [datePreset, setDatePreset] = useState<"all" | "today" | "7d" | "30d" | "year">("all")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title" | "category">("newest")

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

  // Available tags from current notes
  const availableTags = Array.from(
    new Set(
      notes
        .flatMap((n) => (Array.isArray(n.tags) ? (n.tags as string[]) : []))
        .filter((t) => !!t)
    ),
  ) as string[]

  // Compute cutoff date based on preset
  const getCutoffDate = (): Date | null => {
    const now = new Date()
    switch (datePreset) {
      case "today":
        return new Date(now.getFullYear(), now.getMonth(), now.getDate())
      case "7d": {
        const d = new Date(now)
        d.setDate(d.getDate() - 7)
        return d
      }
      case "30d": {
        const d = new Date(now)
        d.setDate(d.getDate() - 30)
        return d
      }
      case "year":
        return new Date(now.getFullYear(), 0, 1)
      default:
        return null
    }
  }

  const cutoff = getCutoffDate()

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
    
    let matchesCategory = selectedCategory === "all" || note.category === selectedCategory
    
    // Special handling for voice category
    if (selectedCategory === "voice") {
      matchesCategory = note.is_voice_transcription === true
    }
    // Date preset filter
    const createdAt = new Date(note.created_at)
    const matchesDate = cutoff ? createdAt >= cutoff : true
    // Tags filter (any-match)
    const noteTags = (Array.isArray(note.tags) ? (note.tags as string[]) : [])
    const matchesTags = selectedTags.length === 0 || noteTags.some((t) => selectedTags.includes(t))

    return matchesSearch && matchesCategory && matchesDate && matchesTags
  })

  // Apply sorting
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case "title":
        return a.title.localeCompare(b.title)
      case "category":
        return (a.category || "").localeCompare(b.category || "")
      default:
        // newest
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
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
            {/* <TouchableOpacity
              onPress={() => handleDeleteNote(item.id, item.title)}
              className="w-7 h-7 rounded-full bg-red-100 items-center justify-center"
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity> */}
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
      <Text className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3 text-center">No Notes Yet</Text>
      <Text className="text-gray-500 dark:text-gray-400 text-center text-base leading-6 mb-8">
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
                  onPress={() => setShowFilters(true)}
                  className="w-12 h-12 rounded-full bg-white/20 items-center justify-center"
                >
                  <Ionicons name="options-outline" size={20} color="white" />
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
            {/* Active filter chips */}
            {(datePreset !== "all" || selectedTags.length > 0 || sortBy !== "newest") && (
              <View className="flex-row flex-wrap mt-3">
                {datePreset !== "all" && (
                  <View className="bg-white/25 px-3 py-1 rounded-full mr-2 mb-2 flex-row items-center">
                    <Ionicons name="calendar" size={14} color="#fff" />
                    <Text className="text-white ml-1 text-xs font-medium">{datePreset.toUpperCase()}</Text>
                  </View>
                )}
                {selectedTags.map((t) => (
                  <View key={t} className="bg-white/25 px-3 py-1 rounded-full mr-2 mb-2">
                    <Text className="text-white text-xs font-medium">#{t}</Text>
                  </View>
                ))}
                {sortBy !== "newest" && (
                  <View className="bg-white/25 px-3 py-1 rounded-full mr-2 mb-2 flex-row items-center">
                    <Ionicons name="swap-vertical" size={14} color="#fff" />
                    <Text className="text-white ml-1 text-xs font-medium">{sortBy}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Category Filter */}
          {renderCategoryFilter()}

          {/* Notes List */}
          <View className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-t-3xl pt-6">
            {loading ? (
              <View className="flex-1 justify-center items-center">
                <Text className="text-gray-500 dark:text-gray-400 text-lg">Loading notes...</Text>
              </View>
            ) : filteredNotes.length === 0 ? (
              renderEmptyState()
            ) : (
              <FlatList
                data={sortedNotes}
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
              className="absolute right-6 bottom-6 w-16 h-16 rounded-full items-center justify-center"
              style={{ backgroundColor: "#8B5CF6", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 }}
            >
              <Ionicons name="add" size={28} color="white" />
            </TouchableOpacity>
          )}
          {/* Filters Modal */}
          <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
              <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16 }}>
                <View style={{ alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ width: 60, height: 5, borderRadius: 3, backgroundColor: '#E5E7EB' }} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 12 }}>Filters</Text>

                {/* Date presets */}
                <Text style={{ color: '#6B7280', fontWeight: '700', marginBottom: 8 }}>Date</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {([
                    { id: 'all', label: 'All Time' },
                    { id: 'today', label: 'Today' },
                    { id: '7d', label: 'Last 7 days' },
                    { id: '30d', label: 'Last 30 days' },
                    { id: 'year', label: 'This Year' },
                  ] as const).map((p) => (
                    <TouchableOpacity key={p.id} onPress={() => setDatePreset(p.id)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: datePreset === p.id ? '#6366F1' : '#F3F4F6' }}>
                      <Text style={{ color: datePreset === p.id ? 'white' : '#111827', fontWeight: '700' }}>{p.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Tags */}
                <Text style={{ color: '#6B7280', fontWeight: '700', marginBottom: 8 }}>Tags</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {availableTags.length === 0 && (
                    <Text style={{ color: '#9CA3AF' }}>No tags yet</Text>
                  )}
                  {availableTags.map((t) => {
                    const active = selectedTags.includes(t)
                    return (
                      <TouchableOpacity key={t} onPress={() => setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: active ? '#10B981' : '#F3F4F6' }}>
                        <Text style={{ color: active ? 'white' : '#111827', fontWeight: '700' }}>#{t}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>

                {/* Sort */}
                <Text style={{ color: '#6B7280', fontWeight: '700', marginBottom: 8 }}>Sort by</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {([
                    { id: 'newest', label: 'Newest' },
                    { id: 'oldest', label: 'Oldest' },
                    { id: 'title', label: 'Title' },
                    { id: 'category', label: 'Category' },
                  ] as const).map((s) => (
                    <TouchableOpacity key={s.id} onPress={() => setSortBy(s.id)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: sortBy === s.id ? '#EF4444' : '#F3F4F6' }}>
                      <Text style={{ color: sortBy === s.id ? 'white' : '#111827', fontWeight: '700' }}>{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <TouchableOpacity onPress={() => { setDatePreset('all'); setSelectedTags([]); setSortBy('newest'); }} style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
                    <Text style={{ color: '#111827', fontWeight: '700' }}>Clear</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowFilters(false)} style={{ flex: 1, backgroundColor: '#6366F1', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
                    <Text style={{ color: 'white', fontWeight: '700' }}>Apply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </LinearGradient>
    </>
  )
}
