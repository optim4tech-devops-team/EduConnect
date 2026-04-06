import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../theme/colors';
import ParentDashboard from '../screens/parent/ParentDashboard';
import FormListScreen from '../screens/parent/FormListScreen';
import ChildGalleryScreen from '../screens/parent/ChildGalleryScreen';
import MessagesScreen from '../screens/shared/MessagesScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

export type ParentTabParamList = {
  AnaSayfa: undefined;
  Formlar: undefined;
  Fotograflar: undefined;
  Mesajlar: undefined;
  Profil: undefined;
};

const Tab = createBottomTabNavigator<ParentTabParamList>();

export default function ParentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.PRIMARY,
        tabBarInactiveTintColor: '#A0A0A0',
        tabBarStyle: {
          backgroundColor: Colors.WHITE,
          borderTopColor: Colors.BORDER,
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 62,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'AnaSayfa') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Formlar') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Fotograflar') {
            iconName = focused ? 'images' : 'images-outline';
          } else if (route.name === 'Mesajlar') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profil') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="AnaSayfa" component={ParentDashboard} options={{ tabBarLabel: 'Ana Sayfa' }} />
      <Tab.Screen name="Formlar" component={FormListScreen} options={{ tabBarLabel: 'Formlar' }} />
      <Tab.Screen name="Fotograflar" component={ChildGalleryScreen} options={{ tabBarLabel: 'Fotoğraflar' }} />
      <Tab.Screen name="Mesajlar" component={MessagesScreen} options={{ tabBarLabel: 'Mesajlar' }} />
      <Tab.Screen name="Profil" component={ProfileScreen} options={{ tabBarLabel: 'Profil' }} />
    </Tab.Navigator>
  );
}
