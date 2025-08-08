import React from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import Markdown from 'react-native-markdown-display'

interface MarkdownPreviewProps {
  content: string
  style?: any
}

const markdownStyles = StyleSheet.create({
  body: {
    color: '#374151',
    fontSize: 16,
    lineHeight: 24,
  },
  heading1: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    marginTop: 16,
  },
  heading2: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
    marginTop: 14,
  },
  heading3: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    marginTop: 12,
  },
  paragraph: {
    marginBottom: 12,
    lineHeight: 24,
  },
  strong: {
    fontWeight: 'bold',
    color: '#111827',
  },
  em: {
    fontStyle: 'italic',
    color: '#374151',
  },
  code_inline: {
    backgroundColor: '#F3F4F6',
    color: '#DC2626',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  code_block: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#374151',
  },
  blockquote: {
    borderLeftWidth: 4,
    borderLeftColor: '#E5E7EB',
    paddingLeft: 12,
    marginVertical: 8,
    fontStyle: 'italic',
    color: '#6B7280',
  },
  list_item: {
    marginBottom: 4,
    paddingLeft: 8,
  },
  bullet_list: {
    marginBottom: 8,
  },
  ordered_list: {
    marginBottom: 8,
  },
  link: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
})

export default function MarkdownPreview({ content, style }: MarkdownPreviewProps) {
  if (!content.trim()) {
    return (
      <View style={[styles.emptyContainer, style]}>
        <Markdown style={markdownStyles}>
          {'*No content to preview*'}
        </Markdown>
      </View>
    )
  }

  return (
    <ScrollView style={[styles.container, style]} showsVerticalScrollIndicator={false}>
      <Markdown style={markdownStyles}>
        {content}
      </Markdown>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
