import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import LoginScreen from '@/screens/auth/LoginScreen';

export default function LoginPage() {
  const { user, isInitialized } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) return;
    if (user.role === 'Teacher') router.replace('/(teacher)');
    else if (user.role === 'Parent') router.replace('/(parent)');
    else if (user.role === 'Admin') router.replace('/(admin)');
  }, [user, isInitialized]);

  return <LoginScreen />;
}
