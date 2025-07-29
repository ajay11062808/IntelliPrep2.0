import { create } from "zustand"
import type { Calculation } from "../constants/types"
import { CalculatorService } from "../services/calculatorService"

interface CalculatorState {
  history: Calculation[]
  currentExpression: string
  currentResult: number | null
  loading: boolean
  error: string | null

  // Actions
  fetchHistory: (userId: string) => Promise<void>
  addCalculation: (calculation: Calculation) => void
  setCurrentExpression: (expression: string) => void
  setCurrentResult: (result: number | null) => void
  clearError: () => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useCalculatorStore = create<CalculatorState>((set, get) => ({
  history: [],
  currentExpression: "",
  currentResult: null,
  loading: false,
  error: null,

  fetchHistory: async (userId: string) => {
    set({ loading: true, error: null })
    try {
      const history = await CalculatorService.getCalculationHistory(userId)
      set({ history, loading: false })
    } catch (error: any) {
      console.error("Failed to fetch calculator history:", error)
      set({ error: error.message || "Failed to load calculator history", loading: false })
    }
  },

  addCalculation: (calculation: Calculation) => {
    set((state) => ({ history: [calculation, ...state.history] }))
  },

  setCurrentExpression: (expression: string) => set({ currentExpression: expression }),
  setCurrentResult: (result: number | null) => set({ currentResult: result }),
  clearError: () => set({ error: null }),
  setLoading: (loading: boolean) => set({ loading }),
  reset: () => set({ history: [], currentExpression: "", currentResult: null, loading: false, error: null }),
}))
