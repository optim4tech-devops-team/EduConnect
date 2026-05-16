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

export interface UserSession {
  accessToken: string;
  refreshToken: string;
  role: UserRole;
  userId: string;
  fullName: string;
  email: string;
  schoolId: string;
  avatarUrl?: string;
  phone?: string;
}

export interface AdminStatsDto {
  schoolName: string;
  classCount: number;
  teacherCount: number;
  studentCount: number;
  parentCount: number;
}

export interface ClassDto {
  id: string;
  name: string;
  academicYear?: string;
  teacherId?: string;
  teacherName?: string;
  studentCount: number;
  schoolId: string;
}

export interface CreateClassPayload {
  name: string;
  teacherId?: string;
  academicYear?: string;
}

export interface UpdateClassPayload {
  name?: string;
  teacherId?: string;
  academicYear?: string;
  clearTeacher?: boolean;
}

export interface TeacherDto {
  id: string;
  name: string;
  fullName?: string;
  email: string;
  phone?: string;
  isActive?: boolean;
  classCount?: number;
  studentCount?: number;
}

export interface CreateTeacherPayload {
  fullName: string;
  email?: string;
  phone: string;
  avatarUrl?: string;
  password?: string;
  isActive?: boolean;
}

export type UpdateTeacherPayload = CreateTeacherPayload;

export interface StudentDto {
  id: string;
  name?: string;
  fullName?: string;
  classId: string;
  className: string;
  avatarUrl?: string;
  gender?: string;
  badgeCount: number;
  birthDate?: string;
  allergies?: string;
  medicationNotes?: string;
  healthNotes?: string;
  isActive?: boolean;
  parents?: {
    id: string;
    fullName: string;
    phone?: string;
    avatarUrl?: string;
  }[];
}

export interface CreateStudentPayload {
  fullName: string;
  classId: string;
  birthDate?: string;
  gender?: string;
  allergies?: string;
  medicationNotes?: string;
  healthNotes?: string;
  avatarUrl?: string;
}

export interface ParentStudentAssignmentDto {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  relationship?: string;
  isPrimaryContact: boolean;
  canPickup: boolean;
}

export interface ParentDto {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  isActive?: boolean;
  students: ParentStudentAssignmentDto[];
}

export interface CreateParentPayload {
  fullName: string;
  email?: string;
  phone: string;
  avatarUrl?: string;
  isActive?: boolean;
  students?: {
    studentId: string;
    relationship?: string;
    isPrimaryContact?: boolean;
    canPickup?: boolean;
  }[];
}

export type UpdateParentPayload = CreateParentPayload;

export interface PlatformSchoolAdminPayload {
  fullName: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
}

export interface CreatePlatformSchoolPayload {
  name: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  isActive?: boolean;
  plan?: string;
  maxStudents?: number;
  maxTeachers?: number;
  subscriptionEndsAt?: string;
  primaryAdmin?: PlatformSchoolAdminPayload;
}

export interface UpdatePlatformSchoolPayload {
  name?: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  isActive?: boolean;
  plan?: string;
  maxStudents?: number;
  maxTeachers?: number;
  subscriptionEndsAt?: string;
}

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

export interface UploadStudentAvatarResponse {
  url: string;
}

export interface StudentImportResult {
  imported: number;
  failed: number;
  errors: string[];
}

export interface DemoRequestDto {
  id: string;
  firstName: string;
  lastName: string;
  schoolName: string;
  phone: string;
  studentCount?: string;
  city?: string;
  status: string;
  notes?: string;
  createdAt: string;
}

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export type ApiSessionFailureReason = 'unauthorized' | 'forbidden' | 'network';

let sessionFailureHandler: ((reason: ApiSessionFailureReason) => void) | null = null;

export function onApiSessionFailure(handler: ((reason: ApiSessionFailureReason) => void) | null) {
  sessionFailureHandler = handler;
}

