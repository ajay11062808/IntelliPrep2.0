"use client"

import { Ionicons } from "@expo/vector-icons"
import React, { useEffect, useRef, useState } from "react"
import { Alert, Text, TouchableOpacity, View } from "react-native"

type Props = {
  onPartialText: (text: string) => void
  onFinalText?: (text: string) => void
}

// Lightweight wrapper that attempts to use react-native-voice if available.
// If the dependency isn't installed or the app isn't using a custom dev client,
// it gracefully degrades to a no-op UI with guidance.
export default function RealtimeTranscriber({ onPartialText, onFinalText }: Props) {
  const [isAvailable, setIsAvailable] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const VoiceRef = useRef<any>(null)

  useEffect(() => {
    try {
      // Use eval('require') to prevent Metro from statically resolving the module when it's not installed
       
      const maybe = eval('require')("@react-native-voice/voice")
      const Voice = maybe?.default ?? maybe
      if (Voice) {
        VoiceRef.current = Voice
        setIsAvailable(true)

        Voice.onSpeechPartialResults = (event: any) => {
          const text = Array.isArray(event?.value) ? event.value[0] : ""
          if (text) onPartialText(text)
        }
        Voice.onSpeechResults = (event: any) => {
          const text = Array.isArray(event?.value) ? event.value[0] : ""
          if (text) onFinalText?.(text)
        }
        Voice.onSpeechError = (event: any) => {
          console.warn("Speech error", event?.error)
          setIsListening(false)
        }
      }
    } catch (e) {
      setIsAvailable(false)
    }

    return () => {
      try {
        const Voice = VoiceRef.current
        if (Voice) {
          Voice.destroy().finally(() => Voice.removeAllListeners && Voice.removeAllListeners())
        }
      } catch {}
    }
  }, [])

  const start = async () => {
    if (!isAvailable) {
      Alert.alert(
        "Speech not available",
        "Install @react-native-voice/voice and build a custom dev client to enable realtime transcription.",
      )
      return
    }
    try {
      await VoiceRef.current?.start("en-US", { EXTRA_PARTIAL_RESULTS: true })
      setIsListening(true)
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Unable to start speech recognition")
    }
  }

  const stop = async () => {
    try {
      await VoiceRef.current?.stop()
    } catch {}
    setIsListening(false)
  }

  return (
    <View style={{ alignItems: "center" }}>
      <TouchableOpacity
        onPress={isListening ? stop : start}
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isListening ? "#EF4444" : "#10B981",
        }}
      >
        <Ionicons name={isListening ? "stop" : "mic"} size={22} color="#fff" />
      </TouchableOpacity>
      {!isAvailable && (
        <Text style={{ marginTop: 8, fontSize: 12, color: "#6B7280" }}>
          Realtime speech requires @react-native-voice/voice
        </Text>
      )}
    </View>
  )
}


