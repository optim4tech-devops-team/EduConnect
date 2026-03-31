import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from '../store/authStore';
import Colors from '../theme/colors';
import LoginScreen from '../screens/auth/LoginScreen';
import TeacherTabs from './TeacherTabs';
import ParentTabs from './ParentTabs';
import AdminTabs from './AdminTabs';

export type RootStackParamList = {
  Login: undefined;
  TeacherTabs: undefined;
  ParentTabs: undefined;
  AdminTabs: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { user, isInitialized, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized || isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </View>
    );
  }

  const getRoleNavigator = () => {
    if (!user) return null;
    switch (user.role) {
      case 'Admin':
        return <Stack.Screen name="AdminTabs" component={AdminTabs} />;
      case 'Teacher':
        return <Stack.Screen name="TeacherTabs" component={TeacherTabs} />;
      case 'Parent':
        return <Stack.Screen name="ParentTabs" component={ParentTabs} />;
      default:
        return null;
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          getRoleNavigator()
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.BACKGROUND,
  },
});
