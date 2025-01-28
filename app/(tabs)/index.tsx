import { Image, StyleSheet, Platform, ImageBackground } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      // headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerBackgroundColor={{ light: '#555555', dark: '#777777' }}
      // headerBackgroundImage={
      //   <ImageBackground
      //     source={require('@/assets/images/sugarsnappeas.png')}
      //     style={styles.headerBackground}
      //     resizeMode='cover'
      //   />
      // }
      headerImage={
        <Image
          // source={require('@/assets/images/partial-react-logo.png')}
          source={require('@/assets/images/psfc-logo.png')}
          style={styles.coopLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type='title'>Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type='subtitle'>Step 1: Try it</ThemedText>
        <ThemedText>
          Edit{' '}
          <ThemedText type='defaultSemiBold'>app/(tabs)/index.tsx</ThemedText>{' '}
          to see changes. Press{' '}
          <ThemedText type='defaultSemiBold'>
            {Platform.select({
              ios: 'cmd + d',
              android: 'cmd + m',
              web: 'F12',
            })}
          </ThemedText>{' '}
          to open developer tools.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type='subtitle'>Step 2: Explore</ThemedText>
        <ThemedText>
          Tap the Explore tab to learn more about what's included in this
          starter app.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type='subtitle'>Step 3: Get a fresh start</ThemedText>
        <ThemedText>
          When you're ready, run{' '}
          <ThemedText type='defaultSemiBold'>npm run reset-project</ThemedText>{' '}
          to get a fresh <ThemedText type='defaultSemiBold'>app</ThemedText>{' '}
          directory. This will move the current{' '}
          <ThemedText type='defaultSemiBold'>app</ThemedText> to{' '}
          <ThemedText type='defaultSemiBold'>app-example</ThemedText>.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  coopLogo: {
    height: 178,
    width: 290,
    top: 75,
    bottom: 0,
    left: '50%',
    transform: [{ translateX: -145 }], //Half of the width
    position: 'absolute',
  },
  headerBackground: {
    flex: 1,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
