import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/theme/colors';
import type { UserRole } from '@/api/client';

interface GeneratedProfileAvatarProps {
  name: string;
  role?: UserRole;
  size?: number;
}

const TEACHER_VARIANTS = [
  {
    start: Colors.TEAL_700,
    end: Colors.TEAL_500,
    accent: Colors.ACCENT,
    icon: 'school-outline' as const,
  },
  {
    start: Colors.TEAL_800,
    end: Colors.TEAL_600,
    accent: Colors.AMBER_400,
    icon: 'sparkles-outline' as const,
  },
  {
    start: '#1E3A8A',
    end: '#2563EB',
    accent: '#93C5FD',
    icon: 'color-palette-outline' as const,
  },
  {
    start: '#7C3AED',
    end: '#A855F7',
    accent: '#F0ABFC',
    icon: 'brush-outline' as const,
  },
  {
    start: '#BE185D',
    end: '#EC4899',
    accent: '#F9A8D4',
    icon: 'flower-outline' as const,
  },
];

function hashString(value: string) {
  return value.split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function GeneratedProfileAvatar({
  name,
  role,
  size = 84,
}: GeneratedProfileAvatarProps) {
  const seed = useMemo(() => hashString(name), [name]);
  const variant = TEACHER_VARIANTS[seed % TEACHER_VARIANTS.length];
  const blobOffset = (seed % 5) * 4;
  const initials = getInitials(name);
  const iconSize = Math.max(18, size * 0.26);

  if (role !== 'Teacher') {
    return (
      <View
        style={[
          styles.initialsShell,
          {
            width: size + 8,
            height: size + 8,
            borderRadius: (size + 8) / 2,
          },
        ]}
      >
        <View
          style={[
            styles.initialsCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          <Text style={[styles.initialsText, { fontSize: size * 0.36 }]}>{initials}</Text>
        </View>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[variant.start, variant.end]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.teacherAvatar,
        {
          width: size,
          height: size,
          borderRadius: size * 0.3,
        },
      ]}
    >
      <View
        style={[
          styles.blob,
          {
            width: size * 0.62,
            height: size * 0.62,
            borderRadius: size * 0.28,
            backgroundColor: `${variant.accent}66`,
            top: -size * 0.08,
            right: -blobOffset,
          },
        ]}
      />
      <View
        style={[
          styles.blob,
          {
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: size * 0.18,
            backgroundColor: 'rgba(255,255,255,0.18)',
            bottom: -size * 0.06,
            left: -blobOffset / 2,
          },
        ]}
      />

      <View
        style={[
          styles.iconBadge,
          {
            width: size * 0.5,
            height: size * 0.5,
            borderRadius: size * 0.22,
          },
        ]}
      >
        <Ionicons name={variant.icon} size={iconSize} color={Colors.WHITE} />
      </View>

      <View style={styles.initialsPill}>
        <Text style={[styles.pillText, { fontSize: Math.max(10, size * 0.14) }]}>{initials}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  initialsShell: {
    padding: 4,
    backgroundColor: Colors.SECONDARY + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsCircle: {
    backgroundColor: Colors.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  initialsText: {
    color: Colors.WHITE,
    fontWeight: '800',
  },
  teacherAvatar: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 7,
  },
  blob: {
    position: 'absolute',
  },
  iconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  initialsPill: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: {
    color: Colors.SLATE_900,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
