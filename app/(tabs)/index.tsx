import {
  Image,
  StyleSheet,
  SectionList,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

interface EventItem {
  time: string;
  description: string;
}

interface SectionData {
  title: string;
  data: EventItem[];
}

export default function HomeScreen() {
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);

  //   useEffect(() => {
  //     fetch(`http://localhost:3030/api/shifts`)
  //       .then((res) => res.json())
  //       .then((json) => {
  //         const transformed = Object.entries(json).map(([date, events]) => ({
  //           title: date,
  //           data: events,
  //         }));
  //         setSections(transformed);
  //         setLoading(false);
  //       })
  //       .catch((err) => {
  //         console.log('failed to fetch schedule: ', err);
  //         setLoading(false);
  //       });
  //   });
  // }, []);
  useEffect(() => {
    // Replace with your actual endpoint
    fetch(`http://localhost:3030/api/shifts`)
      .then((res) => res.json())
      .then((json: Record<string, EventItem[]>) => {
        const transformed = Object.entries(json).map(([date, events]) => ({
          title: date,
          data: events,
        }));
        setSections(transformed);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch schedule:', err);
        setLoading(false);
      });
  }, []);

  const renderItem = ({ item }: { item: EventItem }) => (
    <View style={styles.card}>
      <Text style={styles.cardTime}>{item.time}</Text>
      <Text style={styles.cardDescription}>{item.description}</Text>
    </View>
  );

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <Text style={styles.sectionHeader}>{section.title}</Text>
  );

  return (
    <ParallaxScrollView
      // headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      // headerBackgroundColor={{ light: '#999999', dark: '#777777' }}
      headerBackgroundImage={
        <Image
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
      {loading ? (
        <ActivityIndicator
          size='large'
          color='#888'
          style={{ marginTop: 20 }}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => `${item.time}-${index}`}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.sectionListContainer}
        />
      )}
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
  sectionListContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTime: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
  },
});
