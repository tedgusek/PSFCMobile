// import { StyleSheet, Image, Platform } from 'react-native';

// import { Collapsible } from '@/components/Collapsible';
// import { ExternalLink } from '@/components/ExternalLink';
// import ParallaxScrollView from '@/components/ParallaxScrollView';
// import { ThemedText } from '@/components/ThemedText';
// import { ThemedView } from '@/components/ThemedView';
// import { IconSymbol } from '@/components/ui/IconSymbol';

// export default function TabTwoScreen() {
//   return (
//     <ParallaxScrollView
//       headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
//       headerImage={
//         <IconSymbol
//           size={310}
//           color='#808080'
//           name='chevron.left.forwardslash.chevron.right'
//           style={styles.headerImage}
//         />
//       }
//       headerBackgroundImage={undefined}
//     >
//       <ThemedView style={styles.titleContainer}>
//         <ThemedText type='title'>Explore</ThemedText>
//       </ThemedView>
//       <ThemedText>
//         This app includes example code to help you get started.
//       </ThemedText>
//       <Collapsible title='File-based routing'>
//         <ThemedText>
//           This app has two screens:{' '}
//           <ThemedText type='defaultSemiBold'>app/(tabs)/index.tsx</ThemedText>{' '}
//           and{' '}
//           <ThemedText type='defaultSemiBold'>app/(tabs)/explore.tsx</ThemedText>
//         </ThemedText>
//         <ThemedText>
//           The layout file in{' '}
//           <ThemedText type='defaultSemiBold'>app/(tabs)/_layout.tsx</ThemedText>{' '}
//           sets up the tab navigator.
//         </ThemedText>
//         <ExternalLink href='https://docs.expo.dev/router/introduction'>
//           <ThemedText type='link'>Learn more</ThemedText>
//         </ExternalLink>
//       </Collapsible>
//       <Collapsible title='Android, iOS, and web support'>
//         <ThemedText>
//           You can open this project on Android, iOS, and the web. To open the
//           web version, press <ThemedText type='defaultSemiBold'>w</ThemedText>{' '}
//           in the terminal running this project.
//         </ThemedText>
//       </Collapsible>
//       <Collapsible title='Images'>
//         <ThemedText>
//           For static images, you can use the{' '}
//           <ThemedText type='defaultSemiBold'>@2x</ThemedText> and{' '}
//           <ThemedText type='defaultSemiBold'>@3x</ThemedText> suffixes to
//           provide files for different screen densities
//         </ThemedText>
//         <Image
//           source={require('@/assets/images/react-logo.png')}
//           style={{ alignSelf: 'center' }}
//         />
//         <ExternalLink href='https://reactnative.dev/docs/images'>
//           <ThemedText type='link'>Learn more</ThemedText>
//         </ExternalLink>
//       </Collapsible>
//       <Collapsible title='Custom fonts'>
//         <ThemedText>
//           Open <ThemedText type='defaultSemiBold'>app/_layout.tsx</ThemedText>{' '}
//           to see how to load{' '}
//           <ThemedText style={{ fontFamily: 'SpaceMono' }}>
//             custom fonts such as this one.
//           </ThemedText>
//         </ThemedText>
//         <ExternalLink href='https://docs.expo.dev/versions/latest/sdk/font'>
//           <ThemedText type='link'>Learn more</ThemedText>
//         </ExternalLink>
//       </Collapsible>
//       <Collapsible title='Light and dark mode components'>
//         <ThemedText>
//           This template has light and dark mode support. The{' '}
//           <ThemedText type='defaultSemiBold'>useColorScheme()</ThemedText> hook
//           lets you inspect what the user's current color scheme is, and so you
//           can adjust UI colors accordingly.
//         </ThemedText>
//         <ExternalLink href='https://docs.expo.dev/develop/user-interface/color-themes/'>
//           <ThemedText type='link'>Learn more</ThemedText>
//         </ExternalLink>
//       </Collapsible>
//       <Collapsible title='Animations'>
//         <ThemedText>
//           This template includes an example of an animated component. The{' '}
//           <ThemedText type='defaultSemiBold'>
//             components/HelloWave.tsx
//           </ThemedText>{' '}
//           component uses the powerful{' '}
//           <ThemedText type='defaultSemiBold'>
//             react-native-reanimated
//           </ThemedText>{' '}
//           library to create a waving hand animation.
//         </ThemedText>
//         {Platform.select({
//           ios: (
//             <ThemedText>
//               The{' '}
//               <ThemedText type='defaultSemiBold'>
//                 components/ParallaxScrollView.tsx
//               </ThemedText>{' '}
//               component provides a parallax effect for the header image.
//             </ThemedText>
//           ),
//         })}
//       </Collapsible>
//     </ParallaxScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   headerImage: {
//     color: '#808080',
//     bottom: -90,
//     left: -35,
//     position: 'absolute',
//   },
//   titleContainer: {
//     flexDirection: 'row',
//     gap: 8,
//   },
// });

//////////////////////////////////////
import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const saveAuthToken = async (token: string) => {
    try {
      await SecureStore.setItemAsync('authToken', token);
      return true;
    } catch (error) {
      console.error('Error saving auth token:', error);
      return false;
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setIsLoading(true);

    try {
      // Send credentials to backend for authentication
      const response = await fetch('YOUR_BACKEND_URL/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        // Save only the auth token, not credentials
        const saved = await saveAuthToken(data.token);

        if (saved) {
          Alert.alert('Success', 'Login successful!');
          // Clear password from memory
          setPassword('');
          // Navigate to main app
          // navigation.navigate('MainApp');
        } else {
          Alert.alert('Error', 'Failed to save authentication token');
        }
      } else {
        Alert.alert('Error', data.message || 'Login failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const router = useRouter();

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('authToken');
    router.replace('/login');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ThemedView style={styles.content}>
        <ThemedText type='title' style={styles.title}>
          Login
        </ThemedText>

        <ThemedView style={styles.inputContainer}>
          <ThemedText style={styles.label}>Username</ThemedText>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder='Enter your username'
            autoCapitalize='none'
            autoCorrect={false}
          />
        </ThemedView>

        <ThemedView style={styles.inputContainer}>
          <ThemedText style={styles.label}>Password</ThemedText>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder='Enter your password'
            secureTextEntry
            autoCapitalize='none'
            autoCorrect={false}
          />
        </ThemedView>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color='#fff' />
          ) : (
            <ThemedText style={styles.buttonText}>Login</ThemedText>
          )}
        </TouchableOpacity>
      </ThemedView>
    </KeyboardAvoidingView>
  );
  <TouchableOpacity onPress={handleLogout}>
    <ThemedText>Logout</ThemedText>
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontSize: 16,
  },
  input: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
