import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

interface TagSelectorProps {
  tags: string[]
  onTagsChange: (tags: string[]) => void
  maxTags?: number
}

const predefinedTags = [
  'Important', 'Work', 'Personal', 'Study', 'Ideas', 'Todo', 'Meeting', 'Project',
  'Research', 'Notes', 'Quick', 'Draft', 'Final', 'Review', 'Archive'
]

export default function TagSelector({ tags, onTagsChange, maxTags = 10 }: TagSelectorProps) {
  const [newTag, setNewTag] = useState('')
  const [showAddTag, setShowAddTag] = useState(false)

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (!trimmedTag) return

    if (tags.length >= maxTags) {
      Alert.alert('Too Many Tags', `You can only have up to ${maxTags} tags.`)
      return
    }

    if (tags.includes(trimmedTag)) {
      Alert.alert('Tag Exists', 'This tag already exists.')
      return
    }

    onTagsChange([...tags, trimmedTag])
    setNewTag('')
    setShowAddTag(false)
  }

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove))
  }

  const handleAddCustomTag = () => {
    if (newTag.trim()) {
      addTag(newTag)
    }
  }

  const getTagColor = (tag: string): string => {
    const colors = [
      '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899',
      '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ]
    const index = tag.length % colors.length
    return colors[index]
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tags</Text>
        <Text style={styles.count}>{tags.length}/{maxTags}</Text>
      </View>

      {/* Existing Tags */}
      {tags.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsContainer}>
          {tags.map((tag, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => removeTag(tag)}
              style={styles.tagContainer}
            >
              <LinearGradient
                colors={[getTagColor(tag), getTagColor(tag) + 'CC']}
                style={styles.tagGradient}
              >
                <Text style={styles.tagText}>{tag}</Text>
                <Ionicons name="close" size={14} color="white" style={styles.removeIcon} />
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Add Tag Section */}
      {!showAddTag && tags.length < maxTags && (
        <TouchableOpacity
          onPress={() => setShowAddTag(true)}
          style={styles.addButton}
        >
          <LinearGradient
            colors={['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.1)']}
            style={styles.addButtonGradient}
          >
            <Ionicons name="add" size={20} color="#6366F1" />
            <Text style={styles.addButtonText}>Add Tag</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Custom Tag Input */}
      {showAddTag && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newTag}
            onChangeText={setNewTag}
            placeholder="Enter tag name..."
            placeholderTextColor="rgba(0,0,0,0.4)"
            autoFocus
            onSubmitEditing={handleAddCustomTag}
            returnKeyType="done"
          />
          <TouchableOpacity onPress={handleAddCustomTag} style={styles.confirmButton}>
            <Ionicons name="checkmark" size={20} color="#10B981" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAddTag(false)} style={styles.cancelButton}>
            <Ionicons name="close" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}

      {/* Predefined Tags */}
      {tags.length < maxTags && (
        <View style={styles.predefinedContainer}>
          <Text style={styles.predefinedTitle}>Quick Tags:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.predefinedTags}>
            {predefinedTags
              .filter(tag => !tags.includes(tag))
              .slice(0, 8)
              .map((tag, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => addTag(tag)}
                  style={styles.predefinedTag}
                >
                  <Text style={[styles.predefinedTagText, { color: getTagColor(tag) }]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  count: {
    fontSize: 12,
    color: '#6B7280',
  },
  tagsContainer: {
    marginBottom: 12,
  },
  tagContainer: {
    marginRight: 8,
  },
  tagGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
  },
  removeIcon: {
    marginLeft: 4,
  },
  addButton: {
    marginBottom: 12,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addButtonText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    fontSize: 14,
  },
  confirmButton: {
    padding: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    marginRight: 4,
  },
  cancelButton: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
  predefinedContainer: {
    marginTop: 8,
  },
  predefinedTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  predefinedTags: {
    flexDirection: 'row',
  },
  predefinedTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(243, 244, 246, 0.8)',
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  predefinedTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
})
