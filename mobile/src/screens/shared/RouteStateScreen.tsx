import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, Image, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/theme/colors';

interface RouteStateScreenProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  primaryLabel?: string;
  primaryHref?: string;
  primaryAction?: () => void;
  secondaryLabel?: string;
  secondaryAction?: () => void;
  eyebrow?: string;
}

export default function RouteStateScreen({
  icon,
  title,
  description,
  primaryLabel = 'Girişe Dön',
  primaryHref = '/login',
  primaryAction,
  secondaryLabel,
  secondaryAction,
  eyebrow = 'Yönlendirme',
}: RouteStateScreenProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[Colors.GRADIENT_START, Colors.GRADIENT_END, Colors.TEAL_600]}
        style={styles.gradient}
      >
        <View style={[styles.circle, styles.circleTopRight]} />
        <View style={[styles.circle, styles.circleBottomLeft]} />
      </LinearGradient>

      <View style={styles.shell}>
        <View style={[styles.card, isWide && styles.cardWide]}>
          <View style={styles.heroPanel}>
            <View style={styles.brandRow}>
              <View style={styles.logoFrame}>
                <Image
                  source={require('../../../assets/icon.png')}
                  style={styles.appLogo}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.brandTextGroup}>
                <Text style={styles.brandName}>Notio</Text>
                <Text style={styles.brandTag}>Onun dunyasina bir pencere.</Text>
              </View>
            </View>

            <View style={styles.heroContent}>
              <View style={styles.iconWrap}>
                <Ionicons name={icon} size={34} color={Colors.PRIMARY} />
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{eyebrow}</Text>
              </View>
            </View>

            <View style={styles.heroCircleLg} />
            <View style={styles.heroCircleSm} />
          </View>

          <View style={styles.body}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={() => {
                if (primaryAction) {
                  primaryAction();
                  return;
                }
                router.replace(primaryHref as any);
              }}
            >
              <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
            </TouchableOpacity>

            {secondaryLabel && secondaryAction ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.8}
                onPress={secondaryAction}
              >
                <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  circle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  circleTopRight: {
    width: 220,
    height: 220,
    top: -70,
    right: -70,
  },
  circleBottomLeft: {
    width: 160,
    height: 160,
    bottom: 80,
    left: -55,
  },
  shell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: Colors.WHITE,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 6,
  },
  cardWide: {
    maxWidth: 640,
  },
  heroPanel: {
    position: 'relative',
    backgroundColor: 'rgba(10,46,38,0.96)',
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 22,
    overflow: 'hidden',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoFrame: {
    width: 82,
    height: 82,
    borderRadius: 26,
    backgroundColor: Colors.TEAL_700,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  appLogo: {
    width: 104,
    height: 104,
  },
  brandTextGroup: {
    marginLeft: 12,
    flex: 1,
  },
  brandName: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.WHITE,
    letterSpacing: 1.1,
  },
  brandTag: {
    marginTop: 2,
    fontSize: 14,
    color: 'rgba(255,255,255,0.74)',
    letterSpacing: 0.3,
  },
  heroContent: {
    marginTop: 26,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: Colors.WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  statusPillText: {
    color: Colors.WHITE,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  heroCircleLg: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -30,
    right: -70,
  },
  heroCircleSm: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.07)',
    bottom: -18,
    right: 34,
  },
  body: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.TEXT,
    textAlign: 'center',
  },
  description: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 24,
    color: Colors.TEXT_MUTED,
    textAlign: 'center',
    maxWidth: 480,
  },
  primaryButton: {
    marginTop: 26,
    width: '100%',
    borderRadius: 16,
    backgroundColor: Colors.PRIMARY,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.WHITE,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    marginTop: 12,
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.PRIMARY + '24',
    backgroundColor: Colors.TEAL_50,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },
});
