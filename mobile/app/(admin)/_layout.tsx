import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';

export default function AdminLayout() {
  const { user, isInitialized } = useAuthStore();
  const isPlatformAdmin = user?.role === 'PlatformAdmin' || user?.role === 'Admin';
  const isAllowed = user?.role === 'PlatformAdmin' || user?.role === 'Admin' || user?.role === 'SchoolAdmin';

  if (!isInitialized) return null;
  if (!user) return <Redirect href="/login" />;
  if (!isAllowed) return <Redirect href="/access-denied" />;

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#FF8C42' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: isPlatformAdmin ? 'Okullar' : 'Panel',
          tabBarIcon: ({ color }) => (
            <Ionicons name={isPlatformAdmin ? 'business' : 'grid'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: 'Sınıflar',
          tabBarIcon: ({ color }) => <Ionicons name="school" size={24} color={color} />,
          href: isPlatformAdmin ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="teachers"
        options={{
          title: 'Öğretmenler',
          tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />,
          href: isPlatformAdmin ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: 'Öğrenciler',
          href: null,
        }}
      />
      <Tabs.Screen
        name="parents"
        options={{
          title: 'Veliler',
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
