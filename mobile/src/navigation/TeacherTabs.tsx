import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../theme/colors';
import TeacherDashboard from '../screens/teacher/TeacherDashboard';
import ClassListScreen from '../screens/teacher/ClassListScreen';
import PostCreateScreen from '../screens/teacher/PostCreateScreen';
import MessagesScreen from '../screens/shared/MessagesScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

export type TeacherTabParamList = {
  AnaSayfa: undefined;
  Sinif: undefined;
  Paylas: undefined;
  Mesajlar: undefined;
  Profil: undefined;
};

const Tab = createBottomTabNavigator<TeacherTabParamList>();

export default function TeacherTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.PRIMARY,
        tabBarInactiveTintColor: Colors.SLATE_500,
        tabBarStyle: {
          backgroundColor: Colors.WHITE,
          borderTopColor: Colors.BORDER,
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 62,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'AnaSayfa') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Sinif') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Paylas') {
            iconName = focused ? 'camera' : 'camera-outline';
          } else if (route.name === 'Mesajlar') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profil') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="AnaSayfa" component={TeacherDashboard} options={{ tabBarLabel: 'Ana Sayfa' }} />
      <Tab.Screen name="Sinif" component={ClassListScreen} options={{ tabBarLabel: 'Sınıf' }} />
      <Tab.Screen name="Paylas" component={PostCreateScreen} options={{ tabBarLabel: 'Paylaş' }} />
      <Tab.Screen name="Mesajlar" component={MessagesScreen} options={{ tabBarLabel: 'Mesajlar' }} />
      <Tab.Screen name="Profil" component={ProfileScreen} options={{ tabBarLabel: 'Profil' }} />
    </Tab.Navigator>
  );
}
