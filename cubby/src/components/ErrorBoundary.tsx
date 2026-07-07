import { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import Btn from './Btn';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Catches render-time errors anywhere in the tree below it and shows a
// recovery screen instead of a blank/frozen app. Does not catch errors in
// event handlers or async code (React limitation) — those are logged
// separately via src/lib/error-logging.ts.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] Caught render error:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  handleGoHome = () => {
    this.setState({ hasError: false });
    router.replace('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.emoji}>😕</Text>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.sub}>
              We hit an unexpected error. Try again, or head back to the home screen.
            </Text>
            <Btn label="Try again" onPress={this.handleRetry} style={styles.btn} />
            <Btn label="Back to home" onPress={this.handleGoHome} variant="secondary" style={styles.btn} />
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  sub: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  btn: { width: '100%', marginBottom: 12 },
});
