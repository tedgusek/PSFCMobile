import {
  Image,
  StyleSheet,
  SectionList,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

// ── Config ────────────────────────────────────────────────────────────────────
const BACKEND_URL = 'https://psfc-backend.fly.dev'; // Update to your Fly.io URL
const POLL_INTERVAL = 30 * 1000; // 30 seconds while screen is active

// ── Types ─────────────────────────────────────────────────────────────────────
interface EventItem {
  time: string;
  description: string;
  href: string; // Shift signup URL — passed to backend for Puppeteer
}

interface SectionData {
  title: string;
  data: EventItem[];
}

// The shift the user tapped, held in state while the initials modal is open
interface PendingClaim {
  date: string;
  item: EventItem;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [claimingKey, setClaimingKey] = useState<string | null>(null);

  // Initials modal state
  const [pendingClaim, setPendingClaim] = useState<PendingClaim | null>(null);
  const [initials, setInitials] = useState('');
  const [initialsError, setInitialsError] = useState('');

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch shifts ─────────────────────────────────────────────────────────
  const fetchShifts = useCallback(async (isBackground = false) => {
    if (isBackground) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/shifts`);
      const json = (await res.json()) as Record<string, EventItem[]>;

      if (!res.ok) {
        console.error('Shifts endpoint error:', json);
        return;
      }

      const transformed = Object.entries(json).map(([date, events]) => ({
        title: date,
        data: events,
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

  // ── Step 1: User taps a shift → open initials modal ───────────────────────
  const handleShiftPress = useCallback((date: string, item: EventItem) => {
    setInitials('');
    setInitialsError('');
    setPendingClaim({ date, item });
  }, []);

  // ── Step 2: User submits initials → send claim to backend ─────────────────
  const handleInitialsSubmit = useCallback(async () => {
    if (!pendingClaim) return;

    // Validate initials
    const trimmed = initials.trim().toUpperCase();
    if (!/^[A-Z]{2,3}$/.test(trimmed)) {
      setInitialsError('Please enter 2–3 letters only (e.g. "TG" or "TJG")');
      return;
    }

    const { date, item } = pendingClaim;
    const shiftKey = `${date}|${item.time}|${item.description}`;

    setPendingClaim(null); // Close modal
    setClaimingKey(shiftKey);

    try {
      const res = await fetch(`${BACKEND_URL}/api/shifts/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          time: item.time,
          description: item.description,
          href: item.href,
          initials: trimmed,
          username: 'REPLACE_WITH_LOGGED_IN_USERNAME', // TODO: pull from auth context
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Optimistically remove the shift from the list immediately
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
        Alert.alert(
          '✅ Signed Up!',
          data.message ?? 'You are signed up for this shift!',
        );
      } else if (res.status === 409) {
        Alert.alert(
          '❌ Already Taken',
          data.error ?? 'This shift was just claimed by someone else.',
        );
        await fetchShifts(true);
      } else {
        Alert.alert(
          '❌ Error',
          data.error ?? 'Could not complete signup. Please try again.',
        );
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
  }, [pendingClaim, initials, fetchShifts]);

  // ── 30-second polling while screen is active ──────────────────────────────
  useEffect(() => {
    fetchShifts(false);

    pollTimerRef.current = setInterval(() => {
      fetchShifts(true);
    }, POLL_INTERVAL);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchShifts]);

  // ── Render helpers ────────────────────────────────────────────────────────
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
        onPress={() => handleShiftPress(section.title, item)}
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

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <>
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
            scrollEnabled={false}
          />
        )}
      </ParallaxScrollView>

      {/* ── Initials Modal ────────────────────────────────────────────────── */}
      <Modal
        visible={pendingClaim !== null}
        transparent
        animationType='fade'
        onRequestClose={() => setPendingClaim(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            {/* Shift summary */}
            <Text style={styles.modalTitle}>Sign Up for Shift</Text>
            {pendingClaim && (
              <View style={styles.modalShiftInfo}>
                <Text style={styles.modalShiftDate}>{pendingClaim.date}</Text>
                <Text style={styles.modalShiftTime}>
                  {pendingClaim.item.time}
                </Text>
                <Text style={styles.modalShiftDesc}>
                  {pendingClaim.item.description}
                </Text>
              </View>
            )}

            {/* Agreements */}
            <View style={styles.agreementBox}>
              <Text style={styles.agreementText}>
                By entering your initials you agree to:{'\n\n'}• Meet all shift
                requirements{'\n'}• Arrive at shift start time (5 min early if
                possible){'\n'}• Cancel by 8pm the night before if needed
              </Text>
            </View>

            {/* Initials input */}
            <Text style={styles.initialsLabel}>Enter your initials</Text>
            <TextInput
              style={[
                styles.initialsInput,
                initialsError ? styles.initialsInputError : null,
              ]}
              value={initials}
              onChangeText={(text) => {
                setInitials(text);
                setInitialsError('');
              }}
              placeholder='e.g. TG'
              autoCapitalize='characters'
              autoCorrect={false}
              maxLength={3}
              autoFocus
            />
            {initialsError ? (
              <Text style={styles.errorText}>{initialsError}</Text>
            ) : null}

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setPendingClaim(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !initials.trim() && styles.confirmButtonDisabled,
                ]}
                onPress={handleInitialsSubmit}
                disabled={!initials.trim()}
              >
                <Text style={styles.confirmButtonText}>Confirm Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
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

  // ── Modal ──────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalShiftInfo: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  modalShiftDate: {
    fontSize: 13,
    color: '#888',
    marginBottom: 2,
  },
  modalShiftTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 2,
  },
  modalShiftDesc: {
    fontSize: 14,
    color: '#555',
  },
  agreementBox: {
    backgroundColor: '#fffbea',
    borderLeftWidth: 3,
    borderLeftColor: '#f5a623',
    borderRadius: 6,
    padding: 12,
    marginBottom: 20,
  },
  agreementText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
  initialsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  initialsInput: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 6,
    color: '#111',
    marginBottom: 6,
  },
  initialsInputError: {
    borderColor: '#e53935',
  },
  errorText: {
    fontSize: 12,
    color: '#e53935',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    color: '#555',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#b0d0ff',
  },
  confirmButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
  },
});
