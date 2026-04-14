import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Colors from '@/theme/colors';
import { getSchoolBranding } from '@/branding/schools';

interface SchoolBrandBadgeProps {
  schoolId?: string | null;
  schoolName?: string | null;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function SchoolBrandBadge({
  schoolId,
  schoolName,
}: SchoolBrandBadgeProps) {
  const branding = getSchoolBranding(schoolId, schoolName);

  return (
    <View style={styles.container}>
      {branding.logo ? (
        <Image source={branding.logo} style={styles.logo} resizeMode="contain" />
      ) : (
        <>
          <View style={styles.fallbackIcon}>
            <Text style={styles.fallbackInitials}>{getInitials(branding.name)}</Text>
          </View>
          <Text style={styles.fallbackName} numberOfLines={2}>
            {branding.name}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 120,
    height: 46,
    borderRadius: 16,
    backgroundColor: Colors.WHITE,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  logo: {
    width: 116,
    height: 28,
  },
  fallbackIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  fallbackInitials: {
    color: Colors.PRIMARY,
    fontSize: 12,
    fontWeight: '800',
  },
  fallbackName: {
    color: Colors.TEXT,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});
