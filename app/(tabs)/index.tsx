import {
  Image,
  StyleSheet,
  SectionList,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

// ── Config ────────────────────────────────────────────────────────────────────
const BACKEND_URL = 'https://psfc-backend.fly.dev'; // Update after Fly.io deploy
const POLL_INTERVAL = 30 * 1000; // 30 seconds while screen is active

// ── Types ─────────────────────────────────────────────────────────────────────
interface EventItem {
  time: string;
  description: string;
  href: string; // Shift signup URL passed back to backend for Puppeteer
}

interface SectionData {
  title: string; // date string, e.g. "Monday, November 4"
  data: EventItem[];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // Subtle background refresh indicator
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [claimingKey, setClaimingKey] = useState<string | null>(null); // Which shift is mid-claim

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch shifts from backend ───────────────────────────────────────────────
  const fetchShifts = useCallback(async (isBackground = false) => {
    if (isBackground) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/shifts`);
      const json = (await res.json()) as Record<string, EventItem[]>;

      if (!res.ok) {
        console.error('Shifts endpoint error:', json);
        return;
      }

      const transformed = Object.entries(json).map(([date, events]) => ({
        title: date,
        data: events as EventItem[],
      }));

      setSections(transformed);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch schedule:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Claim a shift ───────────────────────────────────────────────────────────
  const claimShift = useCallback(
    async (date: string, item: EventItem) => {
      const shiftKey = `${date}|${item.time}|${item.description}`;

      Alert.alert(
        'Claim Shift',
        `Sign up for:\n${date} at ${item.time}\n${item.description}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              setClaimingKey(shiftKey);
              try {
                const res = await fetch(`${BACKEND_URL}/api/shifts/claim`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    date,
                    time: item.time,
                    description: item.description,
                    href: item.href, // Passed to Puppeteer to click the actual signup link
                    username: 'REPLACE_WITH_LOGGED_IN_USERNAME', // TODO: pull from SecureStore / auth context
                  }),
                });

                const data = await res.json();

                if (res.ok) {
                  Alert.alert('✅ Success', data.message ?? 'Shift claimed!');
                  // Immediately remove the claimed shift from the local list
                  // so the user sees instant feedback while the rescrape runs
                  setSections((prev) =>
                    prev
                      .map((section) => ({
                        ...section,
                        data: section.data.filter(
                          (s) =>
                            !(
                              section.title === date &&
                              s.time === item.time &&
                              s.description === item.description
                            ),
                        ),
                      }))
                      .filter((section) => section.data.length > 0),
                  );
                } else {
                  Alert.alert(
                    '❌ Unavailable',
                    data.error ?? 'Could not claim shift. Please try again.',
                  );
                  // Refresh immediately so they see the current state
                  await fetchShifts(true);
                }
              } catch (err) {
                Alert.alert(
                  '❌ Network Error',
                  'Please check your connection and try again.',
                );
                console.error('Claim error:', err);
              } finally {
                setClaimingKey(null);
              }
            },
          },
        ],
      );
    },
    [fetchShifts],
  );

  // ── 30-second polling loop (runs only while this screen is mounted) ─────────
  useEffect(() => {
    fetchShifts(false); // Initial load

    pollTimerRef.current = setInterval(() => {
      fetchShifts(true); // Background refresh — doesn't show full loading spinner
    }, POLL_INTERVAL);

    return () => {
      // Clean up when user navigates away — no wasted network calls
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchShifts]);

  // ── Render helpers ──────────────────────────────────────────────────────────
  const renderItem = ({
    item,
    section,
  }: {
    item: EventItem;
    section: SectionData;
  }) => {
    const shiftKey = `${section.title}|${item.time}|${item.description}`;
    const isClaiming = claimingKey === shiftKey;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => claimShift(section.title, item)}
        disabled={isClaiming}
        activeOpacity={0.75}
      >
        <View style={styles.cardContent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTime}>{item.time}</Text>
            <Text style={styles.cardDescription}>{item.description}</Text>
          </View>
          {isClaiming ? (
            <ActivityIndicator size='small' color='#007AFF' />
          ) : (
            <Text style={styles.signUpButton}>Sign Up →</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <Text style={styles.sectionHeader}>{section.title}</Text>
  );

  // ── JSX ─────────────────────────────────────────────────────────────────────
  return (
    <ParallaxScrollView
      headerBackgroundImage={
        <Image
          source={require('@/assets/images/sugarsnappeas.png')}
          style={styles.headerBackground}
          resizeMode='cover'
        />
      }
      headerImage={
        <Image
          source={require('@/assets/images/psfc-logo.png')}
          style={styles.coopLogo}
        />
      }
      headerBackgroundColor={{ dark: '', light: '' }}
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type='title'>Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>

      {/* Subtle "last updated" + live refresh indicator */}
      <View style={styles.statusBar}>
        {refreshing && (
          <ActivityIndicator
            size='small'
            color='#888'
            style={{ marginRight: 6 }}
          />
        )}
        {lastUpdated && (
          <Text style={styles.lastUpdatedText}>
            Updated{' '}
            {lastUpdated.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        )}
      </View>

      {loading ? (
        <ActivityIndicator
          size='large'
          color='#888'
          style={{ marginTop: 40 }}
        />
      ) : sections.length === 0 ? (
        <Text style={styles.emptyText}>No shifts available right now.</Text>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => `${item.time}-${index}`}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.sectionListContainer}
          scrollEnabled={false} // ParallaxScrollView handles scrolling
        />
      )}
    </ParallaxScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coopLogo: {
    height: 178,
    width: 290,
    top: 75,
    bottom: 0,
    left: '50%',
    transform: [{ translateX: -145 }],
    position: 'absolute',
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: '#999',
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
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
  signUpButton: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#999',
    fontSize: 16,
  },
});
