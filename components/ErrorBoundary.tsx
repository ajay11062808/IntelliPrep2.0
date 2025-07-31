import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

type Props = { children: React.ReactNode };
type State = { error: Error | null; errorInfo: any };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.setState({ error, errorInfo });
    // Optionally log the error to an error reporting service here
    console.error('Global ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Something went wrong!</Text>
          <Text selectable style={styles.error}>{this.state.error.toString()}</Text>
          {this.state.errorInfo && (
            <Text selectable style={styles.errorInfo}>
              {JSON.stringify(this.state.errorInfo, null, 2)}
            </Text>
          )}
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontWeight: 'bold', fontSize: 20, marginBottom: 16, color: 'red' },
  error: { color: 'red', marginBottom: 8 },
  errorInfo: { color: 'gray', fontSize: 12 },
});