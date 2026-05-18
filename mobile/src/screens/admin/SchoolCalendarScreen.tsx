import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/theme/colors';
import {
  calendarApi,
  CalendarEventDto,
  classApi,
  ClassDto,
  MealPlanDto,
  RoutineReminderDto,
} from '@/api/client';
import {
  FIXTURE_CALENDAR_EVENTS,
  FIXTURE_MEAL_PLANS,
  FIXTURE_ROUTINES,
} from '@/mocks/calendarFixtures';
import { FIXTURE_TEACHER_CLASS } from '@/mocks/teacherFixtures';

type ModalKind = 'routine' | 'event' | 'meal' | null;

interface RoutineFormState {
  id?: string;
  classId: string;
  title: string;
  itemName: string;
  messageTemplate: string;
  weekday: number;
  sendAtHour: string;
  sendAtMinute: string;
  isActive: boolean;
}

interface EventFormState {
  id?: string;
  classId: string;
  title: string;
  description: string;
  type: CalendarEventDto['type'];
  category: string;
  date: string;
  time: string;
  isAllDay: boolean;
  isActive: boolean;
}

interface MealFormState {
  id?: string;
  classId: string;
  date: string;
  breakfast: string;
  lunch: string;
  snack: string;
  notes: string;
  allergens: string;
}

const weekdayOptions = [
  { value: 1, label: 'Pzt' },
  { value: 2, label: 'Sal' },
  { value: 3, label: 'Car' },
  { value: 4, label: 'Per' },
  { value: 5, label: 'Cum' },
  { value: 6, label: 'Cmt' },
  { value: 0, label: 'Paz' },
];

const eventTypes: CalendarEventDto['type'][] = ['activity', 'trip', 'meeting', 'reminder', 'other'];

function formatMonth(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
}

function weekdayLabel(value: number) {
  return weekdayOptions.find((option) => option.value === value)?.label ?? 'Gun';
}

function buildEventIso(date: string, time: string) {
  const resolvedTime = time?.trim() || '09:00';
  return new Date(`${date}T${resolvedTime}:00`).toISOString();
}

const EMPTY_ROUTINE = (classId: string): RoutineFormState => ({
  classId,
  title: '',
  itemName: '',
  messageTemplate: '',
  weekday: 1,
  sendAtHour: '20',
  sendAtMinute: '00',
  isActive: true,
});

const EMPTY_EVENT = (classId: string): EventFormState => ({
  classId,
  title: '',
  description: '',
  type: 'activity',
  category: '',
  date: new Date().toISOString().slice(0, 10),
  time: '09:30',
  isAllDay: false,
  isActive: true,
});

const EMPTY_MEAL = (classId: string): MealFormState => ({
  classId,
  date: new Date().toISOString().slice(0, 10),
  breakfast: '',
  lunch: '',
  snack: '',
  notes: '',
  allergens: '',
});

