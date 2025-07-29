import { supabase } from "../config/supabase"
import type { Calculation } from "../constants/types"

export class CalculatorService {
  static evaluateExpression(expression: string): number {
    try {
      // Basic safety check - only allow numbers, operators, parentheses, and decimal points
      if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
        throw new Error("Invalid characters in expression")
      }

      // Use Function constructor for safer evaluation than eval
      return new Function("return " + expression)()
    } catch (error) {
      throw new Error("Invalid expression")
    }
  }

  static calculateSimpleInterest(principal: number, rate: number, time: number): number {
    return (principal * rate * time) / 100
  }

  static calculateCompoundInterest(principal: number, rate: number, time: number, compoundingFrequency = 1): number {
    return principal * Math.pow(1 + rate / (100 * compoundingFrequency), compoundingFrequency * time) - principal
  }

  static async saveCalculation(
    userId: string,
    expression: string,
    result: number,
    type = "basic",
    metadata?: any,
  ): Promise<Calculation> {
    const { data, error } = await supabase
      .from("calculations")
      .insert({
        user_id: userId,
        expression,
        result,
        calculation_type: type,
        metadata,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getCalculationHistory(userId: string): Promise<Calculation[]> {
    const { data, error } = await supabase
      .from("calculations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) throw error
    return data || []
  }
}
