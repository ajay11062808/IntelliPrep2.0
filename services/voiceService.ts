import { Audio } from 'expo-av'
import type { VoiceData } from '../constants/types'

export class VoiceService {
  private static recording: Audio.Recording | null = null
  private static isRecording = false
  private static recordingStartTime: number = 0

  // Check and request microphone permissions
  static async checkPermissions(): Promise<boolean> {
    try {
      // For Expo Go, we need to use Audio.requestPermissionsAsync() for both platforms
      const { status } = await Audio.requestPermissionsAsync()
      console.log('Permission status:', status)
      
      if (status === 'granted') {
        console.log('Permission already granted')
        return true
      } else if (status === 'denied') {
        console.log('Permission denied by user')
        return false
      } else if (status === 'undetermined') {
        console.log('Permission not determined yet, requesting...')
        // Try to request permission again
        const { status: newStatus } = await Audio.requestPermissionsAsync()
        console.log('New permission status:', newStatus)
        return newStatus === 'granted'
      }
      
      return false
    } catch (error) {
      console.error('Permission request error:', error)
      return false
    }
  }

  // Initialize audio recording
  static async initializeRecording(): Promise<void> {
    try {
      const audioMode = {
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      }
      
      console.log('Setting audio mode:', audioMode)
      await Audio.setAudioModeAsync(audioMode)
      console.log('Audio mode initialized successfully')
    } catch (error) {
      console.error('Failed to initialize audio recording:', error)
      throw new Error('Failed to initialize audio recording')
    }
  }

  // Start recording
  static async startRecording(): Promise<void> {
    try {
      console.log('Starting recording process...')
      
      // First check if we have permissions
      const hasPermission = await this.checkPermissions()
      console.log('Permission check result:', hasPermission)
      
      if (!hasPermission) {
        throw new Error('Microphone permission not granted. Please grant microphone access in your device settings.')
      }

      // Initialize audio mode
      console.log('Initializing audio mode...')
      await this.initializeRecording()

      // Create recording with proper options for Expo Go
      console.log('Creating recording instance...')
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )

      if (!recording) {
        throw new Error('Failed to create recording instance')
      }

      this.recording = recording
      this.isRecording = true
      this.recordingStartTime = Date.now()

      console.log('Recording started successfully')
    } catch (error) {
      console.error('Failed to start recording:', error)
      // Clean up any partial recording state
      this.recording = null
      this.isRecording = false
      throw error
    }
  }

  // Stop recording and get audio data
  static async stopRecording(): Promise<{ uri: string; duration: number }> {
    try {
      if (!this.recording || !this.isRecording) {
        throw new Error('No active recording')
      }

      await this.recording.stopAndUnloadAsync()
      const uri = this.recording.getURI()
      const duration = (Date.now() - this.recordingStartTime) / 1000

      this.recording = null
      this.isRecording = false

      if (!uri) {
        throw new Error('Failed to get recording URI')
      }

      console.log('Recording stopped, duration:', duration)
      return { uri, duration }
    } catch (error) {
      console.error('Failed to stop recording:', error)
      throw error
    }
  }

  // Transcribe audio using device's speech recognition
  static async transcribeAudio(audioUri: string): Promise<string> {
    try {
      // For now, we'll use a placeholder transcription
      // In a real app, you'd integrate with a speech-to-text service
      // like Google Cloud Speech-to-Text, Azure Speech Services, or AWS Transcribe
      
      // Simulate transcription delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Return a placeholder transcription
      // In production, you'd send the audio file to a transcription service
      return "This is a placeholder transcription. In production, this would be the actual transcribed text from the audio recording."
    } catch (error) {
      console.error('Transcription error:', error)
      throw new Error('Failed to transcribe audio')
    }
  }

  // Create voice data object
  static createVoiceData(
    audioUri: string,
    duration: number,
    transcription: string,
    language: string = 'en-US'
  ): VoiceData {
    return {
      audio_url: audioUri,
      duration,
      transcription,
      confidence: 0.95, // Placeholder confidence
      language,
      timestamp: new Date().toISOString(),
    }
  }

  // Check if currently recording
  static isCurrentlyRecording(): boolean {
    return this.isRecording
  }

  // Get recording duration
  static getRecordingDuration(): number {
    if (!this.isRecording || !this.recordingStartTime) {
      return 0
    }
    return (Date.now() - this.recordingStartTime) / 1000
  }

  // Clean up resources
  static async cleanup(): Promise<void> {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync()
      }
      this.recording = null
      this.isRecording = false
    } catch (error) {
      console.error('Cleanup error:', error)
    }
  }
}
