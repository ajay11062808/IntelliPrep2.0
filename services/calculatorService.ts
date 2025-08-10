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
  breakdown?: {
    years: number
    months: number
    days: number
    interestDays: number
    interestMonths: number
    interestYears: number
  }
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

  // Interest calculator (advanced): uses years/months/days breakdown
  static calculateInterest(
    principal: number,
    ratePerMonthPercent: number,
    fromDate: string,
    toDate: string,
  ): Omit<InterestCalculation, "name"> {
    const from = new Date(fromDate)
    const to = new Date(toDate)

    const { years, months, days } = CalculatorService.calculateElapsedTime(from, to)
    const dailyRate = ratePerMonthPercent / 30 // percent per day
    const monthlyRate = ratePerMonthPercent // percent per month
    const yearlyRate = ratePerMonthPercent * 12 // percent per year

    const interestDays = principal * (dailyRate / 100) * days
    const interestMonths = principal * (monthlyRate / 100) * months
    const interestYears = principal * (yearlyRate / 100) * years

    const interest = interestDays + interestMonths + interestYears
    const totalAmount = principal + interest
    const elapsedDays = years * 365 + months * 30 + days

    return {
      principal,
      rate: ratePerMonthPercent,
      fromDate,
      toDate,
      elapsedDays,
      interest: Math.round(interest * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      breakdown: {
        years,
        months,
        days,
        interestDays: Math.round(interestDays * 100) / 100,
        interestMonths: Math.round(interestMonths * 100) / 100,
        interestYears: Math.round(interestYears * 100) / 100,
      },
    }
  }

  static calculateElapsedTime(startDate: Date, endDate: Date): { years: number; months: number; days: number } {
    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()

    let years = endDate.getFullYear() - startDate.getFullYear()
    let months = endDate.getMonth() - startDate.getMonth()
    let days = endDate.getDate() - startDate.getDate()

    if (days < 0) {
      months -= 1
      const prevMonthDays = daysInMonth(endDate.getFullYear(), endDate.getMonth() - 1)
      days += prevMonthDays
    }

    if (months < 0) {
      years -= 1
      months += 12
    }

    return { years, months, days }
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
  static async getCalculationHistory(userId: string, type?: string, limit: number = 25): Promise<any[]> {
    let query = supabase
      .from("calculations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)

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
