"use client"

import { Ionicons } from "@expo/vector-icons"
import { router, useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
// Mic features temporarily disabled
import { useAuth } from "../../constants/AuthContext"
import type { InterviewResponse, MockInterview } from "../../constants/types"
import { InterviewService } from "../../services/interviewService"
import { NotesService } from "../../services/notesService"

export default function InterviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [interview, setInterview] = useState<MockInterview | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [currentAnswer, setCurrentAnswer] = useState("")
  const [responses, setResponses] = useState<InterviewResponse[]>([])
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null)
  const [showSaveTranscriptModal, setShowSaveTranscriptModal] = useState(false)
  const [transcriptTitle, setTranscriptTitle] = useState("")
  const [interviewStarted, setInterviewStarted] = useState(false)

  const { user } = useAuth()

  useEffect(() => {
    if (id) {
      loadInterview()
    }
  }, [id])

  const loadInterview = async () => {
    if (!id) return

    setLoading(true)
    try {
      const fetchedInterview = await InterviewService.getInterview(id)
      if (fetchedInterview) {
        setInterview(fetchedInterview)
        setResponses(fetchedInterview.responses || [])
        setInterviewStarted(fetchedInterview.status !== "pending")

        if (fetchedInterview.status === "completed") {
          setTranscriptTitle(`${fetchedInterview.title} - Interview Transcript`)
        }
      }
    } catch (error: any) {
      Alert.alert("Error", "Failed to load interview")
      router.back()
    } finally {
      setLoading(false)
    }
  }

  const startInterview = async () => {
    if (!interview || !id) return

    try {
      await InterviewService.startInterview(id)
      setInterviewStarted(true)
      setStartTime(new Date())
      setQuestionStartTime(new Date())
      setCurrentQuestionIndex(0)
    } catch (error: any) {
      Alert.alert("Error", "Failed to start interview")
    }
  }

  const submitAnswer = async () => {
    if (!interview || !currentAnswer.trim() || !questionStartTime) return

    const currentQuestion = interview.questions[currentQuestionIndex]
    const duration = Math.floor((new Date().getTime() - questionStartTime.getTime()) / 1000)

    try {
      const evaluation = await InterviewService.submitResponse(
        interview.id,
        currentQuestion.id,
        currentQuestion.text,
        currentAnswer.trim(),
        duration,
      )

      const newResponse: InterviewResponse = {
        question_id: currentQuestion.id,
        question_text: currentQuestion.text,
        answer: currentAnswer.trim(),
        duration,
        score: evaluation.score,
        feedback: evaluation.feedback,
        timestamp: new Date().toISOString(),
      }

      setResponses([...responses, newResponse])
      setCurrentAnswer("")

      // Move to next question or complete interview
      if (currentQuestionIndex < interview.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
        setQuestionStartTime(new Date())
      } else {
        await completeInterview()
      }
    } catch (error: any) {
      Alert.alert("Error", "Failed to submit answer")
    }
  }

  const completeInterview = async () => {
    if (!interview || !startTime) return

    const totalDuration = Math.floor((new Date().getTime() - startTime.getTime()) / 1000)
    const transcript = generateTranscript()

    try {
      const completedInterview = await InterviewService.completeInterview(interview.id, transcript, totalDuration)
      setInterview(completedInterview)
      // Auto-publish transcript to Notes
      try {
        if (user) {
          const title = `${completedInterview.title} - Interview Transcript`
          await NotesService.createNote(
            user.id,
            title,
            transcript,
            "interview",
            false,
            true,
            undefined,
            {
              questions: completedInterview.questions,
              responses: responses,
              duration: completedInterview.duration || totalDuration,
              score: completedInterview.score,
              feedback: completedInterview.feedback,
            },
          )
        }
      } catch {}
      Alert.alert("Interview Complete!", `Your score: ${completedInterview.score}/10\nTranscript saved to Notes.`)
    } catch (error: any) {
      Alert.alert("Error", "Failed to complete interview")
    }
  }

  const generateTranscript = (): string => {
    let transcript = `Interview: ${interview?.title}\n`
    transcript += `Date: ${new Date().toLocaleDateString()}\n`
    transcript += `Duration: ${startTime ? Math.floor((new Date().getTime() - startTime.getTime()) / 60000) : 0} minutes\n\n`

    responses.forEach((response, index) => {
      transcript += `Question ${index + 1}: ${response.question_text}\n`
      transcript += `Answer: ${response.answer}\n`
      transcript += `Score: ${response.score}/10\n`
      transcript += `Feedback: ${response.feedback}\n\n`
    })

    return transcript
  }

  const saveTranscriptToNotes = async () => {
    if (!user || !interview) return

    if (!transcriptTitle.trim()) {
      Alert.alert("Error", "Please enter a title for the transcript")
      return
    }

    try {
      const transcript = generateTranscript()

      await NotesService.createNote(
        user.id,
        transcriptTitle.trim(),
        transcript,
        "interview",
        false,
        true,
        undefined,
        {
          questions: interview.questions,
          responses: responses,
          duration: interview.duration || 0,
          score: interview.score,
          feedback: interview.feedback,
        },
      )

      Alert.alert("Success", "Interview transcript saved to notes!")
      setShowSaveTranscriptModal(false)
      setTranscriptTitle("")
    } catch (error: any) {
      Alert.alert("Error", "Failed to save transcript to notes")
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    )
  }

  if (!interview) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <Text className="text-base text-gray-600 dark:text-gray-300">Interview not found</Text>
      </View>
    )
  }

  const currentQuestion = interview.questions[currentQuestionIndex]
  const isCompleted = interview.status === "completed"

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-row items-center justify-between px-4 py-3 pt-12 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#9CA3AF" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-semibold text-gray-800 dark:text-gray-100" numberOfLines={1}>
          {interview.title}
        </Text>
        {isCompleted ? (
          <TouchableOpacity onPress={() => setShowSaveTranscriptModal(true)}>
            <Ionicons name="save" size={24} color="#6366F1" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView className="flex-1 px-4 py-4">
        {!interviewStarted ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="mic" size={80} color="#6366F1" />
            <Text className="mt-5 mb-2 text-2xl font-bold text-gray-800 dark:text-gray-100">Ready to Start?</Text>
            <Text className="text-center text-base text-gray-600 dark:text-gray-300 mb-10 leading-6">
              This interview contains {interview.questions.length} questions. Take your time and answer thoughtfully.
            </Text>
            <TouchableOpacity className="bg-indigo-600 rounded-xl px-8 py-4" onPress={startInterview}>
              <Text className="text-white text-lg font-semibold">Start Interview</Text>
            </TouchableOpacity>
          </View>
        ) : isCompleted ? (
          <View className="items-center px-5">
            <Ionicons name="checkmark-circle" size={80} color="#22C55E" />
            <Text className="mt-5 mb-4 text-2xl font-bold text-gray-800 dark:text-gray-100">Interview Complete!</Text>
            <Text className="text-xl font-semibold text-green-600 dark:text-green-400 mb-5">
              Your Score: {interview.score}/10
            </Text>

            {interview.feedback && (
              <View className="self-stretch bg-white dark:bg-gray-800 rounded-xl p-4 mb-5">
                <Text className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">Overall Feedback:</Text>
                <Text className="text-sm text-gray-600 dark:text-gray-300">{interview.feedback}</Text>
              </View>
            )}

            <TouchableOpacity className="flex-row items-center gap-2 bg-indigo-600 rounded-xl px-5 py-3 mb-5" onPress={() => setShowSaveTranscriptModal(true)}>
              <Ionicons name="document-text" size={20} color="white" />
              <Text className="text-white text-base font-semibold">Save Transcript to Notes</Text>
            </TouchableOpacity>

            <View className="self-stretch">
              <Text className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Your Responses:</Text>
              {responses.map((response, index) => (
                <View key={index} className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3">
                  <Text className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">
                    Q{index + 1}: {response.question_text}
                  </Text>
                  <Text className="text-sm text-gray-700 dark:text-gray-300 mb-2 leading-5">{response.answer}</Text>
                  <View className="flex-row items-center justify-between mb-2">
                    <Text style={{ color: response.score && response.score >= 7 ? "#22C55E" : "#F59E0B" }} className="text-sm font-semibold">
                      Score: {response.score}/10
                    </Text>
                    <Text className="text-xs text-gray-500">{response.duration}s</Text>
                  </View>
                  {response.feedback && (
                    <Text className="text-xs italic text-gray-600 dark:text-gray-300">{response.feedback}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View className="flex-1">
            <View className="mb-5">
              <Text className="text-center text-base text-gray-600 dark:text-gray-300 mb-2">
                Question {currentQuestionIndex + 1} of {interview.questions.length}
              </Text>
              <View className="h-1 rounded bg-gray-200 dark:bg-gray-700">
                <View
                  className="h-full rounded bg-indigo-600"
                  style={{ width: `${((currentQuestionIndex + 1) / interview.questions.length) * 100}%` }}
                />
              </View>
            </View>

            <View className="bg-white dark:bg-gray-800 rounded-xl p-5 mb-5">
              <Text className="text-lg text-gray-800 dark:text-gray-100 leading-7 mb-3">{currentQuestion.text}</Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full">
                  {currentQuestion.category}
                </Text>
                <Text style={{ color: getDifficultyColor(currentQuestion.difficulty) }} className="text-sm font-semibold capitalize">
                  {currentQuestion.difficulty}
                </Text>
              </View>
            </View>

            <View className="mb-5">
              <Text className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">Your Answer:</Text>
              <TextInput
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-base text-gray-800 dark:text-gray-100 min-h-[120px]"
                value={currentAnswer}
                onChangeText={setCurrentAnswer}
                placeholder="Type your answer here..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              className={`rounded-xl items-center py-4 ${currentAnswer.trim() ? 'bg-green-600' : 'bg-green-600 opacity-50'}`}
              onPress={submitAnswer}
              disabled={!currentAnswer.trim()}
            >
              <Text className="text-white text-base font-semibold">
                {currentQuestionIndex < interview.questions.length - 1 ? "Next Question" : "Complete Interview"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Save Transcript Modal */}
      <Modal visible={showSaveTranscriptModal} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-white dark:bg-gray-900">
          <View className="flex-row items-center justify-between px-5 py-4 pt-12 border-b border-gray-200 dark:border-gray-800">
            <Text className="text-xl font-semibold text-gray-800 dark:text-gray-100">Save Transcript</Text>
            <TouchableOpacity onPress={() => setShowSaveTranscriptModal(false)}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 p-5">
            <View className="mb-5">
              <Text className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">Note Title</Text>
              <TextInput
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-base text-gray-800 dark:text-gray-100"
                value={transcriptTitle}
                onChangeText={setTranscriptTitle}
                placeholder="Enter title for the transcript"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View className="flex-1 mb-5">
              <Text className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Transcript Preview:</Text>
              <ScrollView className="max-h-52 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                <Text className="text-xs leading-4 text-gray-700 dark:text-gray-300">{generateTranscript()}</Text>
              </ScrollView>
            </View>

            <TouchableOpacity className="bg-indigo-600 rounded-xl items-center py-4" onPress={saveTranscriptToNotes}>
              <Text className="text-white text-base font-semibold">Save to Notes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "easy":
      return "#4CAF50"
    case "medium":
      return "#FF9800"
    case "hard":
      return "#f44336"
    default:
      return "#666"
  }
}

// Converted to NativeWind classes; removed StyleSheet styles
