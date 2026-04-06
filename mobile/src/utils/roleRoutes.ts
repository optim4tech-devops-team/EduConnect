import type { Href } from 'expo-router';
import type { UserRole } from '@/api/client';

export function getHomeRouteForRole(role?: UserRole | null): Href {
  switch (role) {
    case 'Teacher':
      return '/(teacher)';
    case 'Parent':
      return '/(parent)';
    case 'SchoolAdmin':
    case 'PlatformAdmin':
    case 'Admin':
      return '/(admin)';
    default:
      return '/login';
  }
}
