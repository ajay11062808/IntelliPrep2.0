import { supabase } from "../config/supabase"
import type { CalculationData } from "../constants/types"
import { NotesService } from "./notesService"

export interface InterestCalculation {
  name: string
  principal: number
  rate: number
  fromDate: string
  toDate: string
  elapsedDays: number
  interest: number
  totalAmount: number
}

export interface BMICalculation {
  name: string
  height: number // in cm
  weight: number // in kg
  bmi: number
  category: string
  healthStatus: string
}

export class CalculatorService {
  // Basic calculator
  static evaluateExpression(expression: string): number {
    try {
      // Remove any non-mathematical characters for security
      const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, "")
      return Function(`"use strict"; return (${sanitized})`)()
    } catch (error) {
      throw new Error("Invalid expression")
    }
  }

  // Interest calculator
  static calculateInterest(
    principal: number,
    rate: number,
    fromDate: string,
    toDate: string,
  ): Omit<InterestCalculation, "name"> {
    const from = new Date(fromDate)
    const to = new Date(toDate)
    const timeDiff = to.getTime() - from.getTime()
    const elapsedDays = Math.ceil(timeDiff / (1000 * 3600 * 24))

    // Simple interest calculation (annual rate)
    const interest = (principal * rate * elapsedDays) / (365 * 100)
    const totalAmount = principal + interest

    return {
      principal,
      rate,
      fromDate,
      toDate,
      elapsedDays,
      interest: Math.round(interest * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
    }
  }

  // BMI calculator
  static calculateBMI(height: number, weight: number): Omit<BMICalculation, "name"> {
    const heightInMeters = height / 100
    const bmi = weight / (heightInMeters * heightInMeters)

    let category = ""
    let healthStatus = ""

    if (bmi < 18.5) {
      category = "Underweight"
      healthStatus = "Consider consulting a healthcare provider for healthy weight gain strategies."
    } else if (bmi >= 18.5 && bmi < 25) {
      category = "Normal weight"
      healthStatus = "Great! Maintain your current lifestyle with balanced diet and regular exercise."
    } else if (bmi >= 25 && bmi < 30) {
      category = "Overweight"
      healthStatus = "Consider adopting a healthier diet and increasing physical activity."
    } else {
      category = "Obese"
      healthStatus = "Consult with a healthcare provider for a personalized weight management plan."
    }

    return {
      height,
      weight,
      bmi: Math.round(bmi * 100) / 100,
      category,
      healthStatus,
    }
  }

  // Save calculation to database - FIXED to handle metadata properly
  static async saveCalculation(
    userId: string,
    expression: string,
    result: number,
    type: "basic" | "interest" | "bmi",
    metadata?: any,
  ): Promise<string> {
    const { data, error } = await supabase
      .from("calculations")
      .insert({
        user_id: userId,
        expression,
        result,
        calculation_type: type,
        metadata: metadata || null, // Ensure metadata is properly handled
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      throw error
    }
    return data.id
  }

  // Save calculation to notes
  static async saveCalculationToNotes(
    userId: string,
    title: string,
    content: string,
    calculationData: CalculationData,
    calculationId?: string,
  ): Promise<void> {
    const note = await NotesService.createNote(userId, title, content, "calculation", true, false, calculationData)

    // Update calculation with note reference if calculationId provided
    if (calculationId) {
      await supabase.from("calculations").update({ saved_to_note: note.id }).eq("id", calculationId)
    }
  }

  // Get calculation history
  static async getCalculationHistory(userId: string, type?: string): Promise<any[]> {
    let query = supabase
      .from("calculations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (type) {
      query = query.eq("calculation_type", type)
    }

    const { data, error } = await query
    if (error) {
      console.error("Error fetching calculation history:", error)
      throw error
    }
    return data || []
  }
}
