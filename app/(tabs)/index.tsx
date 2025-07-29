"use client"

import { Ionicons } from "@expo/vector-icons"
import { router, useFocusEffect } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import { Alert, FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "../../constants/AuthContext"
import type { Note } from "../../constants/types"
import { useNotesStore } from "../../stores/useNotesStore"

export default function NotesScreen() {
  const { notes, loading, error, fetchNotes, deleteNote, clearError } = useNotesStore()
  const [refreshing, setRefreshing] = useState(false)
  const { user, signOut } = useAuth()

  // Refresh notes when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchNotes(user.id)
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

  const renderNoteItem = ({ item }: { item: Note }) => (
    <TouchableOpacity
      className="bg-white p-4 rounded-lg mb-3 shadow-sm border border-gray-100"
      onPress={() => router.push(`/note/${item.id}`)}
      activeOpacity={0.7}
    >
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-lg font-semibold text-gray-800 flex-1 mr-2" numberOfLines={1}>
          {item.title}
        </Text>
        <View className="flex-row items-center">
          {item.is_calculation && (
            <View className="bg-primary-50 p-1 rounded mr-2">
              <Ionicons name="calculator" size={14} color="#2196F3" />
            </View>
          )}
          {item.is_interview_transcript && (
            <View className="bg-success-50 p-1 rounded mr-2">
              <Ionicons name="mic" size={14} color="#10B981" />
            </View>
          )}
          <TouchableOpacity
            onPress={() => handleDeleteNote(item.id, item.title)}
            className="p-1"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <Text className="text-sm text-gray-600 mb-3 leading-5" numberOfLines={2}>
        {item.content || "No content"}
      </Text>

      <View className="flex-row justify-between items-center">
        <View className="bg-primary-50 px-2 py-1 rounded-full">
          <Text className="text-xs text-primary-600 font-medium">{item.category}</Text>
        </View>
        <Text className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>

      {/* AI Enhancement Indicators */}
      {(item.ai_summary || item.ai_expanded) && (
        <View className="flex-row mt-2 gap-1">
          {item.ai_summary && (
            <View className="bg-success-50 px-2 py-1 rounded-full">
              <Text className="text-xs text-success-600 font-medium">Summarized</Text>
            </View>
          )}
          {item.ai_expanded && (
            <View className="bg-warning-50 px-2 py-1 rounded-full">
              <Text className="text-xs text-warning-600 font-medium">Expanded</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  )

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center px-8">
      <View className="bg-gray-100 p-6 rounded-full mb-4">
        <Ionicons name="document-text" size={48} color="#9CA3AF" />
      </View>
      <Text className="text-xl font-semibold text-gray-400 mb-2">No notes yet</Text>
      <Text className="text-gray-300 text-center mb-6">Tap the + button to create your first note</Text>
      <TouchableOpacity className="bg-primary-500 px-6 py-3 rounded-lg" onPress={() => router.push("/note/new")}>
        <Text className="text-white font-semibold">Create Note</Text>
      </TouchableOpacity>
    </View>
  )

  const renderLoadingState = () => (
    <View className="flex-1 justify-center items-center">
      <View className="bg-white p-6 rounded-lg shadow-sm">
        <View className="items-center">
          <View className="animate-spin">
            <Ionicons name="refresh" size={32} color="#2196F3" />
          </View>
          <Text className="text-gray-600 mt-3">Loading notes...</Text>
        </View>
      </View>
    </View>
  )

  return (
<SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-4 bg-white border-b border-gray-200">
        <View>
          <Text className="text-2xl font-bold text-gray-800">My Notes</Text>
          <Text className="text-sm text-gray-500">{notes.length} notes</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} className="p-2">
          <Ionicons name="log-out" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading && notes.length === 0 ? (
        renderLoadingState()
      ) : (
        <FlatList
          data={notes}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={notes.length === 0 ? { flex: 1 } : { padding: 16 }}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#2196F3"]}
              tintColor="#2196F3"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        className="absolute right-5 bottom-5 w-14 h-14 bg-primary-500 rounded-full justify-center items-center shadow-lg"
        onPress={() => router.push("/note/new")}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
      </SafeAreaView>

  )
}
