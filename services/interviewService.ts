import { supabase } from "../config/supabase"
import type { InterviewResponse, MockInterview } from "../constants/types"
import { AIService } from "./aiService"

export class InterviewService {
  static async createInterview(
    userId: string,
    title: string,
    category: string,
    difficulty: string,
    questionCount: number,
    resumeContextText?: string,
  ): Promise<MockInterview> {
    // Enforce daily interview creation limit for free users (1 per day)
    try {
      const { data: profile } = await supabase.from("profiles").select("is_premium").eq("id", userId).single()
      const isPremium = !!profile?.is_premium
      if (!isPremium) {
        const start = new Date()
        start.setHours(0, 0, 0, 0)
        const end = new Date(start)
        end.setDate(end.getDate() + 1)
        const { count } = await supabase
          .from("mock_interviews")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", start.toISOString())
          .lt("created_at", end.toISOString())
        if ((count || 0) >= 1) {
          const error: any = new Error("INTERVIEW_DAILY_LIMIT")
          error.code = "INTERVIEW_DAILY_LIMIT"
          throw error
        }
      }
    } catch (limitErr) {
      // Re-throw to be handled by caller
      throw limitErr
    }
    // Create interview row first to get a stable ID for usage scoping
    const { data: created, error: createErr } = await supabase
      .from("mock_interviews")
      .insert({ user_id: userId, title, questions: [], status: "pending" })
      .select()
      .single()
    if (createErr || !created) throw createErr

    // Generate questions using direct AI call with optional resume context, scoped to this interview id
    const questionsData = await AIService.generateInterviewQuestions(
      category,
      difficulty,
      questionCount,
      resumeContextText,
      `interview_${created.id}`,
    )

    // Update interview with generated questions
    const { data: updated, error: updErr } = await supabase
      .from("mock_interviews")
      .update({ questions: questionsData.questions })
      .eq("id", created.id)
      .select()
      .single()
    if (updErr) throw updErr
    return updated
  }

  static async getInterview(id: string): Promise<MockInterview | null> {
    const { data, error } = await supabase.from("mock_interviews").select("*").eq("id", id).single()

    if (error) throw error
    return data
  }

  static async getInterviews(userId: string): Promise<MockInterview[]> {
    const { data, error } = await supabase
      .from("mock_interviews")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data || []
  }

  static async startInterview(interviewId: string): Promise<void> {
    const { error } = await supabase.from("mock_interviews").update({ status: "in_progress" }).eq("id", interviewId)

    if (error) throw error
  }

  static async submitResponse(
    interviewId: string,
    questionId: string,
    questionText: string,
    answer: string,
    duration: number,
  ): Promise<{ score: number; feedback: string }> {
    // Evaluate response using direct AI call
    const evaluation = await AIService.evaluateInterviewResponse(questionText, answer, `interview_${interviewId}`)

    // Get current interview
    const interview = await this.getInterview(interviewId)
    if (!interview) throw new Error("Interview not found")

    const newResponse: InterviewResponse = {
      question_id: questionId,
      question_text: questionText,
      answer,
      duration,
      score: evaluation.score,
      feedback: evaluation.feedback,
      timestamp: new Date().toISOString(),
    }

    const updatedResponses = [...(interview.responses || []), newResponse]

    const { error } = await supabase
      .from("mock_interviews")
      .update({ responses: updatedResponses })
      .eq("id", interviewId)

    if (error) throw error

    return {
      score: evaluation.score,
      feedback: evaluation.feedback,
    }
  }

  static async completeInterview(
    interviewId: string,
    transcript: string,
    totalDuration: number,
  ): Promise<MockInterview> {
    const interview = await this.getInterview(interviewId)
    if (!interview) throw new Error("Interview not found")

    // Calculate overall score
    const responses = interview.responses || []
    const averageScore =
      responses.length > 0 ? responses.reduce((sum, r) => sum + (r.score || 0), 0) / responses.length : 0

    // Generate overall feedback
    const overallFeedback = this.generateOverallFeedback(responses, averageScore)

    const { data, error } = await supabase
      .from("mock_interviews")
      .update({
        status: "completed",
        transcript,
        duration: totalDuration,
        score: Math.round(averageScore),
        feedback: overallFeedback,
        completed_at: new Date().toISOString(),
      })
      .eq("id", interviewId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  private static generateOverallFeedback(responses: InterviewResponse[], averageScore: number): string {
    const totalResponses = responses.length
    const strongResponses = responses.filter((r) => (r.score || 0) >= 8).length
    const weakResponses = responses.filter((r) => (r.score || 0) < 6).length

    let feedback = `Overall Performance: ${averageScore >= 8 ? "Excellent" : averageScore >= 6 ? "Good" : "Needs Improvement"}\n\n`

    feedback += `You answered ${totalResponses} questions with an average score of ${averageScore.toFixed(1)}/10.\n\n`

    if (strongResponses > 0) {
      feedback += `Strengths: You provided ${strongResponses} strong responses showing good understanding and communication skills.\n\n`
    }

    if (weakResponses > 0) {
      feedback += `Areas for Improvement: ${weakResponses} responses could be enhanced with more specific examples and clearer explanations.\n\n`
    }

    feedback += "Keep practicing to improve your interview skills!"

    return feedback
  }

  static async deleteInterview(id: string): Promise<void> {
    const { error } = await supabase.from("mock_interviews").delete().eq("id", id)

    if (error) throw error
  }
}
