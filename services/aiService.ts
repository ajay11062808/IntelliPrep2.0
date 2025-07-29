import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || "")

export class AIService {
  private static generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  }

  private static isListening = false
  private static currentCallbacks: {
    onResult?: (text: string) => void
    onError?: (error: string) => void
    onPartialResults?: (text: string) => void
    onVolumeChanged?: (volume: number) => void
  } = {}

  // Enhanced Note AI Functions
  static async summarizeText(text: string): Promise<string> {
    try {
      if (!process.env.EXPO_PUBLIC_GEMINI_API_KEY) {
        throw new Error("Gemini API key not configured")
      }

      console.log("Summarizing text with Gemini...")
      const prompt = `Please provide a concise summary of the following text. Keep it under 100 words and focus on the key points:\n\n${text}`

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
      const result = await model.generateContent(prompt)
      const response = await result.response
      const summary = response.text()

      console.log("Summary generated successfully")
      return summary.trim()
    } catch (error) {
      console.error("Summarization error:", error)
      // Fallback to simple extractive summary
      const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
      const summary = sentences.slice(0, 2).join(". ") + "."
      return summary || "Unable to generate summary."
    }
  }

  static async expandText(text: string): Promise<string> {
    try {
      if (!process.env.EXPO_PUBLIC_GEMINI_API_KEY) {
        throw new Error("Gemini API key not configured")
      }

      const prompt = `Please expand on the following text by adding more detail, context, and examples while maintaining the same tone and style:\n\n${text}`

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
      const result = await model.generateContent(prompt)
      const response = await result.response
      const expandedText = response.text()

      return expandedText.trim()
    } catch (error) {
      console.error("Text expansion error:", error)
      throw new Error("Failed to expand text")
    }
  }

  // Enhanced text processing with Gemini
  static async enhanceNote(text: string, type: "grammar" | "expand" | "simplify"): Promise<string> {
    try {
      if (!process.env.EXPO_PUBLIC_GEMINI_API_KEY) {
        throw new Error("Gemini API key not configured")
      }

      let prompt = ""
      switch (type) {
        case "grammar":
          prompt = `Please correct the grammar and spelling in the following text while maintaining its original meaning and tone:\n\n${text}`
          break
        case "expand":
          prompt = `Please expand on the following text by adding more detail and context while keeping the same tone:\n\n${text}`
          break
        case "simplify":
          prompt = `Please simplify the following text to make it clearer and easier to understand:\n\n${text}`
          break
      }

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
      const result = await model.generateContent(prompt)
      const response = await result.response
      return response.text().trim()
    } catch (error) {
      console.error("Text enhancement error:", error)
      throw new Error("Failed to enhance text")
    }
  }

  // Mock Interview AI Functions
  static async generateInterviewQuestions(
    category: string,
    difficulty: string,
    count: number,
  ): Promise<{ questions: any[] }> {
    try {
      if (!process.env.EXPO_PUBLIC_GEMINI_API_KEY) {
        throw new Error("Gemini API key not configured")
      }

      const prompt = `Generate ${count} ${difficulty} level ${category} interview questions. 
      Each question should be realistic, professional, and appropriate for the difficulty level.
      
      Format the response as a JSON array with objects containing:
      - id: unique identifier (use format "q_${Date.now()}_")
      - text: the question text
      - category: "${category}"
      - difficulty: "${difficulty}"
      - expected_duration: estimated time in seconds to answer (60-300 seconds)
      
      Categories and their focus:
      - general: Basic professional questions about experience, goals, strengths
      - technical: Role-specific technical knowledge and problem-solving
      - behavioral: Past experiences, teamwork, conflict resolution
      - leadership: Management, decision-making, team guidance
      - problem-solving: Analytical thinking, creative solutions
      
      Difficulty levels:
      - easy: Entry-level, basic concepts
      - medium: Mid-level, some experience required
      - hard: Senior-level, complex scenarios
      
      Return only the JSON array, no additional text.`

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
      const result = await model.generateContent(prompt)
      const response = await result.response
      const questionsText = response.text()

      // Parse the JSON response
      let questions
      try {
        // Clean the response to extract JSON
        const cleanedText = questionsText.replace(/```json\n?|\n?```/g, "").trim()
        questions = JSON.parse(cleanedText)
      } catch (parseError) {
        console.warn("Failed to parse JSON, creating fallback questions")
        // Create fallback questions
        questions = []
        const lines = questionsText.split("\n").filter((line) => line.trim())
        for (let i = 0; i < Math.min(count, lines.length); i++) {
          questions.push({
            id: `q_${Date.now()}_${i}`,
            text: lines[i].replace(/^\d+\.\s*/, "").replace(/^[-*]\s*/, ""),
            category,
            difficulty,
            expected_duration: difficulty === "easy" ? 90 : difficulty === "medium" ? 150 : 240,
          })
        }
      }

      return { questions: questions.slice(0, count) }
    } catch (error) {
      console.error("Question generation error:", error)
      // Return fallback questions
      const fallbackQuestions = this.getFallbackQuestions(category, difficulty, count)
      return { questions: fallbackQuestions }
    }
  }

  static async evaluateInterviewResponse(
    question: string,
    answer: string,
  ): Promise<{ score: number; feedback: string }> {
    try {
      if (!process.env.EXPO_PUBLIC_GEMINI_API_KEY) {
        throw new Error("Gemini API key not configured")
      }

      const prompt = `Evaluate this interview response on a scale of 1-10 and provide constructive feedback.

Question: ${question}

Answer: ${answer}

Please evaluate based on:
- Relevance to the question
- Clarity and structure
- Specific examples or details
- Professional communication
- Completeness of the response

Provide your response in JSON format with:
{
  "score": number (1-10),
  "feedback": "detailed constructive feedback explaining the score and suggestions for improvement"
}

Be encouraging but honest in your evaluation. Return only the JSON, no additional text.`

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
      const result = await model.generateContent(prompt)
      const response = await result.response
      const evaluationText = response.text()

      // Parse the JSON response
      let evaluation
      try {
        const cleanedText = evaluationText.replace(/```json\n?|\n?```/g, "").trim()
        evaluation = JSON.parse(cleanedText)
      } catch (parseError) {
        console.warn("Failed to parse evaluation JSON, using fallback")
        evaluation = {
          score: 7,
          feedback:
            "Your response addresses the question and shows good understanding. Consider adding more specific examples to strengthen your answer.",
        }
      }

      // Ensure score is within valid range
      evaluation.score = Math.max(1, Math.min(10, evaluation.score))

      return evaluation
    } catch (error) {
      console.error("Response evaluation error:", error)
      return {
        score: 6,
        feedback: "Unable to evaluate response automatically. Your answer shows effort and understanding.",
      }
    }
  }

