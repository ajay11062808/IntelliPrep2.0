import { create } from "zustand"
import type { MockInterview } from "../constants/types"
import { InterviewService } from "../services/interviewService"

interface InterviewState {
  interviews: MockInterview[]
  currentInterview: MockInterview | null
  loading: boolean
  error: string | null

  // Actions
  fetchInterviews: (userId: string) => Promise<void>
  fetchInterview: (id: string) => Promise<void>
  addInterview: (interview: MockInterview) => void
  updateInterview: (interviewId: string, updates: Partial<MockInterview>) => void
  deleteInterview: (interviewId: string) => void
  setCurrentInterview: (interview: MockInterview | null) => void
  clearError: () => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useInterviewStore = create<InterviewState>((set, get) => ({
  interviews: [],
  currentInterview: null,
  loading: false,
  error: null,

  fetchInterviews: async (userId: string) => {
    set({ loading: true, error: null })
    try {
      const interviews = await InterviewService.getInterviews(userId)
      set({ interviews, loading: false })
    } catch (error: any) {
      console.error("Failed to fetch interviews:", error)
      set({ error: error.message || "Failed to load interviews", loading: false })
    }
  },

  fetchInterview: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const interview = await InterviewService.getInterview(id)
      set({ currentInterview: interview, loading: false })
    } catch (error: any) {
      console.error("Failed to fetch interview:", error)
      set({ error: error.message || "Failed to load interview", loading: false })
    }
  },

  addInterview: (interview: MockInterview) => {
    set((state) => ({ interviews: [interview, ...state.interviews] }))
  },

  updateInterview: (interviewId: string, updates: Partial<MockInterview>) => {
    set((state) => ({
      interviews: state.interviews.map((interview) =>
        interview.id === interviewId ? { ...interview, ...updates } : interview,
      ),
      currentInterview:
        state.currentInterview?.id === interviewId ? { ...state.currentInterview, ...updates } : state.currentInterview,
    }))
  },

  deleteInterview: (interviewId: string) => {
    set((state) => ({
      interviews: state.interviews.filter((interview) => interview.id !== interviewId),
      currentInterview: state.currentInterview?.id === interviewId ? null : state.currentInterview,
    }))
  },

  setCurrentInterview: (interview: MockInterview | null) => {
    set({ currentInterview: interview })
  },

  clearError: () => set({ error: null }),
  setLoading: (loading: boolean) => set({ loading }),
  reset: () => set({ interviews: [], currentInterview: null, loading: false, error: null }),
}))
