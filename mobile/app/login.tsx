import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import LoginScreen from '@/screens/auth/LoginScreen';
import { getHomeRouteForRole } from '@/utils/roleRoutes';

export default function LoginPage() {
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return null;
  }

  if (user) {
    if (user.mustChangePassword) {
      return <Redirect href="/change-password" />;
    }
    return <Redirect href={getHomeRouteForRole(user.role)} />;
  }

  return <LoginScreen />;
}
