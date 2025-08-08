"use client"

import { LinearGradient } from "expo-linear-gradient"
import React from "react"
import { Modal, Text, TouchableOpacity, View } from "react-native"

interface Props {
  visible: boolean
  onClose: () => void
  onGoPremium: () => void
  onEnterKey: () => void
}

export const UpgradeDialog: React.FC<Props> = ({ visible, onClose, onGoPremium, onEnterKey }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <LinearGradient colors={["#667eea", "#764ba2"]} style={{ borderRadius: 20, overflow: "hidden", width: "100%" }}>
          <View className="bg-white/95 p-6 rounded-2xl">
            <Text className="text-xl font-bold text-gray-800 mb-2">You've reached your daily limit</Text>
            <Text className="text-gray-600 mb-6">Upgrade to premium for 100 requests/day or add your own Gemini API key to continue.</Text>

            <TouchableOpacity className="bg-indigo-600 rounded-xl py-3 mb-3" onPress={onGoPremium}>
              <Text className="text-white text-center font-semibold">Go Premium</Text>
            </TouchableOpacity>
            <TouchableOpacity className="bg-white border border-gray-200 rounded-xl py-3 mb-3" onPress={onEnterKey}>
              <Text className="text-gray-800 text-center font-semibold">Enter My Gemini API Key</Text>
            </TouchableOpacity>
            <TouchableOpacity className="py-2" onPress={onClose}>
              <Text className="text-center text-gray-500">Maybe later</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  )
}


