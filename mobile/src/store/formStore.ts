import { create } from 'zustand';
import { formApi, FormTemplateDto, FormSubmissionDto } from '../api/client';

interface FormState {
  templates: FormTemplateDto[];
  submissions: FormSubmissionDto[];
  isLoading: boolean;
  error: string | null;
  fetchTemplates: () => Promise<void>;
  fetchSubmissions: () => Promise<void>;
  submitForm: (templateId: string, answers: Record<string, unknown>, studentId?: string) => Promise<void>;
  clearError: () => void;
}

export const useFormStore = create<FormState>((set) => ({
  templates: [],
  submissions: [],
  isLoading: false,
  error: null,

  fetchTemplates: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await formApi.getTemplates();
      set({ templates: res.data as unknown as FormTemplateDto[] });
    } catch {
      set({ error: 'Formlar yüklenemedi.' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSubmissions: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await formApi.getSubmissions();
      set({ submissions: res.data as unknown as FormSubmissionDto[] });
    } catch {
      set({ error: 'Form geçmişi yüklenemedi.' });
    } finally {
      set({ isLoading: false });
    }
  },

  submitForm: async (templateId, answers, studentId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await formApi.submit(templateId, answers, studentId);
      const newSubmission = res.data as unknown as FormSubmissionDto;
      set((state) => ({
        submissions: [newSubmission, ...state.submissions],
      }));
    } catch {
      set({ error: 'Form gönderilemedi.' });
      throw new Error('Form submit failed');
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