//   // Speech Recognition Functions
//   static async checkPermissions(): Promise<boolean> {
//     if (Platform.OS === "android") {
//       try {
//         const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
//           title: "Microphone Permission",
//           message: "This app needs access to microphone for speech recognition.",
//           buttonNeutral: "Ask Me Later",
//           buttonNegative: "Cancel",
//           buttonPositive: "OK",
//         })
//         return granted === PermissionsAndroid.RESULTS.GRANTED
//       } catch (err) {
//         console.warn("Permission request error:", err)
//         return false
//       }
//     }
//     return true // iOS permissions are handled via Info.plist
//   }

//   static async isAvailable(): Promise<boolean> {
//     try {
//       const hasPermission = await this.checkPermissions()
//       if (!hasPermission) {
//         console.log("Microphone permission not granted")
//         return false
//       }

//       const available = await Voice.isAvailable()
//       console.log("Speech recognition available:", available)
//       return !!available
//     } catch (error) {
//       console.error("Speech recognition availability check failed:", error)
//       return false
//     }
//   }

//   private static initializeVoiceListeners() {
//     Voice.removeAllListeners()

//     Voice.onSpeechStart = (event: any) => {
//       console.log("Speech recognition started")
//       this.isListening = true
//     }

//     Voice.onSpeechPartialResults = (event: any) => {
//       console.log("Partial results:", event.value)
//       if (event.value && event.value.length > 0 && this.currentCallbacks.onPartialResults) {
//         this.currentCallbacks.onPartialResults(event.value[0])
//       }
//     }

