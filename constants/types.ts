export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
}

export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  markdown_content?: string
  category: string
  is_calculation: boolean
  is_interview_transcript: boolean
  is_voice_transcription: boolean
  calculation_data?: CalculationData
  interview_data?: InterviewData
  voice_data?: VoiceData
  tags?: string[]
  color_theme?: string
  ai_summary?: string
  ai_expanded?: string
  created_at: string
  updated_at: string
}

export interface VoiceData {
  audio_url?: string
  duration?: number
  transcription?: string
  confidence?: number
  language?: string
  timestamp: string
}

export interface CalculationData {
  type: "basic" | "interest" | "bmi"
  expression: string
  result: number
  timestamp: string
  metadata?: {
    // For interest calculations
    name?: string
    principal?: number
    rate?: number
    fromDate?: string
    toDate?: string
    elapsedDays?: number
    interest?: number

    // For BMI calculations
    height?: number
    weight?: number
    category?: string
    healthStatus?: string
  }
}

export interface InterviewData {
  questions: InterviewQuestion[]
  responses: InterviewResponse[]
  score?: number
  feedback?: string
  duration?: number
}

export interface InterviewQuestion {
  id: string
  question: string
  category: string
  difficulty: string
}

export interface InterviewResponse {
  question_id: string
  question_text: string
  answer: string
  duration: number
  score?: number
  feedback?: string
  timestamp: string
}

export interface MockInterview {
  id: string
  user_id: string
  title: string
  questions: InterviewQuestion[]
  responses?: InterviewResponse[]
  transcript?: string
  score?: number
  feedback?: string
  duration?: number
  status: "pending" | "in_progress" | "completed"
  created_at: string
  completed_at?: string
}

export interface Calculation {
  id: string
  user_id: string
  expression: string
  result: number
  calculation_type: "basic" | "interest" | "bmi"
  metadata?: any
  saved_to_note?: string
  created_at: string
}
