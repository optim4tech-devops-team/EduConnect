import RouteStateScreen from '@/screens/shared/RouteStateScreen';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { getHomeRouteForRole } from '@/utils/roleRoutes';

export default function AccessDeniedScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  return (
    <RouteStateScreen
      icon="lock-closed-outline"
      eyebrow="Yetki Kontrolu"
      title="Bu alana erisim yok"
      description="Bu sayfa rolunuze acik degil. Uygun panele donerek isleme devam edebilirsiniz."
      primaryLabel="Ana Panele Don"
      primaryHref={getHomeRouteForRole(user?.role)}
      secondaryLabel="Cikis Yap ve Girise Don"
      secondaryAction={async () => {
        await logout();
        router.replace('/login');
      }}
    />
  );
}
