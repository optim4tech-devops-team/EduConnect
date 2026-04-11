import type { ConversationDto, MessageDto, UserDto } from '@/api/client';
import { FIXTURE_CHILD, FIXTURE_PARENT_RELATION_LABEL } from './parentFixtures';
import { FIXTURE_TEACHER_CLASS, isFixtureTeacherUser } from './teacherFixtures';
import { FIXTURE_SCHOOL_NAME } from './schoolFixtures';

const FIXTURE_PARENT_ID = '44444444-4444-4444-4444-444444444444';
const FIXTURE_TEACHER_ID = '33333333-3333-3333-3333-333333333333';
const FIXTURE_STUDENT_AFFAIRS_ID = '77777777-7777-7777-7777-777777777777';
const FIXTURE_STUDENT_AFFAIRS_NAME = 'Öğrenci İşleri';

const SCHOOL_INBOX_ID = 'fixture-conversation-school-inbox';
const TEACHER_PARENT_DIRECT_ID = 'fixture-conversation-teacher-parent-direct';

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function buildParentConversation(): ConversationDto {
  return {
    id: TEACHER_PARENT_DIRECT_ID,
    participantId: FIXTURE_TEACHER_ID,
    participantName: 'Elif Toksoy',
    participantRole: 'Teacher',
    title: `${FIXTURE_CHILD.name} · Elif Toksoy`,
    subtitle: `${FIXTURE_CHILD.className} · ${FIXTURE_SCHOOL_NAME}`,
    kind: 'direct',
    status: 'waiting_on_parent',
    studentId: FIXTURE_CHILD.id,
    studentName: FIXTURE_CHILD.name,
    studentAvatarUrl: FIXTURE_CHILD.avatarUrl,
    lastMessage: 'Yarın kitap günü için küçük bir hikâye kitabı getirebilir misiniz?',
    lastMessageAt: minutesAgo(12),
    unreadCount: 1,
    canReply: true,
    actionLabel: 'Öğretmene yaz',
  };
}

function buildParentSchoolConversation(): ConversationDto {
  return {
    id: SCHOOL_INBOX_ID,
    participantId: FIXTURE_STUDENT_AFFAIRS_ID,
    participantName: FIXTURE_STUDENT_AFFAIRS_NAME,
    participantRole: 'StudentAffairs',
    title: `${FIXTURE_CHILD.name} · Öğrenci İşleri`,
    subtitle: `${FIXTURE_CHILD.className} · ${FIXTURE_SCHOOL_NAME}`,
    kind: 'school_inbox',
    status: 'open',
    studentId: FIXTURE_CHILD.id,
    studentName: FIXTURE_CHILD.name,
    studentAvatarUrl: FIXTURE_CHILD.avatarUrl,
    lastMessage: 'Etkinlik izin formunu gün içinde onaya açacağız.',
    lastMessageAt: hoursAgo(6),
    unreadCount: 0,
    canReply: true,
    actionLabel: 'Öğrenci işlerine yaz',
  };
}

function buildTeacherConversation(): ConversationDto {
  return {
    id: TEACHER_PARENT_DIRECT_ID,
    participantId: FIXTURE_PARENT_ID,
    participantName: 'Sezer Darendeli',
    participantRole: 'Parent',
    title: `${FIXTURE_CHILD.name} · Sezer Darendeli`,
    subtitle: `${FIXTURE_PARENT_RELATION_LABEL} · ${FIXTURE_CHILD.className}`,
    kind: 'direct',
    status: 'waiting_on_teacher',
    studentId: FIXTURE_CHILD.id,
    studentName: FIXTURE_CHILD.name,
    studentAvatarUrl: FIXTURE_CHILD.avatarUrl,
    lastMessage: 'Yarın kitap günü için küçük bir hikâye kitabı getirebilir misiniz?',
    lastMessageAt: minutesAgo(12),
    unreadCount: 1,
    canReply: true,
    actionLabel: 'Veliye yaz',
  };
}

function buildTeacherSchoolConversation(): ConversationDto {
  return {
    id: `${SCHOOL_INBOX_ID}-teacher`,
    participantId: FIXTURE_STUDENT_AFFAIRS_ID,
    participantName: FIXTURE_STUDENT_AFFAIRS_NAME,
    participantRole: 'StudentAffairs',
    title: `${FIXTURE_CHILD.className} · Öğrenci İşleri`,
    subtitle: 'Okul içi koordinasyon',
    kind: 'school_inbox',
    status: 'open',
    studentId: FIXTURE_CHILD.id,
    studentName: FIXTURE_CHILD.name,
    studentAvatarUrl: FIXTURE_CHILD.avatarUrl,
    lastMessage: 'Cuma günü paylaşılacak etkinlik duyurusunu bugün sisteme girebilir misiniz?',
    lastMessageAt: hoursAgo(3),
    unreadCount: 0,
    canReply: true,
    actionLabel: 'Öğrenci işlerine yaz',
  };
}

