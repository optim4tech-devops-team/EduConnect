import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/theme/colors';
import { useAuthStore } from '@/store/authStore';
import {
  calendarApi,
  studentApi,
  type MealPlanDto,
  type ParentUpcomingReminderDto,
  type StudentDto,
} from '@/api/client';
import { FIXTURE_CHILD, isFixtureParentUser } from '@/mocks/parentFixtures';
import {
  FIXTURE_MEAL_PLANS,
  FIXTURE_PARENT_UPCOMING_REMINDERS,
} from '@/mocks/calendarFixtures';

function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function formatDateLabel(date: string) {
  try {
    return new Date(date).toLocaleDateString('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return date;
  }
}

export default function ParentCalendarScreen() {
  const { user } = useAuthStore();
  const [child, setChild] = useState<StudentDto | null>(null);
  const [reminders, setReminders] = useState<ParentUpcomingReminderDto[]>([]);
  const [meals, setMeals] = useState<MealPlanDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const childRes = await studentApi.myChildren();
      const childList = ensureArray(childRes.data);
      const resolvedChild = childList[0] ?? (isFixtureParentUser(user) ? FIXTURE_CHILD : null);
      setChild(resolvedChild);

      if (!resolvedChild) {
        setReminders([]);
        setMeals([]);
        return;
      }

      const [reminderRes, mealRes] = await Promise.all([
        calendarApi.parentUpcomingReminders(7, resolvedChild.classId),
        calendarApi.mealPlans({
          month: new Date().toISOString().slice(0, 7),
          classId: resolvedChild.classId,
        }),
      ]);
      const upcomingReminders = ensureArray(reminderRes.data);
      const mealPlans = ensureArray(mealRes.data);
      const fallbackReminders = isFixtureParentUser(user) ? FIXTURE_PARENT_UPCOMING_REMINDERS : [];
      const fallbackMeals = isFixtureParentUser(user) ? FIXTURE_MEAL_PLANS : [];

      setReminders(
        upcomingReminders.length > 0 ? upcomingReminders : fallbackReminders,
      );
      setMeals(
        mealPlans.length > 0 ? mealPlans : fallbackMeals,
      );
    } catch {
      if (isFixtureParentUser(user)) {
        setChild(FIXTURE_CHILD);
        setReminders(FIXTURE_PARENT_UPCOMING_REMINDERS);
        setMeals(FIXTURE_MEAL_PLANS);
      } else {
        setReminders([]);
        setMeals([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const safeReminders = ensureArray(reminders);
  const safeMeals = ensureArray(meals);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Takvim ve Hatırlatmalar</Text>
        <Text style={styles.headerSubtitle}>
          {child ? `${child.name.split(' ')[0]} için yaklaşan rutinleri, etkinlikleri ve yemek planını buradan görebilirsiniz.` : 'Yaklaşan sınıf notları burada görünür.'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.PRIMARY} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yaklaşan Hatırlatmalar</Text>
            {safeReminders.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="notifications-off-outline" size={22} color={Colors.TEXT_MUTED} />
                <Text style={styles.emptyText}>Şimdilik yaklaşan bir hatırlatma görünmüyor.</Text>
              </View>
            ) : (
              safeReminders.map((reminder) => (
                <View key={reminder.id} style={styles.reminderCard}>
                  <View style={styles.reminderIcon}>
                    <Ionicons
                      name={reminder.kind === 'routine' ? 'alarm-outline' : 'sparkles-outline'}
                      size={18}
                      color={Colors.PRIMARY}
                    />
                  </View>
                  <View style={styles.reminderCopy}>
                    <Text style={styles.reminderDate}>{formatDateLabel(reminder.targetDate)}</Text>
                    <Text style={styles.reminderTitle}>{reminder.title}</Text>
                    <Text style={styles.reminderBody}>{reminder.body}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bu Ayın Yemek Planı</Text>
            {safeMeals.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="restaurant-outline" size={22} color={Colors.TEXT_MUTED} />
                <Text style={styles.emptyText}>Henüz paylaşılmış bir yemek planı yok.</Text>
              </View>
            ) : (
              safeMeals.map((meal) => (
                <View key={meal.id} style={styles.mealCard}>
                  <Text style={styles.mealDate}>{formatDateLabel(meal.date)}</Text>
                  {meal.breakfast ? <Text style={styles.mealLine}>Kahvaltı: {meal.breakfast}</Text> : null}
                  {meal.lunch ? <Text style={styles.mealLine}>Öğle: {meal.lunch}</Text> : null}
                  {meal.snack ? <Text style={styles.mealLine}>Atıştırmalık: {meal.snack}</Text> : null}
                  {meal.notes ? <Text style={styles.mealNote}>{meal.notes}</Text> : null}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 12,
  },
  headerTitle: {
    color: Colors.TEXT,
    fontSize: 26,
    fontWeight: '800',
  },
  headerSubtitle: {
    marginTop: 8,
    color: Colors.TEXT_MUTED,
    fontSize: 14,
    lineHeight: 21,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    color: Colors.TEXT,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: Colors.WHITE,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  emptyText: {
    flex: 1,
    color: Colors.TEXT_MUTED,
    fontSize: 14,
    lineHeight: 20,
  },
  reminderCard: {
    backgroundColor: Colors.WHITE,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  reminderIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.INFO_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderCopy: {
    flex: 1,
  },
  reminderDate: {
    color: Colors.PRIMARY,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  reminderTitle: {
    marginTop: 4,
    color: Colors.TEXT,
    fontSize: 16,
    fontWeight: '800',
  },
  reminderBody: {
    marginTop: 6,
    color: Colors.TEXT_MUTED,
    fontSize: 14,
    lineHeight: 20,
  },
  mealCard: {
    backgroundColor: Colors.WHITE,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    marginBottom: 10,
  },
  mealDate: {
    color: Colors.TEXT,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  mealLine: {
    color: Colors.TEXT_MUTED,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  mealNote: {
    marginTop: 10,
    color: Colors.PRIMARY,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
});
