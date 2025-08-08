import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface ColorThemeSelectorProps {
  selectedColor: string
  onColorChange: (color: string) => void
}

const colorThemes = [
  { id: '#6366F1', name: 'Indigo', gradient: ['#6366F1', '#8B5CF6'] },
  { id: '#10B981', name: 'Emerald', gradient: ['#10B981', '#059669'] },
  { id: '#F59E0B', name: 'Amber', gradient: ['#F59E0B', '#D97706'] },
  { id: '#EF4444', name: 'Red', gradient: ['#EF4444', '#DC2626'] },
  { id: '#3B82F6', name: 'Blue', gradient: ['#3B82F6', '#2563EB'] },
  { id: '#8B5CF6', name: 'Purple', gradient: ['#8B5CF6', '#7C3AED'] },
  { id: '#EC4899', name: 'Pink', gradient: ['#EC4899', '#DB2777'] },
  { id: '#06B6D4', name: 'Cyan', gradient: ['#06B6D4', '#0891B2'] },
  { id: '#84CC16', name: 'Lime', gradient: ['#84CC16', '#65A30D'] },
  { id: '#F97316', name: 'Orange', gradient: ['#F97316', '#EA580C'] },
  { id: '#6B7280', name: 'Gray', gradient: ['#6B7280', '#4B5563'] },
  { id: '#059669', name: 'Green', gradient: ['#059669', '#047857'] },
]

export default function ColorThemeSelector({ selectedColor, onColorChange }: ColorThemeSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Color Theme</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorsContainer}>
        {colorThemes.map((theme) => (
          <TouchableOpacity
            key={theme.id}
            onPress={() => onColorChange(theme.id)}
            style={styles.colorOption}
          >
            <LinearGradient
              colors={theme.gradient}
              style={[
                styles.colorGradient,
                selectedColor === theme.id && styles.selectedColor,
              ]}
            >
              {selectedColor === theme.id && (
                <Ionicons name="checkmark" size={16} color="white" />
              )}
            </LinearGradient>
            <Text style={styles.colorName}>{theme.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  colorsContainer: {
    flexDirection: 'row',
  },
  colorOption: {
    alignItems: 'center',
    marginRight: 16,
  },
  colorGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  colorName: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
})
