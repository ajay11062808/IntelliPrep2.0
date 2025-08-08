import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useState } from 'react'
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { VoiceService } from '../services/voiceService'

interface AudioPermissionRequestProps {
  visible: boolean
  onPermissionGranted: () => void
  onPermissionDenied: () => void
  onClose: () => void
}

export default function AudioPermissionRequest({
  visible,
  onPermissionGranted,
  onPermissionDenied,
  onClose,
}: AudioPermissionRequestProps) {
  const [requesting, setRequesting] = useState(false)

  const handleRequestPermission = async () => {
    setRequesting(true)
    try {
      const hasPermission = await VoiceService.checkPermissions()
      if (hasPermission) {
        onPermissionGranted()
      } else {
        onPermissionDenied()
      }
    } catch (error: any) {
      Alert.alert('Permission Error', error.message || 'Failed to request microphone permission')
      onPermissionDenied()
    } finally {
      setRequesting(false)
    }
  }

  const handleDeny = () => {
    onPermissionDenied()
  }

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
            style={styles.content}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="mic" size={32} color="#10B981" />
              </View>
              <Text style={styles.title}>Microphone Permission</Text>
              <Text style={styles.subtitle}>
                IntelliPrep needs access to your microphone to record voice notes and transcribe them into text.
              </Text>
            </View>

            {/* Permission Details */}
            <View style={styles.details}>
              <View style={styles.detailItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.detailText}>Record voice notes for hands-free note taking</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.detailText}>Automatic transcription to text</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.detailText}>Your audio stays private and secure</Text>
              </View>
            </View>

            {/* Privacy Notice */}
            <View style={styles.privacyNotice}>
              <Text style={styles.privacyTitle}>Privacy & Security</Text>
              <Text style={styles.privacyText}>
                • Audio recordings are processed locally on your device{'\n'}
                • Transcriptions are stored securely in your notes{'\n'}
                • No audio data is sent to external servers{'\n'}
                • You can revoke this permission anytime in device settings
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.denyButton}
                onPress={handleDeny}
                disabled={requesting}
              >
                <Text style={styles.denyButtonText}>Not Now</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.allowButton}
                onPress={handleRequestPermission}
                disabled={requesting}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.allowButtonGradient}
                >
                  <Ionicons name="mic" size={20} color="white" />
                  <Text style={styles.allowButtonText}>
                    {requesting ? 'Requesting...' : 'Allow Microphone Access'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Close Button */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  content: {
    padding: 24,
    position: 'relative',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  details: {
    marginBottom: 24,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  privacyNotice: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  privacyText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  denyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  denyButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  allowButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  allowButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  allowButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
})
