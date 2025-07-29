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
  category: string
  is_calculation: boolean
  is_interview_transcript: boolean
  calculation_data?: CalculationData
  interview_data?: InterviewData
  ai_summary?: string
  ai_expanded?: string
  created_at: string
  updated_at: string
}

export interface CalculationData {
  expression: string
  result: number
  type: "basic" | "interest" | "compound"
  metadata?: any
}

export interface InterviewData {
  interview_id: string
  duration: number
  questions_count: number
  score?: number
  feedback?: string
}

export interface Calculation {
  id: string
  user_id: string
  expression: string
  result: number
  calculation_type: string
  metadata?: any
  saved_to_note?: string
  created_at: string
}

export interface MockInterview {
  id: string
  user_id: string
  title: string
  questions: Question[]
  responses?: InterviewResponse[]
  transcript?: string
  score?: number
  feedback?: string
  duration?: number
  status: "pending" | "in_progress" | "completed"
  created_at: string
  completed_at?: string
}

export interface Question {
  id: string
  text: string
  category: string
  difficulty: "easy" | "medium" | "hard"
  expected_duration: number
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

export interface AuthError {
  message: string
  status?: number
}

