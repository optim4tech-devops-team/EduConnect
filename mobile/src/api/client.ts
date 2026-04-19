import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { storage } from '@/utils/storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://apigateway-notio.bidyno.com/api';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor: attach access token ───────────────────────────────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await storage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor: 401 refresh logic ────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token as string);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest: AxiosRequestConfig & { _retry?: boolean } =
      error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              (originalRequest.headers as Record<string, string>).Authorization =
                `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await storage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken: string = data.accessToken;
        const newRefreshToken: string = data.refreshToken;

        await storage.setItem('accessToken', newAccessToken);
        await storage.setItem('refreshToken', newRefreshToken);

        // Keep Zustand store in sync so SignalR accessTokenFactory gets the fresh token
        const { useAuthStore } = await import('../store/authStore');
        useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);

        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          (originalRequest.headers as Record<string, string>).Authorization =
            `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await storage.deleteItem('accessToken');
        await storage.deleteItem('refreshToken');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ─── Types ───────────────────────────────────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
}

export type UserRole = 'Teacher' | 'Parent' | 'SchoolAdmin' | 'PlatformAdmin' | 'Admin' | 'StudentAffairs';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  role: UserRole;
  userId: string;
  fullName: string;
  avatarUrl?: string;
  schoolId: string;
  email: string;
  phone?: string;
  mustChangePassword?: boolean;
}

export interface UserDto {
  id: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  schoolId: string;
  email: string;
  phone?: string;
  mustChangePassword?: boolean;
}

export interface ClassDto {
  id: string;
  name: string;
  teacherId: string;
  teacherName: string;
  studentCount: number;
  schoolId: string;
}

export interface StudentDto {
  id: string;
  name: string;
  avatarUrl?: string;
  classId: string;
  className: string;
  parentName: string;
  parentId: string;
  badgeCount: number;
  birthDate?: string;
}

export interface PostDto {
  id: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  classId: string;
  className: string;
  authorId: string;
  authorName: string;
  publishedAt?: string;
  isPublished: boolean;
  tags: TagDto[];
  createdAt: string;
}

export interface TagDto {
  id: string;
  studentId: string;
  studentName: string;
  confidence?: number;
  isConfirmed: boolean;
}

export interface AssignmentDto {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  classId: string;
  teacherId: string;
  teacherName: string;
  status: 'Pending' | 'Submitted' | 'Graded';
  submittedAt?: string;
  submissionNote?: string;
  submissionFileUrl?: string;
}

export interface AttendanceDto {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
}

export interface DailyReportDto {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  mood: 'Happy' | 'Neutral' | 'Sad';
  meals?: string;
  sleepMinutes?: number;
  activities: string[];
  notes?: string;
  teacherId: string;
}

export interface BadgeDto {
  id: string;
  name: string;
  iconUrl?: string;
  description?: string;
  color?: string;
}

export interface BadgeAwardDto {
  id: string;
  badgeId: string;
  badgeName: string;
  badgeColor?: string;
  studentId: string;
  studentName: string;
  note?: string;
  awardedAt: string;
  awardedByName: string;
}

export interface ConversationDto {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatarUrl?: string;
  participantRole: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  mediaUrl?: string;
  sentAt: string;       // frontend field
  createdAt?: string;   // API field (mapped to sentAt in store)
  isRead: boolean;
  senderRole?: string;
  senderLabel?: string;
  clientMessageId?: string | null;
}

export interface NotificationDto {
  id: string;
  type: 'Photo' | 'Assignment' | 'Attendance' | 'Badge' | 'Announcement' | 'Message';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: string;
}

export interface AnnouncementDto {
  id: string;
  title: string;
  content: string;
  authorName: string;
  classId?: string;
  isSchoolWide: boolean;
  createdAt: string;
}

export interface AdminStatsDto {
  classCount: number;
  teacherCount: number;
  studentCount: number;
  parentCount: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'date' | 'checkbox' | 'select';
  options?: string[];
  required: boolean;
}

export interface FormTemplateDto {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  createdAt: string;
}

export interface FormSubmissionDto {
  id: string;
  templateId: string;
  templateTitle: string;
  studentId?: string;
  values: Record<string, unknown>;
  submittedAt: string;
  status: 'pending' | 'submitted';
  createdAt: string;
}

