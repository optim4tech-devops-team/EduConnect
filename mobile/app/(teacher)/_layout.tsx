import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';

export default function TeacherLayout() {
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) return null;
  if (!user) return <Redirect href="/login" />;
  if (user.role !== 'Teacher') return <Redirect href="/access-denied" />;

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#FF8C42' }}>
      <Tabs.Screen name="index" options={{ title: 'Ana Sayfa', tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} /> }} />
      <Tabs.Screen name="attendance" options={{ href: null }} />
      <Tabs.Screen name="students" options={{ title: 'Öğrenciler', tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} /> }} />
      <Tabs.Screen name="messages" options={{ title: 'Mesajlar', tabBarIcon: ({ color }) => <Ionicons name="chatbubbles" size={24} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} /> }} />
    </Tabs>
  );
}
