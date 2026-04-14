import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { StudentGender } from '@/api/client';
import { getStudentTone } from '@/utils/studentProfile';

interface StudentProfileAvatarProps {
  name: string;
  avatarUrl?: string;
  gender?: StudentGender;
  size?: number;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function StudentProfileAvatar({
  name,
  avatarUrl,
  gender = 'unknown',
  size = 56,
}: StudentProfileAvatarProps) {
  const tone = getStudentTone(gender);
  const initials = getInitials(name);

  if (avatarUrl) {
    return (
      <View
        style={[
          styles.photoFrame,
          {
            width: size + 6,
            height: size + 6,
            borderRadius: (size + 6) / 2,
            borderColor: tone.border,
          },
        ]}
      >
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[tone.start, tone.end]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.generatedAvatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: tone.border,
        },
      ]}
    >
      <View style={[styles.generatedBadge, { backgroundColor: tone.accent }]}>
        <Ionicons name="sparkles-outline" size={Math.max(10, size * 0.18)} color="#fff" />
      </View>
      <Text style={[styles.initials, { fontSize: size * 0.3, color: tone.text }]}>{initials}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  photoFrame: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  generatedAvatar: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  generatedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