const DIRECT_MESSAGES: MessageDto[] = [
  {
    id: 'msg-direct-system-open',
    conversationId: TEACHER_PARENT_DIRECT_ID,
    senderId: 'system',
    senderName: 'Sistem',
    senderRole: 'System',
    senderLabel: 'Sistem',
    content: 'Bu görüşme veli ve sınıf öğretmeni arasında doğrudan mesajlaşma içindir.',
    sentAt: hoursAgo(20),
    isRead: true,
    kind: 'system',
    visibility: 'parent_visible',
  },
  {
    id: 'msg-direct-teacher-1',
    conversationId: TEACHER_PARENT_DIRECT_ID,
    senderId: FIXTURE_TEACHER_ID,
    senderName: 'Elif Toksoy',
    senderRole: 'Teacher',
    senderLabel: 'Öğretmen',
    content:
      'Merhaba, Rana bugün kitap köşesinde çok keyifliydi. Yarın kitap günü için küçük bir hikâye kitabı getirebilir misiniz?',
    sentAt: hoursAgo(4),
    isRead: true,
    kind: 'user',
    visibility: 'parent_visible',
  },
  {
    id: 'msg-direct-parent-1',
    conversationId: TEACHER_PARENT_DIRECT_ID,
    senderId: FIXTURE_PARENT_ID,
    senderName: 'Sezer Darendeli',
    senderRole: 'Parent',
    senderLabel: FIXTURE_PARENT_RELATION_LABEL,
    content: 'Tabii, teşekkür ederim. Rana yarın yanına bir hikâye kitabı alacak.',
    sentAt: hoursAgo(3),
    isRead: true,
    kind: 'user',
    visibility: 'parent_visible',
  },
  {
    id: 'msg-direct-teacher-2',
    conversationId: TEACHER_PARENT_DIRECT_ID,
    senderId: FIXTURE_TEACHER_ID,
    senderName: 'Elif Toksoy',
    senderRole: 'Teacher',
    senderLabel: 'Öğretmen',
    content: 'Harika olur, teşekkür ederim.',
    sentAt: minutesAgo(12),
    isRead: false,
    kind: 'user',
    visibility: 'parent_visible',
  },
];

const SCHOOL_MESSAGES: MessageDto[] = [
  {
    id: 'msg-school-system-open',
    conversationId: SCHOOL_INBOX_ID,
    senderId: 'system',
    senderName: 'Sistem',
    senderRole: 'System',
    senderLabel: 'Sistem',
    content: 'Bu görüşme okul yönetimi ve öğrenci işleriyle iletişim içindir.',
    sentAt: hoursAgo(12),
    isRead: true,
    kind: 'system',
    visibility: 'parent_visible',
  },
  {
    id: 'msg-school-1',
    conversationId: SCHOOL_INBOX_ID,
    senderId: FIXTURE_STUDENT_AFFAIRS_ID,
    senderName: FIXTURE_STUDENT_AFFAIRS_NAME,
    senderRole: 'StudentAffairs',
    senderLabel: 'Öğrenci İşleri',
    content:
      'Merhaba, gelecek hafta bahar etkinliği için dijital izin formunu gün içinde açacağız. Onayı bu ekrandan takip edebilirsiniz.',
    sentAt: hoursAgo(7),
    isRead: true,
    kind: 'user',
    visibility: 'parent_visible',
  },
  {
    id: 'msg-school-2',
    conversationId: SCHOOL_INBOX_ID,
    senderId: FIXTURE_PARENT_ID,
    senderName: 'Sezer Darendeli',
    senderRole: 'Parent',
    senderLabel: FIXTURE_PARENT_RELATION_LABEL,
    content: 'Tamamdır, bildirimi bekliyor olacağım. Teşekkür ederim.',
    sentAt: hoursAgo(6),
    isRead: true,
    kind: 'user',
    visibility: 'parent_visible',
  },
];

