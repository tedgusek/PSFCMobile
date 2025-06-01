import { Image, StyleSheet, Platform, ImageBackground } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      // headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      // headerBackgroundColor={{ light: '#999999', dark: '#777777' }}
      headerBackgroundImage={
        <ImageBackground
          source={require('@/assets/images/sugarsnappeas.png')}
          style={styles.headerBackground}
          resizeMode='cover'
        />
      }
      headerImage={
        <Image
          // source={require('@/assets/images/partial-react-logo.png')}
          // source={require('@/assets/images/sugarsnappeas.png')}
          source={require('@/assets/images/psfc-logo.png')}
          style={styles.coopLogo}
        />
      }
      headerBackgroundColor={{
        dark: '',
        light: '',
      }} // headerBackgroundImage={undefined}
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type='title'>Welcome!</ThemedText>
        <HelloWave />
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
    // flex: 1,
    // height: 200,
    // justifyContent: 'center',
    // alignItems: 'center',
    // borderWidth: 5,
    // borderColor: 'red',
    // position: 'absolute',
    // top: 0,
    // left: 0,
    // right: 0,
    // width: '100%',
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
  },
});
