import {
  Image,
  StyleSheet,
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
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset,
} from 'react-native-reanimated';
import { HelloWave } from '@/components/HelloWave';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useBottomTabOverflow } from '@/components/ui/TabBarBackground';

// ── Config ─────────────────────────────────────────────────────────────────
const BACKEND_URL = 'https://psfc-backend.fly.dev';
const POLL_INTERVAL = 30 * 1000;
const HEADER_HEIGHT = 250;

// ── Types ──────────────────────────────────────────────────────────────────
interface EventItem {
  time: string;
  description: string;
  href: string;
}

interface SectionData {
  title: string;
  data: EventItem[];
}

interface PendingClaim {
  date: string;
  item: EventItem;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [claimingKey, setClaimingKey] = useState<string | null>(null);
  const [pendingClaim, setPendingClaim] = useState<PendingClaim | null>(null);
  const [initials, setInitials] = useState('');
  const [initialsError, setInitialsError] = useState('');

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Parallax scroll tracking — Animated.ScrollView ref, no SectionList conflict
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);
  const bottom = useBottomTabOverflow();

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollOffset.value,
          [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
          [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75],
        ),
      },
      {
        scale: interpolate(
          scrollOffset.value,
          [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
          [2, 1, 1],
        ),
      },
    ],
  }));

  // ── Fetch shifts ──────────────────────────────────────────────────────────
  const fetchShifts = useCallback(async (isBackground = false) => {
    if (isBackground) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/shifts`);
      const json = (await res.json()) as Record<string, EventItem[]>;
      if (!res.ok) {
        console.error('Shifts error:', json);
        return;
      }
      setSections(
        Object.entries(json).map(([date, events]) => ({
          title: date,
          data: events,
        })),
      );
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch schedule:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Tap a shift → open initials modal ────────────────────────────────────
  const handleShiftPress = useCallback((date: string, item: EventItem) => {
    setInitials('');
    setInitialsError('');
    setPendingClaim({ date, item });
  }, []);

  // ── Submit initials → claim shift ─────────────────────────────────────────
  const handleInitialsSubmit = useCallback(async () => {
    if (!pendingClaim) return;

    const trimmed = initials.trim().toUpperCase();
    if (!/^[A-Z]{2,3}$/.test(trimmed)) {
      setInitialsError('Please enter 2–3 letters only (e.g. "TG" or "TJG")');
      return;
    }

    const { date, item } = pendingClaim;
    const shiftKey = `${date}|${item.time}|${item.description}`;
    setPendingClaim(null);
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
          username: 'REPLACE_WITH_LOGGED_IN_USERNAME',
        }),
      });

      const data = (await res.json()) as { message?: string; error?: string };

      if (res.ok) {
        // Optimistically remove the claimed shift from the list
        setSections((prev) =>
          prev
            .map((s) => ({
              ...s,
              data: s.data.filter(
                (e) =>
                  !(
                    s.title === date &&
                    e.time === item.time &&
                    e.description === item.description
                  ),
              ),
            }))
            .filter((s) => s.data.length > 0),
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
        fetchShifts(true);
      } else {
        Alert.alert(
          '❌ Error',
          data.error ?? 'Could not complete signup. Please try again.',
        );
        fetchShifts(true);
      }
    } catch {
      Alert.alert(
        '❌ Network Error',
        'Please check your connection and try again.',
      );
    } finally {
      setClaimingKey(null);
    }
  }, [pendingClaim, initials, fetchShifts]);

  // ── Polling ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchShifts(false);
    pollTimerRef.current = setInterval(() => fetchShifts(true), POLL_INTERVAL);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchShifts]);

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <ThemedView style={styles.container}>
      {/*
        Single Animated.ScrollView owns all scrolling.
        The parallax ref is typed correctly here — no SectionList conflict.
      */}
      <Animated.ScrollView
        ref={scrollRef}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottom + 40 },
        ]}
        scrollIndicatorInsets={{ bottom }}
      >
        {/* ── Parallax header ────────────────────────────────────────────── */}
        <View style={styles.headerContainer}>
          <Animated.View
            style={[styles.headerImageWrapper, headerAnimatedStyle]}
          >
            <Image
              source={require('@/assets/images/sugarsnappeas.png')}
              style={StyleSheet.absoluteFill}
              resizeMode='cover'
            />
            <View style={styles.headerOverlay} />
          </Animated.View>
          <Image
            source={require('@/assets/images/psfc-logo.png')}
            style={styles.coopLogo}
            resizeMode='contain'
          />
        </View>

        {/* ── Welcome + status ───────────────────────────────────────────── */}
        <ThemedView style={styles.welcomeRow}>
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

        {/* ── Shift list ─────────────────────────────────────────────────── */}
        {loading ? (
          <ActivityIndicator
            size='large'
            color='#888'
            style={{ marginTop: 40 }}
          />
        ) : sections.length === 0 ? (
          <Text style={styles.emptyText}>No shifts available right now.</Text>
        ) : (
          sections.map((section) => (
            <View key={section.title}>
              {/* Section header */}
              <Text style={styles.sectionHeader}>{section.title}</Text>

              {/* Shift cards */}
              {section.data.map((item, index) => {
                const shiftKey = `${section.title}|${item.time}|${item.description}`;
                const isClaiming = claimingKey === shiftKey;

                return (
                  <TouchableOpacity
                    key={`${item.time}-${index}`}
                    style={styles.card}
                    onPress={() => handleShiftPress(section.title, item)}
                    disabled={isClaiming}
                    activeOpacity={0.75}
                  >
                    <View style={styles.cardContent}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTime}>{item.time}</Text>
                        <Text style={styles.cardDescription}>
                          {item.description}
                        </Text>
                      </View>
                      {isClaiming ? (
                        <ActivityIndicator size='small' color='#007AFF' />
                      ) : (
                        <Text style={styles.signUpButton}>Sign Up →</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </Animated.ScrollView>

      {/* ── Initials Modal ──────────────────────────────────────────────────── */}
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

            <View style={styles.agreementBox}>
              <Text style={styles.agreementText}>
                By entering your initials you agree to:{'\n\n'}
                {'• '}Meet all shift requirements{'\n'}
                {'• '}Arrive at shift start time (5 min early if possible){'\n'}
                {'• '}Cancel by 8pm the night before if needed
              </Text>
            </View>

            <Text style={styles.initialsLabel}>Enter your initials</Text>
            <TextInput
              style={[
                styles.initialsInput,
                initialsError ? styles.initialsInputError : undefined,
              ]}
              value={initials}
              onChangeText={(t) => {
                setInitials(t);
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
                  !initials.trim() ? styles.confirmButtonDisabled : undefined,
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
    </ThemedView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // Header
  headerContainer: { height: HEADER_HEIGHT, overflow: 'hidden' },
  headerImageWrapper: { ...StyleSheet.absoluteFillObject },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(125,125,125,0.45)',
  },
  coopLogo: {
    position: 'absolute',
    width: 290,
    height: 178,
    top: '50%',
    left: '50%',
    transform: [{ translateX: -145 }, { translateY: -89 }],
  },

  // Welcome
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  lastUpdatedText: { fontSize: 12, color: '#999' },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#999',
    fontSize: 16,
  },

  // List
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
    color: '#333',
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  cardTime: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardDescription: { fontSize: 14, color: '#666' },
  signUpButton: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 8,
  },

  // Modal
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
  modalShiftDate: { fontSize: 13, color: '#888', marginBottom: 2 },
  modalShiftTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 2,
  },
  modalShiftDesc: { fontSize: 14, color: '#555' },
  agreementBox: {
    backgroundColor: '#fffbea',
    borderLeftWidth: 3,
    borderLeftColor: '#f5a623',
    borderRadius: 6,
    padding: 12,
    marginBottom: 20,
  },
  agreementText: { fontSize: 13, color: '#555', lineHeight: 20 },
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
  initialsInputError: { borderColor: '#e53935' },
  errorText: {
    fontSize: 12,
    color: '#e53935',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 15, color: '#555', fontWeight: '600' },
  confirmButton: {
    flex: 2,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  confirmButtonDisabled: { backgroundColor: '#b0d0ff' },
  confirmButtonText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});