function notifySessionFailure(reason: ApiSessionFailureReason, token?: string) {
  if (!token) {
    return;
  }
  sessionFailureHandler?.(reason);
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
  } catch {
    notifySessionFailure('network', token);
    throw new Error('Sunucu baglantisi kurulamadi. Lutfen tekrar giris yapin.');
  }

  if (response.status === 401) {
    notifySessionFailure('unauthorized', token);
    throw new Error('Oturum suresi doldu. Lutfen tekrar giris yapin.');
  }

  if (response.status === 403) {
    notifySessionFailure('forbidden', token);
    throw new Error('Bu islem icin yetkin bulunmuyor.');
  }

  if (!response.ok) {
    const text = await response.text();
    try {
      const parsed = JSON.parse(text) as { message?: string; title?: string };
      throw new Error(parsed.message || parsed.title || text || 'İstek başarısız oldu.');
    } catch {
      throw new Error(text || 'İstek başarısız oldu.');
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  stats: (token: string) => request<AdminStatsDto>('/admin/stats', {}, token),
  classes: (token: string) => request<ClassDto[]>('/classes', {}, token),
  createClass: (token: string, payload: CreateClassPayload) =>
    request<ClassDto>(
      '/classes',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    ),
  updateClass: (token: string, id: string, payload: UpdateClassPayload) =>
    request<{ message: string }>(
      `/classes/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      token,
    ),
  deleteClass: (token: string, id: string) =>
    request<void>(
      `/classes/${id}`,
      {
        method: 'DELETE',
      },
      token,
    ),
  teachers: (token: string) => request<TeacherDto[]>('/teachers', {}, token),
  createTeacher: (token: string, payload: CreateTeacherPayload) =>
    request<TeacherDto>(
      '/teachers',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    ),
  updateTeacher: (token: string, id: string, payload: UpdateTeacherPayload) =>
    request<{ message: string }>(
      `/teachers/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      token,
    ),
  deleteTeacher: (token: string, id: string) =>
    request<void>(
      `/teachers/${id}`,
      {
        method: 'DELETE',
      },
      token,
    ),
  students: (token: string) => request<StudentDto[]>('/students', {}, token),
  createStudent: (token: string, payload: CreateStudentPayload) =>
    request<StudentDto>(
      '/students',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    ),
  updateStudent: (token: string, id: string, payload: CreateStudentPayload) =>
    request<void>(
      `/students/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      token,
    ),
  deleteStudent: (token: string, id: string) =>
    request<void>(
      `/students/${id}`,
      {
        method: 'DELETE',
      },
      token,
    ),
  uploadStudentAvatar: async (token: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    let response: Response;
    try {
      response = await fetch(`${API_URL}/students/avatar-upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
    } catch {
      notifySessionFailure('network', token);
      throw new Error('Sunucu baglantisi kurulamadi. Lutfen tekrar giris yapin.');
    }

    if (response.status === 401) {
      notifySessionFailure('unauthorized', token);
      throw new Error('Oturum suresi doldu. Lutfen tekrar giris yapin.');
    }

    if (response.status === 403) {
      notifySessionFailure('forbidden', token);
      throw new Error('Bu islem icin yetkin bulunmuyor.');
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Ogrenci resmi yuklenemedi.');
    }

    return response.json() as Promise<UploadStudentAvatarResponse>;
  },
  importStudents: async (token: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    let response: Response;
    try {
      response = await fetch(`${API_URL}/students/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
    } catch {
      notifySessionFailure('network', token);
      throw new Error('Sunucu baglantisi kurulamadi. Lutfen tekrar giris yapin.');
    }

    if (response.status === 401) {
      notifySessionFailure('unauthorized', token);
      throw new Error('Oturum suresi doldu. Lutfen tekrar giris yapin.');
    }

    if (response.status === 403) {
      notifySessionFailure('forbidden', token);
      throw new Error('Bu islem icin yetkin bulunmuyor.');
    }

    if (!response.ok) {
      const text = await response.text();
      try {
        const parsed = JSON.parse(text) as { message?: string; title?: string };
        throw new Error(parsed.message || parsed.title || text || 'Excel import basarisiz oldu.');
      } catch {
        throw new Error(text || 'Excel import basarisiz oldu.');
      }
    }

    return response.json() as Promise<StudentImportResult>;
  },
  parents: (token: string) => request<ParentDto[]>('/parents', {}, token),
  createParent: (token: string, payload: CreateParentPayload) =>
    request<ParentDto>(
      '/parents',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    ),
  updateParent: (token: string, id: string, payload: UpdateParentPayload) =>
    request<{ message: string }>(
      `/parents/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      token,
    ),
  deleteParent: (token: string, id: string) =>
    request<void>(
      `/parents/${id}`,
      {
        method: 'DELETE',
      },
      token,
    ),
  platformSchools: (token: string, search?: string, isActive?: boolean) =>
    request<PlatformSchoolDto[]>(
      `/platform/schools${buildQuery({ search, isActive })}`,
      {},
      token,
    ),
  createPlatformSchool: (token: string, payload: CreatePlatformSchoolPayload) =>
    request<{
      id: string;
      name: string;
      plan: string;
      isActive: boolean;
      primaryAdminUserId?: string;
      primaryAdminTemporaryPassword?: string;
    }>(
      '/platform/schools',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    ),
  updatePlatformSchool: (token: string, id: string, payload: UpdatePlatformSchoolPayload) =>
    request<{ message: string }>(
      `/platform/schools/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      token,
    ),
  deletePlatformSchool: (token: string, id: string) =>
    request<void>(
      `/platform/schools/${id}`,
      {
        method: 'DELETE',
      },
      token,
    ),
  assignPlatformSchoolAdmin: (token: string, id: string, payload: PlatformSchoolAdminPayload) =>
    request<{ id: string; primaryAdminUserId?: string; primaryAdminTemporaryPassword?: string }>(
      `/platform/schools/${id}/assign-admin`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    ),
  demoRequests: (token: string, status?: string, page = 1, pageSize = 50) =>
    request<{ items: DemoRequestDto[]; total: number; page: number; pageSize: number }>(
      `/demo-requests${buildQuery({ status, page, pageSize })}`,
      {},
      token,
    ),
  updateDemoStatus: (token: string, id: string, status: string, notes?: string) =>
    request<{ id: string; status: string }>(
      `/demo-requests/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, notes }),
      },
      token,
    ),
};

export const sessionStorageKey = 'notio-admin-session';

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  });

  const query = search.toString();
  return query ? `?${query}` : '';
}
