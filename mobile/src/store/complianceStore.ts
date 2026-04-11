import { create } from 'zustand';
import {
  complianceApi,
  type ComplianceAudience,
  type ComplianceDocumentDto,
  type PendingComplianceDocumentDto,
  type UpsertComplianceDocumentRequest,
  type UserDto,
} from '@/api/client';
import { FIXTURE_COMPLIANCE_DOCUMENTS } from '@/mocks/complianceFixtures';
import { FIXTURE_SCHOOL_ID } from '@/mocks/schoolFixtures';
import * as SecureStore from '@/utils/secureStore';

const LOCAL_DOCS_KEY = 'notio-compliance-documents-v1';
const LOCAL_ACCEPTANCES_KEY = 'notio-compliance-acceptances-v1';

type AcceptanceMap = Record<string, string[]>;

interface ComplianceState {
  pendingDocuments: PendingComplianceDocumentDto[];
  documents: ComplianceDocumentDto[];
  isChecking: boolean;
  isManaging: boolean;
  isReady: boolean;
  error: string | null;
  source: 'api' | 'local' | null;
  loadForUser: (user: UserDto | null) => Promise<void>;
  acceptDocument: (user: UserDto, documentId: string) => Promise<void>;
  loadAdminDocuments: (user: UserDto | null) => Promise<void>;
  createDocument: (user: UserDto | null, payload: UpsertComplianceDocumentRequest) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

function isComplianceRole(role?: UserDto['role'] | null): role is 'Teacher' | 'Parent' {
  return role === 'Teacher' || role === 'Parent';
}

function getAudienceForRole(role: UserDto['role']): ComplianceAudience {
  return role === 'Teacher' ? 'teacher' : 'parent';
}

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function readStoredDocuments() {
  const raw = await SecureStore.getItemAsync(LOCAL_DOCS_KEY);
  return safeJsonParse<ComplianceDocumentDto[]>(raw, []);
}

async function writeStoredDocuments(documents: ComplianceDocumentDto[]) {
  await SecureStore.setItemAsync(LOCAL_DOCS_KEY, JSON.stringify(documents));
}

async function readAcceptanceMap() {
  const raw = await SecureStore.getItemAsync(LOCAL_ACCEPTANCES_KEY);
  return safeJsonParse<AcceptanceMap>(raw, {});
}

async function writeAcceptanceMap(value: AcceptanceMap) {
  await SecureStore.setItemAsync(LOCAL_ACCEPTANCES_KEY, JSON.stringify(value));
}

async function ensureLocalDocuments(schoolId?: string | null) {
  const current = await readStoredDocuments();

  if (schoolId !== FIXTURE_SCHOOL_ID) {
    return current.filter((document) => document.schoolId === schoolId);
  }

  const merged = [...current];

  for (const fixtureDoc of FIXTURE_COMPLIANCE_DOCUMENTS) {
    if (!merged.some((document) => document.id === fixtureDoc.id)) {
      merged.push(fixtureDoc);
    }
  }

  if (merged.length !== current.length) {
    await writeStoredDocuments(merged);
  }

  return merged.filter((document) => document.schoolId === schoolId);
}

async function loadLocalPendingDocuments(user: UserDto) {
  const [documents, acceptances] = await Promise.all([
    ensureLocalDocuments(user.schoolId),
    readAcceptanceMap(),
  ]);

  const audience = getAudienceForRole(user.role);
  const acceptedIds = new Set(acceptances[user.id] ?? []);

  return documents
    .filter((document) =>
      document.isActive &&
      document.isRequired &&
      document.requireOnLogin &&
      (document.audience === audience || document.audience === 'all') &&
      !acceptedIds.has(document.id))
    .sort((left, right) => {
      const leftDate = left.publishedAt ?? left.createdAt;
      const rightDate = right.publishedAt ?? right.createdAt;
      return new Date(rightDate).getTime() - new Date(leftDate).getTime();
    })
    .map<PendingComplianceDocumentDto>((document) => ({
      id: document.id,
      kind: document.kind,
      audience: document.audience,
      title: document.title,
      content: document.content,
      version: document.version,
      requireOnLogin: document.requireOnLogin,
      createdAt: document.createdAt,
      publishedAt: document.publishedAt,
    }));
}

async function loadLocalAdminDocuments(user: UserDto) {
  const [documents, acceptanceMap] = await Promise.all([
    ensureLocalDocuments(user.schoolId),
    readAcceptanceMap(),
  ]);

  return documents
    .map((document) => ({
      ...document,
      acceptedCount: Object.values(acceptanceMap).filter((ids) => ids.includes(document.id)).length,
    }))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

async function createLocalDocument(user: UserDto, payload: UpsertComplianceDocumentRequest) {
  const documents = await ensureLocalDocuments(user.schoolId);
  const audience = payload.audience ?? 'all';
  const kind = payload.kind?.trim().toLowerCase() || 'kvkk';
  const nextVersion =
    Math.max(
      0,
      ...documents
        .filter((document) => document.schoolId === user.schoolId && document.kind === kind && document.audience === audience)
        .map((document) => document.version),
    ) + 1;

  const now = new Date().toISOString();
  const nextDocuments = documents.map((document) => {
    if (
      payload.isActive !== false &&
      document.kind === kind &&
      document.audience === audience &&
      document.schoolId === user.schoolId
    ) {
      return { ...document, isActive: false };
    }

    return document;
  });

  nextDocuments.push({
    id: `local-compliance-${Date.now()}`,
    schoolId: user.schoolId,
    kind,
    audience,
    title: payload.title.trim(),
    content: payload.content.trim(),
    version: nextVersion,
    isRequired: payload.isRequired ?? true,
    requireOnLogin: payload.requireOnLogin ?? true,
    isActive: payload.isActive ?? true,
    createdAt: now,
    publishedAt: payload.isActive === false ? undefined : now,
    createdById: user.id,
    createdByName: user.name,
    acceptedCount: 0,
  });

  await writeStoredDocuments(nextDocuments);
}

export const useComplianceStore = create<ComplianceState>((set) => ({
  pendingDocuments: [],
  documents: [],
  isChecking: false,
  isManaging: false,
  isReady: false,
  error: null,
  source: null,

  loadForUser: async (user) => {
    if (!user || !isComplianceRole(user.role)) {
      set({ pendingDocuments: [], isChecking: false, isReady: true, error: null, source: null });
      return;
    }

    set({ isChecking: true, isReady: false, error: null });

    try {
      const { data } = await complianceApi.pending();
      set({
        pendingDocuments: data,
        isChecking: false,
        isReady: true,
        error: null,
        source: 'api',
      });
    } catch {
      const localPending = await loadLocalPendingDocuments(user);
      set({
        pendingDocuments: localPending,
        isChecking: false,
        isReady: true,
        error: null,
        source: 'local',
      });
    }
  },

  acceptDocument: async (user, documentId) => {
    set({ isChecking: true, error: null });

    try {
      await complianceApi.acceptDocument(documentId);
      const { data } = await complianceApi.pending();
      set({
        pendingDocuments: data,
        isChecking: false,
        isReady: true,
        error: null,
        source: 'api',
      });
    } catch {
      const acceptanceMap = await readAcceptanceMap();
      const current = new Set(acceptanceMap[user.id] ?? []);
      current.add(documentId);
      acceptanceMap[user.id] = Array.from(current);
      await writeAcceptanceMap(acceptanceMap);

      const localPending = await loadLocalPendingDocuments(user);
      set({
        pendingDocuments: localPending,
        isChecking: false,
        isReady: true,
        error: null,
        source: 'local',
      });
    }
  },

  loadAdminDocuments: async (user) => {
    if (!user) {
      set({ documents: [], isManaging: false, error: null });
      return;
    }

    set({ isManaging: true, error: null });

    try {
      const { data } = await complianceApi.documents();
      set({
        documents: data,
        isManaging: false,
        error: null,
        source: 'api',
      });
    } catch {
      const localDocuments = await loadLocalAdminDocuments(user);
      set({
        documents: localDocuments,
        isManaging: false,
        error: null,
        source: 'local',
      });
    }
  },

  createDocument: async (user, payload) => {
    if (!user) return;

    set({ isManaging: true, error: null });

    try {
      await complianceApi.createDocument(payload);
      const { data } = await complianceApi.documents();
      set({
        documents: data,
        isManaging: false,
        error: null,
        source: 'api',
      });
    } catch {
      await createLocalDocument(user, payload);
      const localDocuments = await loadLocalAdminDocuments(user);
      set({
        documents: localDocuments,
        isManaging: false,
        error: null,
        source: 'local',
      });
    }
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      pendingDocuments: [],
      documents: [],
      isChecking: false,
      isManaging: false,
      isReady: false,
      error: null,
      source: null,
    }),
}));