//     Voice.onSpeechResults = (event: any) => {
//       console.log("Final results:", event.value)
//       this.isListening = false
//       if (event.value && event.value.length > 0 && this.currentCallbacks.onResult) {
//         this.currentCallbacks.onResult(event.value[0])
//       }
//     }

//     Voice.onSpeechError = (event: any) => {
//       console.error("Speech recognition error:", event.error)
//       this.isListening = false
//       const errorMessage = this.getErrorMessage(event.error)
//       if (this.currentCallbacks.onError) {
//         this.currentCallbacks.onError(errorMessage)
//       }
//     }

//     Voice.onSpeechEnd = (event: any) => {
//       console.log("Speech recognition ended")
//       this.isListening = false
//     }

//     Voice.onSpeechVolumeChanged = (event: any) => {
//       if (this.currentCallbacks.onVolumeChanged) {
//         this.currentCallbacks.onVolumeChanged(event.value)
//       }
//     }
//   }

//   static async startListening(
//     onResult: (text: string) => void,
//     onError: (error: string) => void,
//     onPartialResults?: (text: string) => void,
//     onVolumeChanged?: (volume: number) => void,
//   ): Promise<void> {
//     try {
//       const available = await this.isAvailable()
//       if (!available) {
//         onError("Speech recognition not available on this device")
//         return
//       }

//       if (this.isListening) {
//         await this.stopListening()
//       }

//       this.currentCallbacks = {
//         onResult,
//         onError,
//         onPartialResults,
//         onVolumeChanged,
//       }

//       this.initializeVoiceListeners()

//       await Voice.start("en-US", {
//         EXTRA_LANGUAGE_MODEL: "LANGUAGE_MODEL_FREE_FORM",
//         EXTRA_CALLING_PACKAGE: "com.intelliprep.app",
//         EXTRA_PARTIAL_RESULTS: true,
//         REQUEST_PERMISSIONS_AUTO: true,
//       })

//       console.log("Speech recognition started successfully")
//     } catch (error) {
//       console.error("Failed to start speech recognition:", error)
//       this.isListening = false
//       onError("Failed to start speech recognition. Please try again.")
//     }
//   }

//   static async stopListening(): Promise<void> {
//     try {
//       if (this.isListening) {
//         console.log("Stopping speech recognition")
//         await Voice.stop()
//         this.isListening = false
//       }
//     } catch (error) {
//       console.error("Error stopping speech recognition:", error)
//     }
//   }

//   static async cancelListening(): Promise<void> {
//     try {
//       if (this.isListening) {
//         console.log("Cancelling speech recognition")
//         await Voice.cancel()
//         this.isListening = false
//       }
//     } catch (error) {
//       console.error("Error cancelling speech recognition:", error)
//     }
//   }

//   static async destroyRecognizer(): Promise<void> {
//     try {
//       await Voice.destroy()
//       Voice.removeAllListeners()
//       this.isListening = false
//       this.currentCallbacks = {}
//     } catch (error) {
//       console.error("Error destroying speech recognizer:", error)
//     }
//   }

//   static isCurrentlyListening(): boolean {
//     return this.isListening
//   }

//   private static getErrorMessage(error: any): string {
//     if (!error) return "Unknown speech recognition error"
//     const errorCode = error.code || error.message || error