export default function SchoolCalendarScreen() {
  const [classes, setClasses] = useState<ClassDto[]>([FIXTURE_TEACHER_CLASS]);
  const [routines, setRoutines] = useState<RoutineReminderDto[]>([]);
  const [events, setEvents] = useState<CalendarEventDto[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalKind>(null);
  const [routineForm, setRoutineForm] = useState<RoutineFormState>(EMPTY_ROUTINE(FIXTURE_TEACHER_CLASS.id));
  const [eventForm, setEventForm] = useState<EventFormState>(EMPTY_EVENT(FIXTURE_TEACHER_CLASS.id));
  const [mealForm, setMealForm] = useState<MealFormState>(EMPTY_MEAL(FIXTURE_TEACHER_CLASS.id));

  const activeMonth = useMemo(() => formatMonth(), []);
  const defaultClassId = classes[0]?.id ?? FIXTURE_TEACHER_CLASS.id;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [classRes, routineRes, eventRes, mealRes] = await Promise.all([
        classApi.list(),
        calendarApi.routines(),
        calendarApi.events(),
        calendarApi.mealPlans({ month: activeMonth }),
      ]);

      setClasses(classRes.data.length > 0 ? classRes.data : [FIXTURE_TEACHER_CLASS]);
      setRoutines(routineRes.data);
      setEvents(eventRes.data);
      setMealPlans(mealRes.data);
    } catch {
      setClasses([FIXTURE_TEACHER_CLASS]);
      setRoutines(FIXTURE_ROUTINES);
      setEvents(FIXTURE_CALENDAR_EVENTS);
      setMealPlans(FIXTURE_MEAL_PLANS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!routineForm.classId && defaultClassId) {
      setRoutineForm(EMPTY_ROUTINE(defaultClassId));
    }
    if (!eventForm.classId && defaultClassId) {
      setEventForm(EMPTY_EVENT(defaultClassId));
    }
    if (!mealForm.classId && defaultClassId) {
      setMealForm(EMPTY_MEAL(defaultClassId));
    }
  }, [defaultClassId]);

  const openAdd = (kind: Exclude<ModalKind, null>) => {
    setActiveModal(kind);
    if (kind === 'routine') setRoutineForm(EMPTY_ROUTINE(defaultClassId));
    if (kind === 'event') setEventForm(EMPTY_EVENT(defaultClassId));
    if (kind === 'meal') setMealForm(EMPTY_MEAL(defaultClassId));
  };

  const openEditRoutine = (item: RoutineReminderDto) => {
    setRoutineForm({
      id: item.id,
      classId: item.classId,
      title: item.title,
      itemName: item.itemName ?? '',
      messageTemplate: item.messageTemplate ?? '',
      weekday: item.weekday,
      sendAtHour: String(item.sendAtHour),
      sendAtMinute: String(item.sendAtMinute).padStart(2, '0'),
      isActive: item.isActive,
    });
    setActiveModal('routine');
  };

  const openEditEvent = (item: CalendarEventDto) => {
    const start = new Date(item.startAt);
    setEventForm({
      id: item.id,
      classId: item.classId ?? '',
      title: item.title,
      description: item.description ?? '',
      type: item.type,
      category: item.category ?? '',
      date: item.startAt.slice(0, 10),
      time: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
      isAllDay: item.isAllDay,
      isActive: item.isActive,
    });
    setActiveModal('event');
  };

  const openEditMeal = (item: MealPlanDto) => {
    setMealForm({
      id: item.id,
      classId: item.classId ?? '',
      date: item.date,
      breakfast: item.breakfast ?? '',
      lunch: item.lunch ?? '',
      snack: item.snack ?? '',
      notes: item.notes ?? '',
      allergens: item.allergens ?? '',
    });
    setActiveModal('meal');
  };

  const closeModal = () => setActiveModal(null);

  const saveRoutine = async () => {
    if (!routineForm.classId || !routineForm.title.trim()) {
      Alert.alert('Eksik Bilgi', 'Sinif ve rutin basligi zorunludur.');
      return;
    }

    const payload = {
      classId: routineForm.classId,
      title: routineForm.title.trim(),
      itemName: routineForm.itemName.trim() || undefined,
      messageTemplate: routineForm.messageTemplate.trim() || undefined,
      weekday: routineForm.weekday,
      sendAtHour: Number(routineForm.sendAtHour) || 20,
      sendAtMinute: Number(routineForm.sendAtMinute) || 0,
      isActive: routineForm.isActive,
    };

    setSaving(true);
    try {
      if (routineForm.id) {
        await calendarApi.updateRoutine(routineForm.id, payload);
      } else {
        await calendarApi.createRoutine(payload);
      }
      await loadData();
      closeModal();
    } catch {
      const className = classes.find((item) => item.id === routineForm.classId)?.name ?? FIXTURE_TEACHER_CLASS.name;
      const optimistic: RoutineReminderDto = {
        id: routineForm.id ?? `routine-${Date.now()}`,
        classId: routineForm.classId,
        className,
        title: routineForm.title.trim(),
        itemName: routineForm.itemName.trim() || undefined,
        messageTemplate: routineForm.messageTemplate.trim() || undefined,
        weekday: routineForm.weekday,
        sendAtHour: Number(routineForm.sendAtHour) || 20,
        sendAtMinute: Number(routineForm.sendAtMinute) || 0,
        isActive: routineForm.isActive,
        createdAt: new Date().toISOString(),
      };

      setRoutines((prev) =>
        routineForm.id ? prev.map((item) => (item.id === routineForm.id ? optimistic : item)) : [optimistic, ...prev],
      );
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const saveEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.date) {
      Alert.alert('Eksik Bilgi', 'Etkinlik basligi ve tarih zorunludur.');
      return;
    }

    const payload = {
      classId: eventForm.classId || undefined,
      title: eventForm.title.trim(),
      description: eventForm.description.trim() || undefined,
      type: eventForm.type,
      category: eventForm.category.trim() || undefined,
      startAt: buildEventIso(eventForm.date, eventForm.time),
      endAt: undefined,
      isAllDay: eventForm.isAllDay,
      isActive: eventForm.isActive,
    };

    setSaving(true);
    try {
      if (eventForm.id) {
        await calendarApi.updateEvent(eventForm.id, payload);
      } else {
        await calendarApi.createEvent(payload);
      }
      await loadData();
      closeModal();
    } catch {
      const className = classes.find((item) => item.id === eventForm.classId)?.name;
      const optimistic: CalendarEventDto = {
        id: eventForm.id ?? `event-${Date.now()}`,
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || undefined,
        type: eventForm.type,
        category: eventForm.category.trim() || undefined,
        classId: eventForm.classId || undefined,
        className,
        startAt: buildEventIso(eventForm.date, eventForm.time),
        endAt: undefined,
        isAllDay: eventForm.isAllDay,
        isActive: eventForm.isActive,
        createdAt: new Date().toISOString(),
      };

      setEvents((prev) =>
        eventForm.id ? prev.map((item) => (item.id === eventForm.id ? optimistic : item)) : [optimistic, ...prev],
      );
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const saveMeal = async () => {
    if (!mealForm.date) {
      Alert.alert('Eksik Bilgi', 'Yemek plani icin tarih gerekli.');
      return;
    }

    const payload = {
      classId: mealForm.classId || undefined,
      date: mealForm.date,
      breakfast: mealForm.breakfast.trim() || undefined,
      lunch: mealForm.lunch.trim() || undefined,
      snack: mealForm.snack.trim() || undefined,
      notes: mealForm.notes.trim() || undefined,
      allergens: mealForm.allergens.trim() || undefined,
    };

    setSaving(true);
    try {
      if (mealForm.id) {
        await calendarApi.updateMealPlan(mealForm.id, payload);
      } else {
        await calendarApi.createMealPlan(payload);
      }
      await loadData();
      closeModal();
    } catch {
      const className = classes.find((item) => item.id === mealForm.classId)?.name;
      const optimistic: MealPlanDto = {
        id: mealForm.id ?? `meal-${Date.now()}`,
        classId: mealForm.classId || undefined,
        className,
        date: mealForm.date,
        breakfast: mealForm.breakfast.trim() || undefined,
        lunch: mealForm.lunch.trim() || undefined,
        snack: mealForm.snack.trim() || undefined,
        notes: mealForm.notes.trim() || undefined,
        allergens: mealForm.allergens.trim() || undefined,
      };

      setMealPlans((prev) =>
        mealForm.id ? prev.map((item) => (item.id === mealForm.id ? optimistic : item)) : [optimistic, ...prev],
      );
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (kind: Exclude<ModalKind, null>, id: string) => {
    try {
      if (kind === 'routine') {
        await calendarApi.deleteRoutine(id);
        setRoutines((prev) => prev.filter((item) => item.id !== id));
      }
      if (kind === 'event') {
        await calendarApi.deleteEvent(id);
        setEvents((prev) => prev.filter((item) => item.id !== id));
      }
      if (kind === 'meal') {
        await calendarApi.deleteMealPlan(id);
        setMealPlans((prev) => prev.filter((item) => item.id !== id));
      }
    } catch {
      if (kind === 'routine') setRoutines((prev) => prev.filter((item) => item.id !== id));
      if (kind === 'event') setEvents((prev) => prev.filter((item) => item.id !== id));
      if (kind === 'meal') setMealPlans((prev) => prev.filter((item) => item.id !== id));
    }
  };

  return (
    <SafeAreaView testID="screen-admin-calendar" style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Takvim ve Hatırlatmalar</Text>
          <Text style={styles.headerSubtitle}>
            Sinif rutinleri, etkinlikler ve aylik yemek planini buradan yonet.
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.PRIMARY} style={styles.loader} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{routines.filter((item) => item.isActive).length}</Text>
              <Text style={styles.summaryLabel}>Aktif rutin</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{events.length}</Text>
              <Text style={styles.summaryLabel}>Planli etkinlik</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{mealPlans.length}</Text>
              <Text style={styles.summaryLabel}>Bu ay menu</Text>
            </View>
          </View>

          <SectionHeader title="Sinif Rutinleri" actionLabel="Rutin Ekle" onPress={() => openAdd('routine')} />
          {routines.length === 0 ? (
            <EmptyCard icon="repeat-outline" title="Henuz rutin yok" body="Oyuncak gunu, kitap gunu ve benzeri kurallari buraya ekleyebilirsin." />
          ) : (
            routines.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardMeta}>{item.className} · {weekdayLabel(item.weekday)}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => openEditRoutine(item)} style={styles.iconBtn}>
                      <Ionicons name="create-outline" size={18} color={Colors.PRIMARY} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteItem('routine', item.id)} style={styles.iconBtn}>
                      <Ionicons name="trash-outline" size={18} color={Colors.ERROR} />
                    </TouchableOpacity>
                  </View>
                </View>
                {item.itemName ? <Text style={styles.cardBody}>Beklenen: {item.itemName}</Text> : null}
                <Text style={styles.cardHint}>
                  Hatirlatma {String(item.sendAtHour).padStart(2, '0')}:{String(item.sendAtMinute).padStart(2, '0')}
                </Text>
              </View>
            ))
          )}

          <SectionHeader title="Ders ve Etkinlikler" actionLabel="Etkinlik Ekle" onPress={() => openAdd('event')} />
          {events.length === 0 ? (
            <EmptyCard icon="calendar-outline" title="Henuz etkinlik yok" body="Ingilizce, bale, satranc ya da 23 Nisan gibi etkinlikleri planlayabilirsin." />
          ) : (
            events.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardMeta}>{item.className ?? 'Okul geneli'} · {formatDate(item.startAt)}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => openEditEvent(item)} style={styles.iconBtn}>
                      <Ionicons name="create-outline" size={18} color={Colors.PRIMARY} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteItem('event', item.id)} style={styles.iconBtn}>
                      <Ionicons name="trash-outline" size={18} color={Colors.ERROR} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.typeChip}>
                  <Text style={styles.typeChipText}>{item.type === 'lesson' ? 'Ders' : 'Etkinlik'}</Text>
                </View>
                {item.description ? <Text style={styles.cardBody}>{item.description}</Text> : null}
              </View>
            ))
          )}

          <SectionHeader title="Aylik Yemek Plani" actionLabel="Menu Ekle" onPress={() => openAdd('meal')} />
          {mealPlans.length === 0 ? (
            <EmptyCard icon="restaurant-outline" title="Henuz menu yok" body="Sinif ya da okul geneli menu takvimini bu bolumden girebilirsin." />
          ) : (
            mealPlans.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{formatDate(item.date)}</Text>
                    <Text style={styles.cardMeta}>{item.className ?? 'Okul geneli menusu'}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => openEditMeal(item)} style={styles.iconBtn}>
                      <Ionicons name="create-outline" size={18} color={Colors.PRIMARY} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteItem('meal', item.id)} style={styles.iconBtn}>
                      <Ionicons name="trash-outline" size={18} color={Colors.ERROR} />
                    </TouchableOpacity>
                  </View>
                </View>
                {item.breakfast ? <Text style={styles.cardBody}>Kahvalti: {item.breakfast}</Text> : null}
                {item.lunch ? <Text style={styles.cardBody}>Ogle: {item.lunch}</Text> : null}
                {item.snack ? <Text style={styles.cardBody}>Ara Ogun: {item.snack}</Text> : null}
              </View>
            ))
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      <Modal visible={activeModal !== null} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeModal} activeOpacity={1} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeModal === 'routine' ? 'Sinif Rutini' : activeModal === 'event' ? 'Etkinlik Planla' : 'Yemek Plani'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={22} color={Colors.TEXT} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {activeModal === 'routine' ? (
                <View style={styles.formStack}>
                  <Text style={styles.label}>Sinif</Text>
                  <ClassPicker value={routineForm.classId} classes={classes} onChange={(value) => setRoutineForm((prev) => ({ ...prev, classId: value }))} />

                  <Text style={styles.label}>Rutin Basligi</Text>
                  <TextInput style={styles.input} value={routineForm.title} onChangeText={(value) => setRoutineForm((prev) => ({ ...prev, title: value }))} placeholder="Orn. Kitap Gunu" placeholderTextColor={Colors.TEXT + '55'} />

                  <Text style={styles.label}>Getirilecek Esya</Text>
                  <TextInput style={styles.input} value={routineForm.itemName} onChangeText={(value) => setRoutineForm((prev) => ({ ...prev, itemName: value }))} placeholder="Orn. Bir hikaye kitabi" placeholderTextColor={Colors.TEXT + '55'} />

                  <Text style={styles.label}>Haftanin Gunu</Text>
                  <View style={styles.optionRow}>
                    {weekdayOptions.map((option) => (
                      <TouchableOpacity key={option.value} style={[styles.optionChip, routineForm.weekday === option.value && styles.optionChipActive]} onPress={() => setRoutineForm((prev) => ({ ...prev, weekday: option.value }))}>
                        <Text style={[styles.optionChipText, routineForm.weekday === option.value && styles.optionChipTextActive]}>{option.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Hatirlatma Metni</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    multiline
                    value={routineForm.messageTemplate}
                    onChangeText={(value) => setRoutineForm((prev) => ({ ...prev, messageTemplate: value }))}
                    placeholder="Yarin {studentName} icin {title} var..."
                    placeholderTextColor={Colors.TEXT + '55'}
                  />

                  <View style={styles.timeRow}>
                    <View style={styles.timeCol}>
                      <Text style={styles.label}>Saat</Text>
                      <TextInput style={styles.input} keyboardType="number-pad" value={routineForm.sendAtHour} onChangeText={(value) => setRoutineForm((prev) => ({ ...prev, sendAtHour: value }))} />
                    </View>
                    <View style={styles.timeCol}>
                      <Text style={styles.label}>Dakika</Text>
                      <TextInput style={styles.input} keyboardType="number-pad" value={routineForm.sendAtMinute} onChangeText={(value) => setRoutineForm((prev) => ({ ...prev, sendAtMinute: value }))} />
                    </View>
                  </View>

                  <TouchableOpacity style={styles.saveBtn} onPress={saveRoutine} disabled={saving}>
                    {saving ? <ActivityIndicator color={Colors.WHITE} /> : <Text style={styles.saveBtnText}>Kaydet</Text>}
                  </TouchableOpacity>
                </View>
              ) : null}

              {activeModal === 'event' ? (
                <View style={styles.formStack}>
                  <Text style={styles.label}>Sinif</Text>
                  <ClassPicker allowSchoolWide value={eventForm.classId} classes={classes} onChange={(value) => setEventForm((prev) => ({ ...prev, classId: value }))} />

                  <Text style={styles.label}>Baslik</Text>
                  <TextInput style={styles.input} value={eventForm.title} onChangeText={(value) => setEventForm((prev) => ({ ...prev, title: value }))} placeholder="Orn. 23 Nisan Kutlamasi" placeholderTextColor={Colors.TEXT + '55'} />

                  <Text style={styles.label}>Tur</Text>
                  <View style={styles.optionRow}>
                    {eventTypes.map((type) => (
                      <TouchableOpacity key={type} style={[styles.optionChip, eventForm.type === type && styles.optionChipActive]} onPress={() => setEventForm((prev) => ({ ...prev, type }))}>
                        <Text style={[styles.optionChipText, eventForm.type === type && styles.optionChipTextActive]}>
                          {type === 'lesson' ? 'Ders' : type === 'activity' ? 'Etkinlik' : 'Hatirlatma'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Kategori</Text>
                  <TextInput style={styles.input} value={eventForm.category} onChangeText={(value) => setEventForm((prev) => ({ ...prev, category: value }))} placeholder="Orn. muzik, kutlama, bale" placeholderTextColor={Colors.TEXT + '55'} />

                  <Text style={styles.label}>Tarih</Text>
                  <TextInput style={styles.input} value={eventForm.date} onChangeText={(value) => setEventForm((prev) => ({ ...prev, date: value }))} placeholder="2026-04-23" placeholderTextColor={Colors.TEXT + '55'} />

                  <Text style={styles.label}>Saat</Text>
                  <TextInput style={styles.input} value={eventForm.time} onChangeText={(value) => setEventForm((prev) => ({ ...prev, time: value }))} placeholder="09:30" placeholderTextColor={Colors.TEXT + '55'} />

                  <Text style={styles.label}>Aciklama</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    multiline
                    value={eventForm.description}
                    onChangeText={(value) => setEventForm((prev) => ({ ...prev, description: value }))}
                    placeholder="Velilerin gormesi gereken ozet bilgi"
                    placeholderTextColor={Colors.TEXT + '55'}
                  />

                  <TouchableOpacity style={styles.saveBtn} onPress={saveEvent} disabled={saving}>
                    {saving ? <ActivityIndicator color={Colors.WHITE} /> : <Text style={styles.saveBtnText}>Kaydet</Text>}
                  </TouchableOpacity>
                </View>
              ) : null}

              {activeModal === 'meal' ? (
                <View style={styles.formStack}>
                  <Text style={styles.label}>Sinif</Text>
                  <ClassPicker allowSchoolWide value={mealForm.classId} classes={classes} onChange={(value) => setMealForm((prev) => ({ ...prev, classId: value }))} />

                  <Text style={styles.label}>Tarih</Text>
                  <TextInput style={styles.input} value={mealForm.date} onChangeText={(value) => setMealForm((prev) => ({ ...prev, date: value }))} placeholder="2026-04-07" placeholderTextColor={Colors.TEXT + '55'} />

                  <Text style={styles.label}>Kahvalti</Text>
                  <TextInput style={styles.input} value={mealForm.breakfast} onChangeText={(value) => setMealForm((prev) => ({ ...prev, breakfast: value }))} placeholder="Orn. Peynir ve zeytin" placeholderTextColor={Colors.TEXT + '55'} />

                  <Text style={styles.label}>Ogle Yemegi</Text>
                  <TextInput style={styles.input} value={mealForm.lunch} onChangeText={(value) => setMealForm((prev) => ({ ...prev, lunch: value }))} placeholder="Orn. Tavuklu makarna" placeholderTextColor={Colors.TEXT + '55'} />

                  <Text style={styles.label}>Ara Ogun</Text>
                  <TextInput style={styles.input} value={mealForm.snack} onChangeText={(value) => setMealForm((prev) => ({ ...prev, snack: value }))} placeholder="Orn. Meyve tabagi" placeholderTextColor={Colors.TEXT + '55'} />

                  <Text style={styles.label}>Alerjen</Text>
                  <TextInput style={styles.input} value={mealForm.allergens} onChangeText={(value) => setMealForm((prev) => ({ ...prev, allergens: value }))} placeholder="Orn. Sut urunu" placeholderTextColor={Colors.TEXT + '55'} />

                  <Text style={styles.label}>Not</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    multiline
                    value={mealForm.notes}
                    onChangeText={(value) => setMealForm((prev) => ({ ...prev, notes: value }))}
                    placeholder="Ek aciklama"
                    placeholderTextColor={Colors.TEXT + '55'}
                  />

                  <TouchableOpacity style={styles.saveBtn} onPress={saveMeal} disabled={saving}>
                    {saving ? <ActivityIndicator color={Colors.WHITE} /> : <Text style={styles.saveBtnText}>Kaydet</Text>}
                  </TouchableOpacity>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function SectionHeader({ title, actionLabel, onPress }: { title: string; actionLabel: string; onPress: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity onPress={onPress} style={styles.sectionAction}>
        <Ionicons name="add-circle-outline" size={16} color={Colors.PRIMARY} />
        <Text style={styles.sectionActionText}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyCard({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  return (
    <View style={styles.emptyCard}>
      <Ionicons name={icon} size={28} color={Colors.BORDER} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function ClassPicker({
  value,
  classes,
  onChange,
  allowSchoolWide = false,
}: {
  value: string;
  classes: ClassDto[];
  onChange: (value: string) => void;
  allowSchoolWide?: boolean;
}) {
  return (
    <View style={styles.optionRow}>
      {allowSchoolWide ? (
        <TouchableOpacity style={[styles.optionChip, !value && styles.optionChipActive]} onPress={() => onChange('')}>
          <Text style={[styles.optionChipText, !value && styles.optionChipTextActive]}>Okul geneli</Text>
        </TouchableOpacity>
      ) : null}
      {classes.map((item) => (
        <TouchableOpacity key={item.id} style={[styles.optionChip, value === item.id && styles.optionChipActive]} onPress={() => onChange(item.id)}>
          <Text style={[styles.optionChipText, value === item.id && styles.optionChipTextActive]}>{item.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.BACKGROUND },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: Colors.TEXT },
  headerSubtitle: { fontSize: 14, lineHeight: 21, color: Colors.TEXT_MUTED, marginTop: 8 },
  loader: { marginTop: 80 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.WHITE,
    borderRadius: 22,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryValue: { fontSize: 24, fontWeight: '800', color: Colors.TEXT },
  summaryLabel: { fontSize: 12, lineHeight: 17, color: Colors.TEXT_MUTED, marginTop: 6 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 10 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: Colors.TEXT },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionActionText: { fontSize: 13, fontWeight: '700', color: Colors.PRIMARY },
  card: {
    backgroundColor: Colors.WHITE,
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.TEXT },
  cardMeta: { fontSize: 12, color: Colors.TEXT_MUTED, marginTop: 5 },
  cardBody: { fontSize: 13, color: Colors.TEXT, lineHeight: 20, marginTop: 8 },
  cardHint: { fontSize: 12, color: Colors.PRIMARY, fontWeight: '700', marginTop: 10 },
  cardActions: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: Colors.BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChip: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: Colors.PRIMARY_LIGHT,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  typeChipText: { fontSize: 11, fontWeight: '800', color: Colors.PRIMARY },
  emptyCard: {
    backgroundColor: Colors.WHITE,
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: Colors.TEXT, marginTop: 10 },
  emptyBody: { fontSize: 13, lineHeight: 20, textAlign: 'center', color: Colors.TEXT_MUTED, marginTop: 6 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.24)',
  },
  modalSheet: {
    maxHeight: '88%',
    backgroundColor: Colors.WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 26,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.TEXT },
  formStack: { gap: 10, paddingBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.TEXT, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: Colors.BORDER,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.TEXT,
    backgroundColor: Colors.WHITE,
  },
  textArea: { minHeight: 96, textAlignVertical: 'top' as const },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    borderWidth: 1,
    borderColor: Colors.BORDER,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.WHITE,
  },
  optionChipActive: {
    borderColor: Colors.PRIMARY,
    backgroundColor: Colors.PRIMARY_LIGHT,
  },
  optionChipText: { fontSize: 12, fontWeight: '700', color: Colors.TEXT_MUTED },
  optionChipTextActive: { color: Colors.PRIMARY },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeCol: { flex: 1 },
  saveBtn: {
    height: 52,
    borderRadius: 18,
    backgroundColor: Colors.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveBtnText: { color: Colors.WHITE, fontSize: 15, fontWeight: '800' },
});
