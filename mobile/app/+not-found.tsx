import RouteStateScreen from '@/screens/shared/RouteStateScreen';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { getHomeRouteForRole } from '@/utils/roleRoutes';

export default function NotFoundScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const isSignedIn = !!user;

  return (
    <RouteStateScreen
      icon="compass-outline"
      eyebrow="Sayfa Durumu"
      title="Sayfa bulunamadi"
      description="Acmak istediginiz sayfa bu uygulamada bulunamadi ya da kaldirildi. Guvenli sekilde dogru ekrana donebilirsiniz."
      primaryLabel={isSignedIn ? 'Panele Don' : 'Giris Ekranina Don'}
      primaryHref={isSignedIn ? getHomeRouteForRole(user?.role) : '/login'}
      secondaryLabel={isSignedIn ? 'Cikis Yap ve Girise Don' : undefined}
      secondaryAction={
        isSignedIn
          ? async () => {
              await logout();
              router.replace('/login');
            }
          : undefined
      }
    />
  );
}
