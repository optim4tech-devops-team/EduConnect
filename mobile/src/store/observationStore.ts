import { create } from 'zustand';
import { observationApi, ObservationDto } from '../api/client';

interface ObservationState {
  observations: Record<string, ObservationDto[]>;
  isLoading: boolean;
  error: string | null;
  fetchObservations: (studentId: string) => Promise<void>;
  addObservation: (studentId: string, note: string) => Promise<void>;
  clearError: () => void;
}

export const useObservationStore = create<ObservationState>((set, get) => ({
  observations: {},
  isLoading: false,
  error: null,

  fetchObservations: async (studentId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await observationApi.getStudentObservations(studentId);
      const list = res.data as unknown as ObservationDto[];
      set((state) => ({
        observations: { ...state.observations, [studentId]: list },
      }));
    } catch {
      set({ error: 'Gözlemler yüklenemedi.' });
    } finally {
      set({ isLoading: false });
    }
  },

  addObservation: async (studentId, note) => {
    set({ isLoading: true, error: null });
    try {
      const res = await observationApi.addObservation(studentId, { note });
      const newObs = res.data as unknown as ObservationDto;
      const current = get().observations[studentId] ?? [];
      set((state) => ({
        observations: { ...state.observations, [studentId]: [newObs, ...current] },
      }));
    } catch {
      set({ error: 'Gözlem eklenemedi.' });
      throw new Error('Add observation failed');
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
