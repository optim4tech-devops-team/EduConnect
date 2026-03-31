import { create } from 'zustand';
import { postApi, PostDto } from '../api/client';

interface PostStore {
  posts: PostDto[];
  isLoading: boolean;
  error: string | null;
  fetchPosts: (classId?: string) => Promise<void>;
  createPost: (data: FormData) => Promise<PostDto>;
  confirmTags: (postId: string, tags: { studentId: string; isConfirmed: boolean }[]) => Promise<void>;
  publishPost: (postId: string) => Promise<void>;
  clearError: () => void;
}

export const usePostStore = create<PostStore>((set, get) => ({
  posts: [],
  isLoading: false,
  error: null,

  fetchPosts: async (classId?: string) => {
    try {
      set({ isLoading: true, error: null });
      const { data } = await postApi.list(classId);
      set({ posts: data, isLoading: false });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gönderiler yüklenemedi.';
      set({ isLoading: false, error: message });
    }
  },

  createPost: async (formData: FormData) => {
    try {
      set({ isLoading: true, error: null });
      const { data } = await postApi.create(formData);
      set((state) => ({ posts: [data, ...state.posts], isLoading: false }));
      return data;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gönderi oluşturulamadı.';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  confirmTags: async (postId: string, tags: { studentId: string; isConfirmed: boolean }[]) => {
    try {
      await postApi.confirmTags(postId, tags);
      const { data } = await postApi.get(postId);
      set((state) => ({
        posts: state.posts.map((p) => (p.id === postId ? data : p)),
      }));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Etiketler onaylanamadı.';
      set({ error: message });
      throw new Error(message);
    }
  },

  publishPost: async (postId: string) => {
    try {
      await postApi.publish(postId);
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId ? { ...p, isPublished: true } : p
        ),
      }));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gönderi yayınlanamadı.';
      set({ error: message });
      throw new Error(message);
    }
  },

  clearError: () => set({ error: null }),
}));
