import { supabase } from "../config/supabase"
import type { CalculationData, InterviewData, Note } from "../constants/types"
import { AIService } from "./aiService"

export class NotesService {
  static async getNotes(userId: string): Promise<Note[]> {
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Supabase error fetching notes:", error)
        throw new Error(`Failed to fetch notes: ${error.message}`)
      }

      return data || []
    } catch (error: any) {
      console.error("Error in getNotes:", error)
      throw error
    }
  }

  static async getNote(id: string): Promise<Note | null> {
    try {
      const { data, error } = await supabase.from("notes").select("*").eq("id", id).single()

      if (error) {
        if (error.code === "PGRST116") {
          // No rows returned
          return null
        }
        console.error("Supabase error fetching note:", error)
        throw new Error(`Failed to fetch note: ${error.message}`)
      }

      return data
    } catch (error: any) {
      console.error("Error in getNote:", error)
      throw error
    }
  }

  static async createNote(
    userId: string,
    title: string,
    content: string,
    category = "general",
    isCalculation = false,
    isInterviewTranscript = false,
    calculationData?: CalculationData,
    interviewData?: InterviewData,
  ): Promise<Note> {
    try {
      if (!userId || !title.trim()) {
        throw new Error("User ID and title are required")
      }

      const noteData = {
        user_id: userId,
        title: title.trim(),
        content: content.trim(),
        category,
        is_calculation: isCalculation,
        is_interview_transcript: isInterviewTranscript,
        calculation_data: calculationData || null,
        interview_data: interviewData || null,
      }

      const { data, error } = await supabase.from("notes").insert(noteData).select().single()

      if (error) {
        console.error("Supabase error creating note:", error)
        throw new Error(`Failed to create note: ${error.message}`)
      }

      return data
    } catch (error: any) {
      console.error("Error in createNote:", error)
      throw error
    }
  }

  static async updateNote(id: string, updates: Partial<Note>): Promise<Note> {
    try {
      if (!id) {
        throw new Error("Note ID is required")
      }

      // Remove read-only fields
      const { id: _, user_id, created_at, ...updateData } = updates

      const { data, error } = await supabase
        .from("notes")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single()

      if (error) {
        console.error("Supabase error updating note:", error)
        throw new Error(`Failed to update note: ${error.message}`)
      }

      return data
    } catch (error: any) {
      console.error("Error in updateNote:", error)
      throw error
    }
  }

  static async deleteNote(id: string): Promise<void> {
    try {
      if (!id) {
        throw new Error("Note ID is required")
      }

      const { error } = await supabase.from("notes").delete().eq("id", id)

      if (error) {
        console.error("Supabase error deleting note:", error)
        throw new Error(`Failed to delete note: ${error.message}`)
      }
    } catch (error: any) {
      console.error("Error in deleteNote:", error)
      throw error
    }
  }

  static async enhanceNote(noteId: string, action: "summarize" | "expand", content: string) {
    try {
      if (!noteId || !content.trim()) {
        throw new Error("Note ID and content are required")
      }

      let result: string

      if (action === "summarize") {
        result = await AIService.summarizeText(content)
      } else {
        result = await AIService.expandText(content)
      }

      // Update the note with AI enhancement
      const updateData = action === "summarize" ? { ai_summary: result } : { ai_expanded: result }

      const { error } = await supabase.from("notes").update(updateData).eq("id", noteId)

      if (error) {
        console.error("Supabase error updating note with AI:", error)
        throw new Error(`Failed to update note with AI enhancement: ${error.message}`)
      }

      return {
        success: true,
        result,
        action,
      }
    } catch (error: any) {
      console.error("Error in enhanceNote:", error)
      throw new Error(`Failed to ${action} note: ${error.message}`)
    }
  }

  // Real-time subscription
  static subscribeToNotes(userId: string, callback: (notes: Note[]) => void) {
    return supabase
      .channel("notes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notes",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Refetch notes when changes occur
          this.getNotes(userId)
            .then(callback)
            .catch((error) => {
              console.error("Error in real-time notes update:", error)
            })
        },
      )
      .subscribe()
  }
}
