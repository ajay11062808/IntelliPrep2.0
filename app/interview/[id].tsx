"use client"

import { Ionicons } from "@expo/vector-icons"
import { router, useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
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
      Alert.alert("Interview Complete!", `Your score: ${completedInterview.score}/10`)
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

      await NotesService.createNote(user.id, transcriptTitle.trim(), transcript, "interview", false, true, undefined, {
        interview_id: interview.id,
        duration: interview.duration || 0,
        questions_count: interview.questions.length,
        score: interview.score,
        feedback: interview.feedback,
      })

      Alert.alert("Success", "Interview transcript saved to notes!")
      setShowSaveTranscriptModal(false)
      setTranscriptTitle("")
    } catch (error: any) {
      Alert.alert("Error", "Failed to save transcript to notes")
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    )
  }

  if (!interview) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Interview not found</Text>
      </View>
    )
  }

  const currentQuestion = interview.questions[currentQuestionIndex]
  const isCompleted = interview.status === "completed"

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{interview.title}</Text>
        {isCompleted && (
          <TouchableOpacity onPress={() => setShowSaveTranscriptModal(true)}>
            <Ionicons name="save" size={24} color="#2196F3" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {!interviewStarted ? (
          <View style={styles.startContainer}>
            <Ionicons name="mic" size={80} color="#2196F3" />
            <Text style={styles.startTitle}>Ready to Start?</Text>
            <Text style={styles.startSubtitle}>
              This interview contains {interview.questions.length} questions. Take your time and answer thoughtfully.
            </Text>
            <TouchableOpacity style={styles.startButton} onPress={startInterview}>
              <Text style={styles.startButtonText}>Start Interview</Text>
            </TouchableOpacity>
          </View>
        ) : isCompleted ? (
          <View style={styles.completedContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
            <Text style={styles.completedTitle}>Interview Complete!</Text>
            <Text style={styles.scoreText}>Your Score: {interview.score}/10</Text>

            {interview.feedback && (
              <View style={styles.feedbackContainer}>
                <Text style={styles.feedbackTitle}>Overall Feedback:</Text>
                <Text style={styles.feedbackText}>{interview.feedback}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.saveTranscriptButton} onPress={() => setShowSaveTranscriptModal(true)}>
              <Ionicons name="document-text" size={20} color="white" />
              <Text style={styles.saveTranscriptButtonText}>Save Transcript to Notes</Text>
            </TouchableOpacity>

            <View style={styles.responsesContainer}>
              <Text style={styles.responsesTitle}>Your Responses:</Text>
              {responses.map((response, index) => (
                <View key={index} style={styles.responseItem}>
                  <Text style={styles.responseQuestion}>
                    Q{index + 1}: {response.question_text}
                  </Text>
                  <Text style={styles.responseAnswer}>{response.answer}</Text>
                  <View style={styles.responseFooter}>
                    <Text
                      style={[
                        styles.responseScore,
                        { color: response.score && response.score >= 7 ? "#4CAF50" : "#FF9800" },
                      ]}
                    >
                      Score: {response.score}/10
                    </Text>
                    <Text style={styles.responseDuration}>{response.duration}s</Text>
                  </View>
                  {response.feedback && <Text style={styles.responseFeedback}>{response.feedback}</Text>}
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.questionContainer}>
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                Question {currentQuestionIndex + 1} of {interview.questions.length}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${((currentQuestionIndex + 1) / interview.questions.length) * 100}%` },
                  ]}
                />
              </View>
            </View>

            <View style={styles.questionCard}>
              <Text style={styles.questionText}>{currentQuestion.text}</Text>
              <View style={styles.questionMeta}>
                <Text style={styles.questionCategory}>{currentQuestion.category}</Text>
                <Text style={[styles.questionDifficulty, { color: getDifficultyColor(currentQuestion.difficulty) }]}>
                  {currentQuestion.difficulty}
                </Text>
              </View>
            </View>

            <View style={styles.answerContainer}>
              <Text style={styles.answerLabel}>Your Answer:</Text>
              <TextInput
                style={styles.answerInput}
                value={currentAnswer}
                onChangeText={setCurrentAnswer}
                placeholder="Type your answer here..."
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, !currentAnswer.trim() && styles.submitButtonDisabled]}
              onPress={submitAnswer}
              disabled={!currentAnswer.trim()}
            >
              <Text style={styles.submitButtonText}>
                {currentQuestionIndex < interview.questions.length - 1 ? "Next Question" : "Complete Interview"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Save Transcript Modal */}
      <Modal visible={showSaveTranscriptModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Save Transcript</Text>
            <TouchableOpacity onPress={() => setShowSaveTranscriptModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.saveForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Note Title</Text>
              <TextInput
                style={styles.input}
                value={transcriptTitle}
                onChangeText={setTranscriptTitle}
                placeholder="Enter title for the transcript"
              />
            </View>

            <View style={styles.transcriptPreview}>
              <Text style={styles.transcriptPreviewLabel}>Transcript Preview:</Text>
              <ScrollView style={styles.transcriptPreviewContent}>
                <Text style={styles.transcriptPreviewText}>{generateTranscript()}</Text>
              </ScrollView>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={saveTranscriptToNotes}>
              <Text style={styles.saveButtonText}>Save to Notes</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    textAlign: "center",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  startContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  startTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 8,
  },
  startSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
  },
  startButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  startButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  completedContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 16,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#4CAF50",
    marginBottom: 20,
  },
  feedbackContainer: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    alignSelf: "stretch",
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  saveTranscriptButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2196F3",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  saveTranscriptButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  responsesContainer: {
    alignSelf: "stretch",
  },
  responsesTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  responseItem: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  responseQuestion: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  responseAnswer: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    lineHeight: 20,
  },
  responseFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  responseScore: {
    fontSize: 14,
    fontWeight: "600",
  },
  responseDuration: {
    fontSize: 12,
    color: "#999",
  },
  responseFeedback: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  questionContainer: {
    flex: 1,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
    textAlign: "center",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#2196F3",
    borderRadius: 2,
  },
  questionCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  questionText: {
    fontSize: 18,
    color: "#333",
    lineHeight: 26,
    marginBottom: 12,
  },
  questionMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  questionCategory: {
    fontSize: 14,
    color: "#2196F3",
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  questionDifficulty: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  answerContainer: {
    marginBottom: 20,
  },
  answerLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  answerInput: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  submitButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  saveForm: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f9f9f9",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  transcriptPreview: {
    flex: 1,
    marginBottom: 20,
  },
  transcriptPreviewLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  transcriptPreviewContent: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  transcriptPreviewText: {
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
  },
  saveButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
})
