import { create } from "zustand"
import type { CalculationData, InterviewData, Note, VoiceData } from "../constants/types"
import { NotesService } from "../services/notesService"

interface NotesState {
  notes: Note[]
  currentNote: Note | null
  loading: boolean
  saving: boolean
  error: string | null

  // Actions
  fetchNotes: (userId: string) => Promise<void>
  fetchNote: (noteId: string) => Promise<Note | null>
  createNote: (
    userId: string,
    title: string,
    content: string,
    category?: string,
    isCalculation?: boolean,
    isInterviewTranscript?: boolean,
    calculationData?: CalculationData,
    interviewData?: InterviewData,
    markdownContent?: string,
    tags?: string[],
    colorTheme?: string,
    voiceData?: VoiceData,
  ) => Promise<Note>
  updateNote: (noteId: string, updates: Partial<Note>) => Promise<void>
  deleteNote: (noteId: string) => Promise<void>
  enhanceNote: (noteId: string, action: "summarize" | "expand", content: string) => Promise<void>
  setCurrentNote: (note: Note | null) => void
  clearError: () => void
  reset: () => void
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  currentNote: null,
  loading: false,
  saving: false,
  error: null,

  fetchNotes: async (userId: string) => {
    set({ loading: true, error: null })
    try {
      const notes = await NotesService.getNotes(userId)
      set({ notes, loading: false })
    } catch (error: any) {
      console.error("Failed to fetch notes:", error)
      set({ error: error.message || "Failed to load notes", loading: false })
    }
  },

  fetchNote: async (noteId: string) => {
    set({ loading: true, error: null })
    try {
      const note = await NotesService.getNote(noteId)
      set({ currentNote: note, loading: false })
      return note
    } catch (error: any) {
      console.error("Failed to fetch note:", error)
      set({ error: error.message || "Failed to load note", loading: false })
      return null
    }
  },

  createNote: async (
    userId: string,
    title: string,
    content: string,
    category = "general",
    isCalculation = false,
    isInterviewTranscript = false,
    calculationData?: CalculationData,
    interviewData?: InterviewData,
    markdownContent?: string,
    tags?: string[],
    colorTheme?: string,
    voiceData?: VoiceData,
  ) => {
    set({ saving: true, error: null })
    try {
      const newNote = await NotesService.createNote(
        userId,
        title,
        content,
        category,
        isCalculation,
        isInterviewTranscript,
        calculationData,
        interviewData,
        markdownContent,
        tags,
        colorTheme,
        voiceData,
      )

      set((state) => ({
        notes: [newNote, ...state.notes],
        currentNote: newNote,
        saving: false,
      }))

      return newNote
    } catch (error: any) {
      console.error("Failed to create note:", error)
      set({ error: error.message || "Failed to create note", saving: false })
      throw error
    }
  },

  updateNote: async (noteId: string, updates: Partial<Note>) => {
    set({ saving: true, error: null })
    try {
      const updatedNote = await NotesService.updateNote(noteId, updates)

      set((state) => ({
        notes: state.notes.map((note) => (note.id === noteId ? updatedNote : note)),
        currentNote: state.currentNote?.id === noteId ? updatedNote : state.currentNote,
        saving: false,
      }))
    } catch (error: any) {
      console.error("Failed to update note:", error)
      set({ error: error.message || "Failed to update note", saving: false })
      throw error
    }
  },

  deleteNote: async (noteId: string) => {
    set({ loading: true, error: null })
    try {
      await NotesService.deleteNote(noteId)

      set((state) => ({
        notes: state.notes.filter((note) => note.id !== noteId),
        currentNote: state.currentNote?.id === noteId ? null : state.currentNote,
        loading: false,
      }))
    } catch (error: any) {
      console.error("Failed to delete note:", error)
      set({ error: error.message || "Failed to delete note", loading: false })
      throw error
    }
  },

  enhanceNote: async (noteId: string, action: "summarize" | "expand", content: string) => {
    set({ loading: true, error: null })
    try {
      const result = await NotesService.enhanceNote(noteId, action, content)

      if (result.success) {
        // Refresh the current note to get the AI enhancement
        const updatedNote = await NotesService.getNote(noteId)
        if (updatedNote) {
          set((state) => ({
            notes: state.notes.map((note) => (note.id === noteId ? updatedNote : note)),
            currentNote: state.currentNote?.id === noteId ? updatedNote : state.currentNote,
            loading: false,
          }))
        }
      }
    } catch (error: any) {
      console.error("Failed to enhance note:", error)
      set({ error: error.message || "Failed to enhance note", loading: false })
      throw error
    }
  },

  setCurrentNote: (note: Note | null) => {
    set({ currentNote: note })
  },

  clearError: () => set({ error: null }),

  reset: () => set({ notes: [], currentNote: null, loading: false, saving: false, error: null }),
}))
