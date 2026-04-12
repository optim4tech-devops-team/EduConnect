import { useAuthStore } from '@/store/authStore';
import PlatformDashboard from '@/screens/admin/PlatformDashboard';
import AdminDashboard from '@/screens/admin/AdminDashboard';

export default function AdminIndex() {
  const { user } = useAuthStore();
  if (user?.role === 'PlatformAdmin' || user?.role === 'Admin') {
    return <PlatformDashboard />;
  }
  return <AdminDashboard />;
}
