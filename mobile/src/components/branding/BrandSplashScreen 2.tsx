import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/theme/colors';

const SPLASH_TAGLINE = 'Onun dünyasına bir pencere.';

export default function BrandSplashScreen() {
  const [typedLength, setTypedLength] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 55,
        useNativeDriver: true,
      }),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 420,
        delay: 120,
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 420,
        delay: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [logoOpacity, logoScale, textOpacity, textTranslateY]);

  useEffect(() => {
    if (typedLength >= SPLASH_TAGLINE.length) return;

    const timer = setTimeout(() => {
      setTypedLength((current) => current + 1);
    }, 55);

    return () => clearTimeout(timer);
  }, [typedLength]);

  useEffect(() => {
    const cursorTimer = setInterval(() => {
      setShowCursor((current) => !current);
    }, 420);

    return () => clearInterval(cursorTimer);
  }, []);

  return (
    <LinearGradient
      colors={[Colors.GRADIENT_START, Colors.GRADIENT_END, Colors.TEAL_600]}
      style={styles.container}
    >
      <View style={[styles.glow, styles.glowTop]} />
      <View style={[styles.glow, styles.glowBottom]} />

      <Animated.View
        style={[
          styles.logoShell,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <View style={styles.logoCircle}>
          <Image source={require('../../../assets/icon.png')} style={styles.logo} />
        </View>
      </Animated.View>

      <Animated.Text
        style={[
          styles.brand,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        Notio
      </Animated.Text>

      <Animated.View
        style={[
          styles.taglineRow,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        <Text style={styles.tagline}>{SPLASH_TAGLINE.slice(0, typedLength)}</Text>
        <Text style={[styles.cursor, !showCursor && styles.cursorHidden]}>|</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: Colors.GRADIENT_START,
  },
  glow: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  glowTop: {
    width: 250,
    height: 250,
    top: -90,
    right: -80,
  },
  glowBottom: {
    width: 210,
    height: 210,
    bottom: -70,
    left: -70,
  },
  logoShell: {
    padding: 12,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 18,
  },
  logoCircle: {
    width: 112,
    height: 112,
    borderRadius: 30,
    backgroundColor: Colors.WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 10,
  },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 22,
  },
  brand: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: Colors.WHITE,
    textTransform: 'lowercase',
  },
  taglineRow: {
    marginTop: 14,
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagline: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
  },
  cursor: {
    marginLeft: 2,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.ACCENT,
  },
  cursorHidden: {
    opacity: 0,
  },
});
