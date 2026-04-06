import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../theme/colors';
import { studentApi, dailyReportApi, DailyReportDto, StudentDto } from '../../api/client';

const MOODS: Record<string, { emoji: string; label: string; color: string }> = {
  Happy: { emoji: '😊', label: 'Mutlu', color: Colors.ACCENT },
  Neutral: { emoji: '😐', label: 'Normal', color: Colors.SECONDARY },
  Sad: { emoji: '😢', label: 'Üzgün', color: Colors.INFO },
};

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function buildDates(count = 14): Date[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (count - 1 - i));
    return d;
  });
}

export default function DailyReportViewScreen() {
  const [child, setChild] = useState<StudentDto | null>(null);
  const [dates] = useState(() => buildDates(14));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [report, setReport] = useState<DailyReportDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadChild();
  }, []);

  useEffect(() => {
    if (child) {
      loadReport(child.id, formatDate(selectedDate));
    }
  }, [child, selectedDate]);

  const loadChild = async () => {
    try {
      const { data } = await studentApi.myChildren();
      setChild(data[0] ?? null);
    } catch {
      setIsLoading(false);
    }
  };

  const loadReport = async (studentId: string, date: string) => {
    try {
      setIsLoading(true);
      const { data } = await dailyReportApi.list(studentId, date);
      setReport(data[0] ?? null);
    } catch {
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  };

  const todayStr = formatDate(new Date());

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />
      <View style={styles.header}>
        <Text style={styles.title}>Günlük Rapor</Text>
        {child && <Text style={styles.subtitle}>{child.name}</Text>}
      </View>

      {/* Date strip */}
      <FlatList
        horizontal
        data={dates}
        keyExtractor={(d) => formatDate(d)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateStrip}
        renderItem={({ item }) => {
          const dateStr = formatDate(item);
          const isSelected = formatDate(selectedDate) === dateStr;
          const isToday = dateStr === todayStr;
          return (
            <TouchableOpacity
              style={[styles.datePill, isSelected && styles.datePillActive]}
              onPress={() => setSelectedDate(item)}
              activeOpacity={0.75}
            >
              <Text style={[styles.dateDay, isSelected && styles.dateDayActive]}>
                {item.toLocaleDateString('tr-TR', { weekday: 'short' }).toUpperCase()}
              </Text>
              <Text style={[styles.dateNum, isSelected && styles.dateNumActive]}>
                {item.getDate()}
              </Text>
              {isToday && <View style={[styles.todayDot, isSelected && { backgroundColor: Colors.WHITE }]} />}
            </TouchableOpacity>
          );
        }}
      />

      {isLoading ? (
        <ActivityIndicator color={Colors.PRIMARY} style={{ marginTop: 40 }} />
      ) : !report ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>Bu tarih için rapor yok</Text>
          <Text style={styles.emptySubtitle}>Öğretmen henüz rapor girmedi</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Mood */}
          <View style={styles.reportCard}>
            <View style={styles.reportRow}>
              <View style={styles.reportIconBox}>
                <Ionicons name="happy-outline" size={22} color={Colors.PRIMARY} />
              </View>
              <View style={styles.reportContent}>
                <Text style={styles.reportLabel}>Ruh Hali</Text>
                <View style={styles.moodRow}>
                  <Text style={styles.moodEmoji}>{MOODS[report.mood]?.emoji ?? '😊'}</Text>
                  <Text style={[styles.moodText, { color: MOODS[report.mood]?.color }]}>
                    {MOODS[report.mood]?.label ?? report.mood}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Meals */}
          {report.meals && (
            <View style={styles.reportCard}>
              <View style={styles.reportRow}>
                <View style={styles.reportIconBox}>
                  <Ionicons name="restaurant-outline" size={22} color={Colors.SECONDARY} />
                </View>
                <View style={styles.reportContent}>
                  <Text style={styles.reportLabel}>Yemek</Text>
                  <Text style={styles.reportValue}>{report.meals}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Sleep */}
          {report.sleepMinutes !== undefined && report.sleepMinutes !== null && (
            <View style={styles.reportCard}>
              <View style={styles.reportRow}>
                <View style={styles.reportIconBox}>
                  <Ionicons name="moon-outline" size={22} color={Colors.INFO} />
                </View>
                <View style={styles.reportContent}>
                  <Text style={styles.reportLabel}>Uyku</Text>
                  <Text style={styles.reportValue}>
                    {report.sleepMinutes >= 60
                      ? `${Math.floor(report.sleepMinutes / 60)} saat ${report.sleepMinutes % 60 > 0 ? `${report.sleepMinutes % 60} dakika` : ''}`
                      : `${report.sleepMinutes} dakika`}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Activities */}
          {report.activities && report.activities.length > 0 && (
            <View style={styles.reportCard}>
              <View style={styles.reportRow}>
                <View style={styles.reportIconBox}>
                  <Ionicons name="color-palette-outline" size={22} color={Colors.ACCENT} />
                </View>
                <View style={styles.reportContent}>
                  <Text style={styles.reportLabel}>Aktiviteler</Text>
                  <View style={styles.chipsRow}>
                    {report.activities.map((activity, i) => (
                      <View key={i} style={styles.chip}>
                        <Text style={styles.chipText}>{activity}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Notes */}
          {report.notes && (
            <View style={styles.reportCard}>
              <View style={styles.reportRow}>
                <View style={styles.reportIconBox}>
                  <Ionicons name="chatbubble-outline" size={22} color={Colors.PRIMARY} />
                </View>
                <View style={styles.reportContent}>
                  <Text style={styles.reportLabel}>Öğretmen Notu</Text>
                  <Text style={styles.reportNote}>{report.notes}</Text>
                </View>
              </View>
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.TEXT },
  subtitle: { fontSize: 14, color: Colors.TEXT, opacity: 0.55, marginTop: 2 },
  dateStrip: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  datePill: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: Colors.WHITE,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    minWidth: 52,
  },
  datePillActive: {
    backgroundColor: Colors.PRIMARY,
    borderColor: Colors.PRIMARY,
  },
  dateDay: { fontSize: 10, fontWeight: '600', color: Colors.TEXT, opacity: 0.5, marginBottom: 2 },
  dateDayActive: { color: Colors.WHITE, opacity: 0.8 },
  dateNum: { fontSize: 16, fontWeight: '700', color: Colors.TEXT },
  dateNumActive: { color: Colors.WHITE },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.PRIMARY, marginTop: 3 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.TEXT, opacity: 0.6 },
  emptySubtitle: { fontSize: 14, color: Colors.TEXT, opacity: 0.4 },
  scroll: { padding: 20 },
  reportCard: {
    backgroundColor: Colors.WHITE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  reportRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  reportIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportContent: { flex: 1 },
  reportLabel: { fontSize: 12, fontWeight: '600', color: Colors.TEXT, opacity: 0.5, marginBottom: 6 },
  reportValue: { fontSize: 15, color: Colors.TEXT, fontWeight: '500' },
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moodEmoji: { fontSize: 28 },
  moodText: { fontSize: 16, fontWeight: '700' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: Colors.ACCENT + '22',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  chipText: { fontSize: 13, color: Colors.ACCENT, fontWeight: '600' },
  reportNote: { fontSize: 14, color: Colors.TEXT, lineHeight: 20 },
});