const TEACHER_SCHOOL_MESSAGES: MessageDto[] = [
  {
    id: 'msg-teacher-school-system',
    conversationId: `${SCHOOL_INBOX_ID}-teacher`,
    senderId: 'system',
    senderName: 'Sistem',
    senderRole: 'System',
    senderLabel: 'Sistem',
    content: 'Bu kanal okul içi koordinasyon içindir.',
    sentAt: hoursAgo(10),
    isRead: true,
    kind: 'system',
    visibility: 'internal_only',
  },
  {
    id: 'msg-teacher-school-1',
    conversationId: `${SCHOOL_INBOX_ID}-teacher`,
    senderId: FIXTURE_STUDENT_AFFAIRS_ID,
    senderName: FIXTURE_STUDENT_AFFAIRS_NAME,
    senderRole: 'StudentAffairs',
    senderLabel: 'Öğrenci İşleri',
    content: 'Cuma günü paylaşılacak etkinlik duyurusu için kısa sınıf notunuzu gün içinde paylaşabilir misiniz?',
    sentAt: hoursAgo(3),
    isRead: true,
    kind: 'internal_note',
    visibility: 'internal_only',
  },
  {
    id: 'msg-teacher-school-2',
    conversationId: `${SCHOOL_INBOX_ID}-teacher`,
    senderId: FIXTURE_TEACHER_ID,
    senderName: 'Elif Toksoy',
    senderRole: 'Teacher',
    senderLabel: 'Öğretmen',
    content: 'Evet, öğleden sonra duyuru metnini ve fotoğraf seçimini sisteme gireceğim.',
    sentAt: hoursAgo(2),
    isRead: true,
    kind: 'internal_note',
    visibility: 'internal_only',
  },
];

export function isFixtureMessagingUser(
  user?: UserDto | null,
  accessToken?: string | null,
): boolean {
  if (!user || !accessToken) return false;
  const isFixtureToken = !accessToken.includes('.');
  if (!isFixtureToken) return false;
  return user.role === 'Parent' || user.role === 'StudentAffairs' || isFixtureTeacherUser(user);
}

export function getFixtureConversationsForUser(user?: UserDto | null): ConversationDto[] {
  if (!user) {
    return [
      buildParentConversation(),
      buildParentSchoolConversation(),
      buildTeacherConversation(),
      buildTeacherSchoolConversation(),
    ];
  }

  if (user.role === 'Parent') {
    return [buildParentConversation(), buildParentSchoolConversation()];
  }

  if (user.role === 'Teacher') {
    return [buildTeacherConversation(), buildTeacherSchoolConversation()];
  }

  return [];
}

export function getFixtureMessagesForConversation(
  user: UserDto | null | undefined,
  conversationId: string,
): MessageDto[] {
  if (conversationId === TEACHER_PARENT_DIRECT_ID) {
    return DIRECT_MESSAGES;
  }

  if (conversationId === SCHOOL_INBOX_ID) {
    return SCHOOL_MESSAGES;
  }

  if ((user?.role === 'Teacher' || !user) && conversationId === `${SCHOOL_INBOX_ID}-teacher`) {
    return TEACHER_SCHOOL_MESSAGES;
  }

  return [];
}

export function getFixtureConversationById(
  user: UserDto | null | undefined,
  conversationId: string,
): ConversationDto | undefined {
  return getFixtureConversationsForUser(user).find((item) => item.id === conversationId);
}

export function getDefaultFixtureConversation(
  user: UserDto | null | undefined,
): ConversationDto | null {
  return getFixtureConversationsForUser(user)[0] ?? null;
}

export function buildFixtureOutgoingMessage(params: {
  conversationId: string;
  content: string;
  user: UserDto;
}): MessageDto {
  const sentAt = new Date().toISOString();

  if (params.user.role === 'Teacher') {
    return {
      id: `fixture-teacher-message-${Date.now()}`,
      conversationId: params.conversationId,
      senderId: params.user.id,
      senderName: params.user.name,
      senderRole: 'Teacher',
      senderLabel: params.conversationId === `${SCHOOL_INBOX_ID}-teacher` ? 'Öğretmen' : 'Öğretmen',
      content: params.content,
      sentAt,
      isRead: false,
      kind: params.conversationId === `${SCHOOL_INBOX_ID}-teacher` ? 'internal_note' : 'user',
      visibility: params.conversationId === `${SCHOOL_INBOX_ID}-teacher` ? 'internal_only' : 'parent_visible',
    };
  }

  return {
    id: `fixture-parent-message-${Date.now()}`,
    conversationId: params.conversationId,
    senderId: params.user.id,
    senderName: params.user.name,
    senderRole: 'Parent',
    senderLabel: FIXTURE_PARENT_RELATION_LABEL,
    content: params.content,
    sentAt,
    isRead: false,
    kind: 'user',
    visibility: 'parent_visible',
  };
}

export function getConversationTitle(conversation: ConversationDto): string {
  return conversation.title ?? conversation.participantName ?? 'Mesaj';
}

export function getConversationSubtitle(conversation: ConversationDto): string {
  if (conversation.subtitle) return conversation.subtitle;
  if (conversation.kind === 'school_inbox') {
    return `${FIXTURE_TEACHER_CLASS.name} · Öğrenci İşleri`;
  }
  return FIXTURE_SCHOOL_NAME;
}
