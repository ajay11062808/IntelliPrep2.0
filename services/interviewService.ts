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
  ): Promise<MockInterview> {
    // Generate questions using direct AI call
    const questionsData = await AIService.generateInterviewQuestions(category, difficulty, questionCount)

    const { data, error } = await supabase
      .from("mock_interviews")
      .insert({
        user_id: userId,
        title,
        questions: questionsData.questions,
        status: "pending",
      })
      .select()
      .single()

    if (error) throw error
    return data
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
    const evaluation = await AIService.evaluateInterviewResponse(questionText, answer)

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