export interface ObservationDto {
  id: string;
  studentId: string;
  studentName: string;
  teacherName: string;
  note: string;
  createdAt: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────
export interface LookupResponse {
  schoolName: string;
  schoolLogoUrl?: string;
  maskedIdentifier: string;
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>('/auth/login', data),
  refresh: (refreshToken: string) =>
    apiClient.post<AuthResponse>('/auth/refresh', { refreshToken }),
  logout: () => apiClient.post('/auth/logout'),
  changePassword: (newPassword: string) =>
    apiClient.post('/auth/change-password', { newPassword }),
  me: () => apiClient.get<UserDto>('/auth/me'),
  lookup: (phoneNumber: string) =>
    apiClient.post<LookupResponse>('/auth/lookup', { identifier: phoneNumber }),
  sendOtp: (phoneNumber: string) =>
    apiClient.post('/auth/send-otp', { identifier: phoneNumber }),
  verifyOtp: (phoneNumber: string, code: string) =>
    apiClient.post<AuthResponse>('/auth/verify-otp', { identifier: phoneNumber, code }),
};

export const classApi = {
  list: () => apiClient.get<ClassDto[]>('/classes'),
  get: (id: string) => apiClient.get<ClassDto>(`/classes/${id}`),
  create: (data: Partial<ClassDto>) => apiClient.post<ClassDto>('/classes', data),
  update: (id: string, data: Partial<ClassDto>) =>
    apiClient.put<ClassDto>(`/classes/${id}`, data),
  delete: (id: string) => apiClient.delete(`/classes/${id}`),
  assignTeacher: (classId: string, teacherId: string) =>
    apiClient.post(`/classes/${classId}/teacher`, { teacherId }),
};

export const studentApi = {
  list: (classId?: string) =>
    apiClient.get<StudentDto[]>('/students', { params: { classId } }),
  get: (id: string) => apiClient.get<StudentDto>(`/students/${id}`),
  create: (data: Partial<StudentDto>) => apiClient.post<StudentDto>('/students', data),
  update: (id: string, data: Partial<StudentDto>) =>
    apiClient.put<StudentDto>(`/students/${id}`, data),
  myChildren: () => apiClient.get<StudentDto[]>('/students'),
};

export const postApi = {
  list: (classId?: string) =>
    apiClient.get<PostDto[]>('/posts', { params: { classId } }),
  get: (id: string) => apiClient.get<PostDto>(`/posts/${id}`),
  create: (formData: FormData) =>
    apiClient.post<PostDto>('/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  confirmTags: (postId: string, tags: Partial<TagDto>[]) =>
    apiClient.post(`/posts/${postId}/confirm-tags`, { tags }),
  publish: (postId: string) => apiClient.post(`/posts/${postId}/publish`),
  childPosts: (studentId: string) =>
    apiClient.get<PostDto[]>('/posts', { params: { studentId } }),
};

export const assignmentApi = {
  list: (classId?: string) =>
    apiClient.get<AssignmentDto[]>('/assignments', { params: { classId } }),
  get: (id: string) => apiClient.get<AssignmentDto>(`/assignments/${id}`),
  create: (data: Partial<AssignmentDto>) =>
    apiClient.post<AssignmentDto>('/assignments', data),
  submit: (id: string, formData: FormData) =>
    apiClient.post(`/assignments/${id}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  myChildren: () => apiClient.get<AssignmentDto[]>('/assignments/my-children'),
};

export const attendanceApi = {
  list: (classId: string, date: string) =>
    apiClient.get<AttendanceDto[]>('/attendance', { params: { classId, date } }),
  save: (records: Partial<AttendanceDto>[]) =>
    apiClient.post('/attendance/bulk', { records }),
  studentSummary: (studentId: string, month: string) =>
    apiClient.get<AttendanceDto[]>(`/attendance/student/${studentId}`, {
      params: { month },
    }),
};

export const dailyReportApi = {
  list: (studentId: string, date?: string) =>
    apiClient.get<DailyReportDto[]>(`/daily-reports/student/${studentId}`, {
      params: { date },
    }),
  create: (data: Partial<DailyReportDto>) =>
    apiClient.post<DailyReportDto>('/daily-reports', data),
  get: (id: string) => apiClient.get<DailyReportDto>(`/daily-reports/${id}`),
};

export const badgeApi = {
  list: () => apiClient.get<BadgeDto[]>('/badges'),
  award: (data: { badgeId: string; studentId: string; note?: string }) =>
    apiClient.post<BadgeAwardDto>('/badges/award', data),
  studentBadges: (studentId: string) =>
    apiClient.get<BadgeAwardDto[]>(`/badges/student/${studentId}`),
};

export const messageApi = {
  conversations: () => apiClient.get<ConversationDto[]>('/conversations'),
  messages: (conversationId: string) =>
    apiClient.get<MessageDto[]>(`/conversations/${conversationId}/messages`),
  markRead: (conversationId: string) =>
    apiClient.post(`/conversations/${conversationId}/read`),
  sendMedia: (conversationId: string, formData: FormData) =>
    apiClient.post<MessageDto>(`/conversations/${conversationId}/messages/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  startConversation: (participantId: string) =>
    apiClient.post<ConversationDto>('/conversations', { participantId }),
  contacts: () => apiClient.get<{ id: string; fullName: string; avatarUrl?: string; role: string }[]>('/conversations/contacts'),
};

export const notificationApi = {
  list: () => apiClient.get<NotificationDto[]>('/notifications'),
  markRead: (id: string) => apiClient.post(`/notifications/${id}/read`),
  markAllRead: () => apiClient.post('/notifications/read-all'),
};

export const announcementApi = {
  list: (classId?: string) =>
    apiClient.get<AnnouncementDto[]>('/announcements', { params: { classId } }),
  create: (data: Partial<AnnouncementDto>) =>
    apiClient.post<AnnouncementDto>('/announcements', data),
};

export const adminApi = {
  stats: () => apiClient.get<AdminStatsDto>('/admin/stats'),
  teachers: () => apiClient.get<UserDto[]>('/teachers'),
  createTeacher: (data: { fullName: string; email?: string; phone: string; avatarUrl?: string; isActive?: boolean }) =>
    apiClient.post<UserDto>('/teachers', data),
  updateTeacher: (id: string, data: { fullName: string; email?: string; phone: string; avatarUrl?: string; isActive?: boolean }) =>
    apiClient.put<UserDto>(`/teachers/${id}`, data),
};

// ─── Platform types ───────────────────────────────────────────────────────────
export interface PlatformSchoolDto {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  isActive: boolean;
  plan: string;
  maxStudents: number;
  maxTeachers: number;
  subscriptionEndsAt?: string;
  primaryAdminUserId?: string;
  primaryAdminName?: string;
  primaryAdminPhone?: string;
  teacherCount: number;
  parentCount: number;
  studentCount: number;
  classCount: number;
  createdAt: string;
}

export interface CreatePlatformSchoolDto {
  name: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  isActive: boolean;
  plan: string;
  maxStudents: number;
  maxTeachers: number;
  subscriptionEndsAt?: string;
  primaryAdmin?: {
    fullName: string;
    phone: string;
    email?: string;
    avatarUrl?: string;
  };
}

export const platformApi = {
  listSchools: (search?: string, isActive?: boolean) =>
    apiClient.get<PlatformSchoolDto[]>('/platform/schools', {
      params: { search, isActive },
    }),
  getSchool: (id: string) =>
    apiClient.get<PlatformSchoolDto>(`/platform/schools/${id}`),
  createSchool: (data: CreatePlatformSchoolDto) =>
    apiClient.post<{ id: string; name: string; plan: string; isActive: boolean }>(
      '/platform/schools',
      data,
    ),
  updateSchool: (id: string, data: Partial<CreatePlatformSchoolDto>) =>
    apiClient.put(`/platform/schools/${id}`, data),
  assignAdmin: (id: string, data: { fullName: string; phone: string; email?: string; avatarUrl?: string }) =>
    apiClient.post(`/platform/schools/${id}/assign-admin`, data),
  deleteSchool: (id: string) =>
    apiClient.delete(`/platform/schools/${id}`),
};

export const formApi = {
  getTemplates: () => apiClient.get<FormTemplateDto[]>('/forms/templates'),
  getTemplate: (id: string) => apiClient.get<FormTemplateDto>(`/forms/templates/${id}`),
  getSubmissions: () => apiClient.get<FormSubmissionDto[]>('/forms/submissions'),
  getSubmission: (id: string) => apiClient.get<FormSubmissionDto>(`/forms/submissions/${id}`),
  submit: (templateId: string, values: Record<string, unknown>, studentId?: string) =>
    apiClient.post<FormSubmissionDto>('/forms/submissions', { templateId, values, studentId }),
};

export const observationApi = {
  getStudentObservations: (studentId: string) =>
    apiClient.get<ObservationDto[]>(`/students/${studentId}/observations`),
  addObservation: (studentId: string, data: { title: string, note: string }) =>
    apiClient.post<ObservationDto>(`/students/${studentId}/observations`, data),
};

export const parentApi = {
  list: (params?: { search?: string; page?: number; pageSize?: number }) =>
    apiClient.get<UserDto[]>('/parents', { params }),
  get: (id: string) => apiClient.get<UserDto>(`/parents/${id}`),
  me: () => apiClient.get<{
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    students: { studentId: string; studentName: string; classId: string; className: string; relationship?: string; isPrimaryContact: boolean; canPickup: boolean }[];
  }>('/parents/me'),
  create: (data: { fullName: string; email?: string; phone: string; avatarUrl?: string; isActive?: boolean; students?: Array<{ studentId: string; relationship?: string; isPrimaryContact?: boolean; canPickup?: boolean }> }) =>
    apiClient.post<UserDto>('/parents', data),
  update: (id: string, data: { fullName: string; email?: string; phone: string; avatarUrl?: string; isActive?: boolean; students?: Array<{ studentId: string; relationship?: string; isPrimaryContact?: boolean; canPickup?: boolean }> }) =>
    apiClient.put<UserDto>(`/parents/${id}`, data),
  assignToStudent: (studentId: string, parentId: string) =>
    apiClient.post(`/students/${studentId}/assign-parent`, { parentId }),
};

export default apiClient;