//     switch (errorCode) {
//       case "1":
//       case "network":
//         return "Network error. Speech recognition works offline, please try again."
//       case "2":
//       case "audio":
//         return "Audio recording error. Please check microphone permissions."
//       case "3":
//       case "permission":
//         return "Microphone permission denied. Please allow microphone access."
//       case "4":
//       case "busy":
//         return "Speech recognition service is busy. Please try again."
//       case "5":
//       case "no_match":
//         return "No speech was detected. Please speak clearly and try again."
//       case "6":
//       case "recognizer_busy":
//         return "Speech recognizer is busy. Please try again."
//       case "7":
//       case "insufficient_permissions":
//         return "Insufficient permissions for speech recognition."
//       case "8":
//       case "speech_timeout":
//         return "No speech input detected. Please try again."
//       case "9":
//       case "not_available":
//         return "Speech recognition not available on this device."
//       default:
//         return `Speech recognition error: ${errorCode}`
//     }
//   }

  // Fallback questions for when AI generation fails
  private static getFallbackQuestions(category: string, difficulty: string, count: number): any[] {
    const fallbackQuestions: { [key: string]: { [key: string]: string[] } } = {
      general: {
        easy: [
          "Tell me about yourself and your background.",
          "Why are you interested in this position?",
          "What are your greatest strengths?",
          "Where do you see yourself in 5 years?",
          "Why do you want to work for our company?",
        ],
        medium: [
          "Describe a challenging project you worked on recently.",
          "How do you handle stress and pressure?",
          "What motivates you in your work?",
          "Describe your ideal work environment.",
          "How do you stay updated with industry trends?",
        ],
        hard: [
          "How would you handle a situation where you disagree with your manager?",
          "Describe a time when you had to make a difficult decision with limited information.",
          "How do you balance competing priorities and deadlines?",
          "What would you do if you discovered a major flaw in a project just before launch?",
          "How do you handle failure and what have you learned from past failures?",
        ],
      },
      technical: {
        easy: [
          "What programming languages are you most comfortable with?",
          "Explain the difference between a class and an object.",
          "What is version control and why is it important?",
          "Describe the basic structure of a database.",
          "What is the difference between frontend and backend development?",
        ],
        medium: [
          "Explain the concept of Big O notation and its importance.",
          "How would you optimize a slow database query?",
          "Describe the difference between REST and GraphQL APIs.",
          "What are design patterns and can you give an example?",
          "How do you ensure code quality in your projects?",
        ],
        hard: [
          "Design a system to handle millions of concurrent users.",
          "How would you implement a distributed caching system?",
          "Explain microservices architecture and its trade-offs.",
          "How would you debug a memory leak in a production application?",
          "Design a real-time chat system with message persistence.",
        ],
      },
      behavioral: {
        easy: [
          "Tell me about a time you worked well in a team.",
          "Describe a situation where you helped a colleague.",
          "How do you handle constructive criticism?",
          "Tell me about a goal you set and achieved.",
          "Describe a time when you learned something new quickly.",
        ],
        medium: [
          "Tell me about a time you had to deal with a difficult team member.",
          "Describe a situation where you had to adapt to significant changes.",
          "How do you handle competing deadlines?",
          "Tell me about a time you made a mistake and how you handled it.",
          "Describe a situation where you had to persuade someone to see your point of view.",
        ],
        hard: [
          "Tell me about a time you had to make an unpopular decision.",
          "Describe a situation where you had to manage conflict within your team.",
          "How did you handle a situation where you had insufficient resources to complete a project?",
          "Tell me about a time you had to deliver bad news to stakeholders.",
          "Describe a situation where you had to challenge the status quo.",
        ],
      },
    }

    const categoryQuestions = fallbackQuestions[category] || fallbackQuestions.general
    const difficultyQuestions = categoryQuestions[difficulty] || categoryQuestions.easy

    return difficultyQuestions.slice(0, count).map((text, index) => ({
      id: `fallback_${Date.now()}_${index}`,
      text,
      category,
      difficulty,
      expected_duration: difficulty === "easy" ? 90 : difficulty === "medium" ? 150 : 240,
    }))
  }
}
