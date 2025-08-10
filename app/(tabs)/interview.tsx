"use client"

import { Ionicons } from "@expo/vector-icons"
import * as DocumentPicker from "expo-document-picker"
import * as FileSystem from "expo-file-system"
import { LinearGradient } from "expo-linear-gradient"
import { router } from "expo-router"
import { useEffect, useRef, useState } from "react"
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import PdfTextExtractor from "../../components/PdfTextExtractor"
import { supabase } from "../../config/supabase"
import { useAuth } from "../../constants/AuthContext"
import type { MockInterview } from "../../constants/types"
import { AIService } from "../../services/aiService"
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
  const [resumeContext, setResumeContext] = useState("")
  const [autoFilledFromPdf, setAutoFilledFromPdf] = useState(false)
  const [resumeUpload, setResumeUpload] = useState<{ bucket: string; path: string; text?: string } | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string>("")
  const [pdfModal, setPdfModal] = useState<{ visible: boolean; base64: string | null }>({ visible: false, base64: null })
  const pdfResolveRef = useRef<((text: string) => void) | null>(null)
  const pdfTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const extractionTokenRef = useRef<string | null>(null)

  const { user } = useAuth()
  const contextInputRef = useRef<TextInput | null>(null)

  // Convert base64 string to ArrayBuffer (RN-safe)
  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    let binaryString: string
    if (typeof globalThis.atob === 'function') {
      binaryString = globalThis.atob(base64)
    } else if (typeof (globalThis as any).Buffer !== 'undefined') {
      binaryString = (globalThis as any).Buffer.from(base64, 'base64').toString('binary')
    } else {
      throw new Error('Base64 decoder not available on this platform')
    }
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i)
    return bytes.buffer
  }

  // Run WebView-based extractor using pdf.js in a browser-like env with timeout
  const runWebViewExtract = async (base64: string): Promise<string> => {
    return new Promise<string>((resolve) => {
      // Open modal
      setPdfModal({ visible: true, base64 })
      // Set resolver
      pdfResolveRef.current = (text: string) => resolve(text || "")
      // Safety timeout: auto-close after 20s
      if (pdfTimeoutRef.current) clearTimeout(pdfTimeoutRef.current)
      pdfTimeoutRef.current = setTimeout(() => {
        // Timeout -> close modal and resolve empty to allow fallback (Gemini)
        setPdfModal({ visible: false, base64: null })
        pdfResolveRef.current?.("")
        pdfResolveRef.current = null
        pdfTimeoutRef.current = null
      }, 20000)
    })
  }

  // Build a concise, structured context string from parsed resume fields
  const buildStructuredContext = (parsed: any): string => {
    const parts: string[] = []
    if (parsed?.summary) parts.push(`Summary: ${parsed.summary}`)
    if (Array.isArray(parsed?.skills) && parsed.skills.length) {
      const skills = parsed.skills.slice(0, 20).join(", ")
      parts.push(`Skills: ${skills}`)
    }
    if (Array.isArray(parsed?.certifications) && parsed.certifications.length) {
      const certs = parsed.certifications.slice(0, 10).join(", ")
      parts.push(`Certifications: ${certs}`)
    }
    if (Array.isArray(parsed?.experience) && parsed.experience.length) {
      const expStr = parsed.experience.slice(0, 3).map((e: any) => {
        const header = [e.role, e.company].filter(Boolean).join(" at ") || undefined
        const datesLoc = [e.dates, e.location].filter(Boolean).join(" · ") || undefined
        const bullets: string[] = Array.isArray(e.bullets) ? e.bullets.slice(0, 3) : []
        const bulletStr = bullets.length ? `\n- ${bullets.join("\n- ")}` : ""
        return [header, datesLoc].filter(Boolean).join(" | ") + bulletStr
      }).join("\n\n")
      parts.push(`Experience:\n${expStr}`)
    }
    return parts.join("\n\n").trim()
  }

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

  // Reset create modal state whenever it opens for a clean slate UX
  useEffect(() => {
    if (showCreateModal) {
      setNewInterviewTitle("")
      setResumeContext("")
      setAutoFilledFromPdf(false)
      setResumeUpload(null)
      setStatusMsg("")
      setExtracting(false)
      // ensure no stale extractors linger
      if (pdfTimeoutRef.current) { clearTimeout(pdfTimeoutRef.current); pdfTimeoutRef.current = null }
      setPdfModal({ visible: false, base64: null })
      pdfResolveRef.current = null
      extractionTokenRef.current = null
    }
  }, [showCreateModal])

  const handleCreateInterview = async () => {
    if (!newInterviewTitle.trim()) {
      Alert.alert("Error", "Please enter an interview title")
      return
    }

    if (!user) return

    setCreating(true)
    try {
      let finalContext = resumeContext.trim()
      // If user uploaded a PDF, the text is already extracted on client side
      // The resumeContext already contains the processed text
      const interview = await InterviewService.createInterview(
        user.id,
        newInterviewTitle.trim(),
        selectedCategory,
        selectedDifficulty,
        Number.parseInt(questionCount),
        finalContext || undefined,
      )

      addInterview(interview)
      setShowCreateModal(false)
      setNewInterviewTitle("")
      setResumeUpload(null)
      router.push(`../interview/${interview.id}`)
    } catch (error: any) {
      if (error?.code === "INTERVIEW_DAILY_LIMIT" || /INTERVIEW_DAILY_LIMIT/.test(String(error?.message))) {
        Alert.alert("Daily Limit Reached", "Free plan allows 1 mock interview per day. Try again tomorrow or upgrade in Profile.")
      } else {
        Alert.alert("Error", "Failed to create interview")
      }
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
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black">
      <View className="px-5 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <Text className="text-2xl font-bold text-gray-800 dark:text-gray-100">Mock Interviews</Text>
      </View>

      <FlatList
        data={interviews}
        renderItem={({ item }) => (
          <TouchableOpacity className="mb-3" onPress={() => router.push(`../interview/${item.id}`)}>
            <LinearGradient
              colors={item.status === "completed" ? ["#10B981", "#059669"] : item.status === "in_progress" ? ["#F59E0B", "#D97706"] : ["#6366F1", "#8B5CF6"]}
              style={{ borderRadius: 16, padding: 1 }}
            >
              <View className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-100 dark:border-gray-800">
                <View className="flex-row justify-between items-center mb-2">
                  <View className="flex-1 mr-2">
                    <Text className="text-lg font-semibold text-gray-800 dark:text-gray-100" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text className="text-xs text-gray-400 mt-1">{new Date(item.created_at).toLocaleDateString()}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteInterview(item.id)} className="p-1">
                    <Ionicons name="trash" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center">
                    <Ionicons name="help-circle" size={16} color="#9CA3AF" />
                    <Text className="ml-1 text-sm text-gray-600 dark:text-gray-400">{item.questions.length} Qs</Text>
                  </View>
                  <View className="px-2 py-1 rounded-full" style={{ backgroundColor: `${getStatusColor(item.status)}20` }}>
                    <Text className="text-xs font-semibold" style={{ color: getStatusColor(item.status) }}>
                      {getStatusText(item.status)}
                    </Text>
                  </View>
                  {typeof item.score === "number" && (
                    <View className="flex-row items-center">
                      <Ionicons name="star" size={16} color="#F59E0B" />
                      <Text className="ml-1 text-sm font-semibold text-gray-700 dark:text-gray-300">{item.score}/10</Text>
                    </View>
                  )}
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={interviews.length === 0 ? { flex: 1 } : { padding: 16 }}
        ListEmptyComponent={() => (
          <View className="flex-1 justify-center items-center px-8">
            <LinearGradient colors={["#6366F1", "#8B5CF6"]} style={{ padding: 24, borderRadius: 20, marginBottom: 16 }}>
              <Ionicons name="mic" size={48} color="#FFFFFF" />
            </LinearGradient>
            <Text className="text-xl font-semibold text-gray-400 dark:text-gray-500 mb-2">No interviews yet</Text>
            <Text className="text-gray-300 dark:text-gray-500 text-center">Create your first AI mock interview to get started</Text>
          </View>
        )}
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
        <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
          <PdfTextExtractor
            visible={pdfModal.visible}
            base64={pdfModal.base64 || ''}
            onDone={(res) => {
              // Close modal
              setPdfModal({ visible: false, base64: null })
              // Clear timeout
              if (pdfTimeoutRef.current) { clearTimeout(pdfTimeoutRef.current); pdfTimeoutRef.current = null }
              // Resolve promise
              if (pdfResolveRef.current) {
                pdfResolveRef.current(res.ok && res.text ? res.text : "")
                pdfResolveRef.current = null
              }
            }}
          />
          <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <Text className="text-xl font-semibold text-gray-800 dark:text-gray-100">Create Mock Interview</Text>
            <TouchableOpacity onPress={() => {
              // Close and cleanup any inflight extraction
              setShowCreateModal(false)
              if (pdfTimeoutRef.current) { clearTimeout(pdfTimeoutRef.current); pdfTimeoutRef.current = null }
              setPdfModal({ visible: false, base64: null })
              pdfResolveRef.current = null
              extractionTokenRef.current = null
            }}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-5">
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Interview Title</Text>
              <TextInput
                className="bg-gray-50 dark:bg-gray-800 dark:text-gray-100 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                value={newInterviewTitle}
                onChangeText={setNewInterviewTitle}
                placeholder="Enter interview title"
              />
            </View>

            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Resume / Context (optional)</Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Paste your resume summary or job description. Questions will be tailored to this context.
              </Text>
              <TextInput
                ref={contextInputRef as any}
                className="bg-gray-50 dark:bg-gray-800 dark:text-gray-100 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                value={resumeContext}
                onChangeText={(t) => { setResumeContext(t); if (autoFilledFromPdf) setAutoFilledFromPdf(false) }}
                placeholder="Paste resume or role description..."
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                style={{ minHeight: 140 }}
              />
              {(extracting || statusMsg) && (
                <View className="flex-row items-center mt-1">
                  <ActivityIndicator size="small" color="#6366F1" />
                  <Text className="ml-2 text-xs text-gray-500 dark:text-gray-400">{statusMsg || 'Working...'}</Text>
                </View>
              )}
              {!extracting && autoFilledFromPdf && !!resumeContext && (
                <Text className="text-xs text-green-600 dark:text-green-400 mt-1">Loaded from PDF. You can edit this.</Text>
              )}
              {/* PDF Upload */}
              <View className="mt-3">
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      const pick = await DocumentPicker.getDocumentAsync({ type: "application/pdf" })
                      if (pick?.assets && pick.assets[0]) {
                        const asset = pick.assets[0]
                        // Optional: validate size (<10MB)
                        try {
                          const info: any = await FileSystem.getInfoAsync(asset.uri)
                          if (info?.size && info.size > 10 * 1024 * 1024) {
                            Alert.alert('File too large', 'Please upload a PDF smaller than 10MB.')
                            return
                          }
                        } catch {}
                        const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '-')
                        const baseName = sanitize(asset.name || 'resume')
                        const fileName = `${Date.now()}_${baseName.endsWith('.pdf') ? baseName : baseName + '.pdf'}`
                        const path = `${user?.id || 'anon'}/${fileName}`
                        setStatusMsg('Uploading PDF...')
                        // Read PDF as base64 and upload raw bytes (Uint8Array) to avoid RN file object quirks
                        const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 })
                        const u8 = new Uint8Array(base64ToArrayBuffer(base64))
                        const { data, error } = await supabase.storage
                          .from('resumes')
                          .upload(path, u8, { upsert: true, contentType: 'application/pdf' })
                        if (error) throw error
                        setResumeUpload({ bucket: 'resumes', path: data?.path || path })
                        // Process PDF on client side
                        try {
                          setExtracting(true)
                          // Reset context so old content isn't shown under modal
                          setResumeContext('Extracting from PDF...')
                          setStatusMsg('Processing PDF...')
                          
                          // Extract text client-side quickly using WebView, then refine with Gemini for structure
                          const base64Local = base64
                          const token = `${Date.now()}_${Math.random().toString(36).slice(2)}`
                          extractionTokenRef.current = token
                          const webviewExtract = await runWebViewExtract(base64Local)
                          let structured = webviewExtract
                          // Ask Gemini to parse into structured fields if user has key configured
                          try {
                            const gem = await AIService.extractResumeFromPdfBase64(base64Local)
                            if ((gem as any).status === 'ok') {
                              const ctx = buildStructuredContext((gem as any).parsed)
                              if (ctx) structured = ctx
                            }
                          } catch {}
                          
                          // Only apply if still latest
                          if (extractionTokenRef.current === token && structured && structured.trim()) {
                            setResumeContext(structured)
                            setAutoFilledFromPdf(true)
                            Alert.alert('PDF Processed', 'Your PDF has been uploaded. You can now edit the content below.')
                            // Focus the context box so user sees it immediately
                            setTimeout(() => contextInputRef.current?.focus(), 0)
                          }
                        } catch (e: any) {
                          console.error('PDF processing error:', e)
                          Alert.alert('Processing Error', 'PDF uploaded but text extraction failed. Please paste your resume content manually.')
                        } finally { 
                          setExtracting(false)
                          setStatusMsg("")
                        }
                      }
                    } catch (e: any) {
                      const msg = typeof e?.message === 'string' ? e.message : JSON.stringify(e)
                      Alert.alert('Upload failed', msg || 'Could not upload PDF')
                    }
                  }}
                  className="flex-row items-center justify-center bg-indigo-600 rounded-xl py-3 px-4"
                >
                  <Ionicons name="document" size={18} color="#fff" />
                  <Text className="text-white font-semibold ml-2">{extracting ? 'Processing...' : 'Upload Resume PDF'}</Text>
                </TouchableOpacity>
                {resumeUpload && (
                  <View className="flex-row items-center mt-2">
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text className="ml-2 text-sm text-gray-700 dark:text-gray-300">PDF attached</Text>
                  </View>
                )}
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Category</Text>
              <View className="flex-row flex-wrap gap-2">
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    className={`flex-row items-center px-3 py-2 rounded-lg border ${
                      selectedCategory === category.id
                        ? "bg-primary-500 border-primary-500"
                        : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    }`}
                    onPress={() => setSelectedCategory(category.id)}
                  >
                    <Ionicons
                      name={category.icon as any}
                      size={16}
                      color={selectedCategory === category.id ? "white" : "#9CA3AF"}
                    />
                    <Text
                      className={`ml-2 text-sm font-medium ${
                        selectedCategory === category.id ? "text-white" : "text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Difficulty</Text>
              <View className="flex-row gap-3">
                {difficulties.map((difficulty) => (
                  <TouchableOpacity
                    key={difficulty.id}
                    className={`flex-1 py-3 rounded-lg border ${
                      selectedDifficulty === difficulty.id ? "border-transparent" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                    }`}
                    style={selectedDifficulty === difficulty.id ? { backgroundColor: difficulty.color } : {}}
                    onPress={() => setSelectedDifficulty(difficulty.id)}
                  >
                    <Text
                      className={`text-center font-semibold ${
                        selectedDifficulty === difficulty.id ? "text-white" : "text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {difficulty.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="mb-8">
              <Text className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Number of Questions</Text>
              <View className="flex-row gap-3">
                {["3", "5", "7", "10"].map((count) => (
                  <TouchableOpacity
                    key={count}
                    className={`flex-1 py-3 rounded-lg border ${
                      questionCount === count ? "bg-primary-500 border-primary-500" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    }`}
                    onPress={() => setQuestionCount(count)}
                  >
                    <Text
                      className={`text-center font-semibold ${
                        questionCount === count ? "text-white" : "text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {count}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              className={`py-4 rounded-lg ${creating || extracting ? "bg-gray-400" : "bg-primary-500"}`}
              onPress={handleCreateInterview}
              disabled={creating || extracting}
            >
              <Text className="text-white text-center font-semibold text-lg">
                {creating ? "Creating..." : extracting ? "Extracting PDF..." : "Create Interview"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}
