import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useEffect, useRef, useState } from 'react'
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { VoiceData } from '../constants/types'
import { VoiceService } from '../services/voiceService'

interface VoiceRecorderProps {
  onTranscriptionComplete: (voiceData: VoiceData) => void
  onRecordingStart?: () => void
  onRecordingStop?: () => void
}

export default function VoiceRecorder({ 
  onTranscriptionComplete, 
  onRecordingStart, 
  onRecordingStop 
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcription, setTranscription] = useState('')
  
  const pulseAnim = useRef(new Animated.Value(1)).current
  const durationInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isRecording) {
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start()

      // Start duration timer
      durationInterval.current = setInterval(() => {
        setRecordingDuration(VoiceService.getRecordingDuration())
      }, 100)
    } else {
      // Stop pulse animation
      pulseAnim.stopAnimation()
      pulseAnim.setValue(1)

      // Clear duration timer
      if (durationInterval.current) {
        clearInterval(durationInterval.current)
        durationInterval.current = null
      }
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current)
      }
    }
  }, [isRecording, pulseAnim])

  const startRecording = async () => {
    try {
      await VoiceService.startRecording()
      setIsRecording(true)
      setRecordingDuration(0)
      setTranscription('')
      onRecordingStart?.()
    } catch (error: any) {
      Alert.alert('Recording Error', error.message || 'Failed to start recording')
    }
  }

  const stopRecording = async () => {
    try {
      setIsRecording(false)
      onRecordingStop?.()

      const { uri, duration } = await VoiceService.stopRecording()
      
      setIsTranscribing(true)
      const transcribedText = await VoiceService.transcribeAudio(uri)
      setTranscription(transcribedText)

      const voiceData = VoiceService.createVoiceData(uri, duration, transcribedText)
      onTranscriptionComplete(voiceData)
      
      setIsTranscribing(false)
    } catch (error: any) {
      Alert.alert('Recording Error', error.message || 'Failed to stop recording')
      setIsRecording(false)
      setIsTranscribing(false)
    }
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <View style={styles.container}>
      {/* Recording Status */}
      {isRecording && (
        <View style={styles.statusContainer}>
          <Animated.View style={[styles.pulseIndicator, { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name="radio-button-on" size={12} color="#EF4444" />
          </Animated.View>
          <Text style={styles.statusText}>Recording...</Text>
          <Text style={styles.durationText}>{formatDuration(recordingDuration)}</Text>
        </View>
      )}

      {/* Transcription Preview */}
      {transcription && (
        <View style={styles.transcriptionContainer}>
          <Text style={styles.transcriptionLabel}>Transcription:</Text>
          <Text style={styles.transcriptionText}>{transcription}</Text>
        </View>
      )}

      {/* Recording Button */}
      <TouchableOpacity
        onPress={isRecording ? stopRecording : startRecording}
        disabled={isTranscribing}
        style={styles.recordButton}
      >
        <LinearGradient
          colors={isRecording ? ['#EF4444', '#DC2626'] : ['#10B981', '#059669']}
          style={styles.recordButtonGradient}
        >
          <Ionicons
            name={isRecording ? 'stop' : 'mic'}
            size={24}
            color="white"
          />
        </LinearGradient>
      </TouchableOpacity>

      {/* Transcribing Indicator */}
      {isTranscribing && (
        <View style={styles.transcribingContainer}>
          <Text style={styles.transcribingText}>Transcribing audio...</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 20,
  },
  pulseIndicator: {
    marginRight: 8,
  },
  statusText: {
    color: '#EF4444',
    fontWeight: '600',
    marginRight: 8,
  },
  durationText: {
    color: '#EF4444',
    fontWeight: '500',
    fontSize: 12,
  },
  transcriptionContainer: {
    width: '100%',
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
  },
  transcriptionLabel: {
    color: '#059669',
    fontWeight: '600',
    marginBottom: 4,
    fontSize: 12,
  },
  transcriptionText: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 20,
  },
  recordButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transcribingContainer: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 16,
  },
  transcribingText: {
    color: '#3B82F6',
    fontWeight: '500',
    fontSize: 12,
  },
})
