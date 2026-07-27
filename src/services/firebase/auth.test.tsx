import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AuthProvider, useAuth } from './auth';

function AuthProbe() {
  const { uid, isLoading, isSignedIn } = useAuth();
  return <Text>{`uid:${uid ?? 'none'} loading:${isLoading} signedIn:${isSignedIn}`}</Text>;
}

describe('AuthProvider (Firebase not configured)', () => {
  it('renders the offline state without importing firebase', () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    // With no EXPO_PUBLIC_FIREBASE_* vars in the test env, the provider must be
    // a transparent offline pass-through: no uid, not loading, not signed in.
    expect(screen.getByText('uid:none loading:false signedIn:false')).toBeOnTheScreen();
  });
});
