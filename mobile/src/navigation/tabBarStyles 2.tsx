import React from 'react';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Colors from '@/theme/colors';

function ModernTabBarButton({ children, style, accessibilityState, ...props }: BottomTabBarButtonProps) {
  const focused = accessibilityState?.selected;

  return (
    <Pressable {...props} style={[styles.tabPressable, style]}>
      <View style={[styles.tabButtonInner, focused && styles.tabButtonInnerFocused]}>
        <View style={styles.tabButtonContent}>{children}</View>
        {focused ? <View style={styles.activeIndicator} /> : null}
      </View>
    </Pressable>
  );
}

export function buildModernTabOptions(activeTintColor = Colors.PRIMARY) {
  return {
    headerShown: false,
    sceneStyle: { backgroundColor: Colors.BACKGROUND },
    tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: activeTintColor,
    tabBarInactiveTintColor: Colors.SLATE_500,
    tabBarButton: (props: BottomTabBarButtonProps) => <ModernTabBarButton {...props} />,
    tabBarStyle: styles.tabBar,
    tabBarBackground: () => (
      <View pointerEvents="none" style={styles.tabBarBackground}>
        <LinearGradient
          colors={['rgba(255,255,255,0.96)', 'rgba(248,250,252,0.92)']}
          start={{ x: 0.08, y: 0 }}
          end={{ x: 0.92, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.tabBarHighlight} />
      </View>
    ),
    tabBarItemStyle: styles.tabItem,
    tabBarLabelStyle: styles.tabLabel,
    tabBarIconStyle: styles.tabIcon,
  };
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: Platform.OS === 'ios' ? 22 : 12,
    height: Platform.OS === 'ios' ? 80 : 74,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    shadowColor: 'transparent',
    overflow: 'visible',
  },
  tabBarBackground: {
    flex: 1,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(203,213,225,0.72)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 26,
    elevation: 14,
    overflow: 'hidden',
  },
  tabBarHighlight: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  tabPressable: {
    flex: 1,
    marginHorizontal: 2,
  },
  tabItem: {
    marginHorizontal: 2,
    marginVertical: 0,
    borderRadius: 22,
    overflow: 'visible',
  },
  tabIcon: {
    marginTop: Platform.OS === 'ios' ? 2 : 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
    marginBottom: Platform.OS === 'ios' ? 1 : 0,
  },
  tabButtonInner: {
    minHeight: Platform.OS === 'ios' ? 52 : 50,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 1,
  },
  tabButtonInnerFocused: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(203,213,225,0.55)',
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
    transform: [{ translateY: -2 }],
  },
  tabButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  activeIndicator: {
    marginTop: 2,
    width: 18,
    height: 4,
    borderRadius: 999,
    backgroundColor: Colors.PRIMARY,
    opacity: 0.88,
  },
});
