import type {
  CalendarEventDto,
  MealPlanDto,
  ParentUpcomingReminderDto,
  RoutineReminderDto,
} from '@/api/client';
import { FIXTURE_CHILD } from './parentFixtures';
import { FIXTURE_TEACHER_CLASS } from './teacherFixtures';

const now = new Date();
const tomorrow = new Date(now);
tomorrow.setDate(now.getDate() + 1);
tomorrow.setHours(9, 30, 0, 0);

const nextSchoolDay = new Date(now);
nextSchoolDay.setDate(now.getDate() + 2);
nextSchoolDay.setHours(10, 0, 0, 0);

const twoDaysAgo = new Date(now);
twoDaysAgo.setDate(now.getDate() - 2);
twoDaysAgo.setHours(11, 0, 0, 0);

const formatDateOnly = (date: Date) => date.toISOString().slice(0, 10);

export const FIXTURE_ROUTINES: RoutineReminderDto[] = [
  {
    id: 'routine-puzzle',
    classId: FIXTURE_TEACHER_CLASS.id,
    className: FIXTURE_TEACHER_CLASS.name,
    title: 'Puzzle Günü',
    itemName: 'Küçük bir puzzle',
    messageTemplate:
      'Yarin {studentName} icin {title} var. Siz unutmazsiniz ama biz yine de hatirlatmak istedik. {itemName} getirmesini bekliyoruz.',
    weekday: tomorrow.getDay(),
    sendAtHour: 20,
    sendAtMinute: 0,
    isActive: true,
    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10).toISOString(),
  },
  {
    id: 'routine-kitap',
    classId: FIXTURE_TEACHER_CLASS.id,
    className: FIXTURE_TEACHER_CLASS.name,
    title: 'Kitap Günü',
    itemName: 'Bir hikaye kitabi',
    messageTemplate:
      'Yarin {studentName} icin {title} var. Siz unutmazsiniz ama biz yine de hatirlatmak istedik. {itemName} getirmesini bekliyoruz.',
    weekday: nextSchoolDay.getDay(),
    sendAtHour: 20,
    sendAtMinute: 0,
    isActive: true,
    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 8).toISOString(),
  },
  {
    id: 'routine-oyuncak',
    classId: FIXTURE_TEACHER_CLASS.id,
    className: FIXTURE_TEACHER_CLASS.name,
    title: 'Oyuncak Günü',
    itemName: 'Kucuk bir oyuncak',
    messageTemplate:
      'Yarin {studentName} icin {title} var. Guzel bir paylasim zamani olmasi icin {itemName} getirmesini bekliyoruz.',
    weekday: twoDaysAgo.getDay(),
    sendAtHour: 19,
    sendAtMinute: 30,
    isActive: true,
    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 6).toISOString(),
  },
];

export const FIXTURE_CALENDAR_EVENTS: CalendarEventDto[] = [
  {
    id: 'event-english',
    title: 'Ingilizce Dersi',
    description: 'Renkler temasi ve kisa sarki calismasi yapilacak.',
    type: 'lesson',
    category: 'language',
    classId: FIXTURE_TEACHER_CLASS.id,
    className: FIXTURE_TEACHER_CLASS.name,
    startAt: tomorrow.toISOString(),
    endAt: new Date(tomorrow.getTime() + 1000 * 60 * 45).toISOString(),
    isAllDay: false,
    isActive: true,
    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: 'event-23nisan',
    title: '23 Nisan Kutlamasi',
    description: 'Sinif ici prova ve kucuk bir fotograf paylasim akisi olacak.',
    type: 'activity',
    category: 'celebration',
    classId: FIXTURE_TEACHER_CLASS.id,
    className: FIXTURE_TEACHER_CLASS.name,
    startAt: nextSchoolDay.toISOString(),
    endAt: new Date(nextSchoolDay.getTime() + 1000 * 60 * 90).toISOString(),
    isAllDay: false,
    isActive: true,
    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 4).toISOString(),
  },
];

export const FIXTURE_MEAL_PLANS: MealPlanDto[] = [
  {
    id: 'meal-today',
    classId: FIXTURE_TEACHER_CLASS.id,
    className: FIXTURE_TEACHER_CLASS.name,
    date: formatDateOnly(now),
    breakfast: 'Peynir, zeytin, tam bugday ekmegi',
    lunch: 'Sebzeli kofte, yogurt, pilav',
    snack: 'Meyve tabagi',
    notes: 'Bugun su tuketimi hatirlatilacak.',
    allergens: 'Sut urunu',
  },
  {
    id: 'meal-tomorrow',
    classId: FIXTURE_TEACHER_CLASS.id,
    className: FIXTURE_TEACHER_CLASS.name,
    date: formatDateOnly(tomorrow),
    breakfast: 'Haslanmis yumurta, domates, salatalik',
    lunch: 'Tavuklu makarna, ayran',
    snack: 'Muz ve galeta',
    notes: 'Ogun sonrasi bahce zamani planlandi.',
    allergens: 'Gluten, sut urunu',
  },
  {
    id: 'meal-next',
    classId: FIXTURE_TEACHER_CLASS.id,
    className: FIXTURE_TEACHER_CLASS.name,
    date: formatDateOnly(nextSchoolDay),
    breakfast: 'Labneli sandvic ve bitki cayi',
    lunch: 'Mercimek corbasi, firin tavuk, pilav',
    snack: 'Ev yapimi kek',
    notes: 'Corba gunu oldugu icin ekstra pecete hazirlanacak.',
    allergens: 'Gluten, yumurta',
  },
];

export const FIXTURE_PARENT_UPCOMING_REMINDERS: ParentUpcomingReminderDto[] = [
  {
    id: 'parent-reminder-1',
    kind: 'routine',
    title: 'Puzzle Günü',
    body: `Yarin ${FIXTURE_CHILD.name.split(' ')[0]} icin Puzzle Gunu var. Siz unutmazsiniz ama biz yine de hatirlatmak istedik. Kucuk bir puzzle getirmesini bekliyoruz.`,
    targetDate: formatDateOnly(tomorrow),
    studentId: FIXTURE_CHILD.id,
    studentName: FIXTURE_CHILD.name,
    classId: FIXTURE_CHILD.classId,
    className: FIXTURE_CHILD.className,
  },
  {
    id: 'parent-reminder-2',
    kind: 'event',
    title: 'Ingilizce Dersi',
    body: `Yarin ${FIXTURE_CHILD.name.split(' ')[0]} icin Ingilizce Dersi planlandi. Renkler temasi ve kisa sarki calismasi yapilacak.`,
    targetDate: formatDateOnly(tomorrow),
    studentId: FIXTURE_CHILD.id,
    studentName: FIXTURE_CHILD.name,
    classId: FIXTURE_CHILD.classId,
    className: FIXTURE_CHILD.className,
  },
];
