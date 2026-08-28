import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

/**
 * Root index — waits for auth to resolve, then redirects accordingly.
 * Prevents the race condition where we redirect to (tabs) before
 * AuthRoutingHandler has a chance to evaluate auth state.
 */
export default function Index() {
  const { user, isGuest, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#00A8FF" size="large" />
      </View>
    );
  }

  const isAuthenticated = user !== null || isGuest;

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#070B14',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
