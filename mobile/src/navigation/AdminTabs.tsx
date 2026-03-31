import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../theme/colors';
import AdminDashboard from '../screens/admin/AdminDashboard';
import ManageClassesScreen from '../screens/admin/ManageClassesScreen';
import ManageTeachersScreen from '../screens/admin/ManageTeachersScreen';
import MessagesScreen from '../screens/shared/MessagesScreen';

export type AdminTabParamList = {
  Panel: undefined;
  Siniflar: undefined;
  Ogretmenler: undefined;
  Duyurular: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

export default function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.INFO,
        tabBarInactiveTintColor: '#A0A0A0',
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
          let iconName: keyof typeof Ionicons.glyphMap = 'grid';
          if (route.name === 'Panel') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Siniflar') {
            iconName = focused ? 'school' : 'school-outline';
          } else if (route.name === 'Ogretmenler') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Duyurular') {
            iconName = focused ? 'megaphone' : 'megaphone-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Panel" component={AdminDashboard} options={{ tabBarLabel: 'Panel' }} />
      <Tab.Screen name="Siniflar" component={ManageClassesScreen} options={{ tabBarLabel: 'Sınıflar' }} />
      <Tab.Screen name="Ogretmenler" component={ManageTeachersScreen} options={{ tabBarLabel: 'Öğretmenler' }} />
      <Tab.Screen name="Duyurular" component={MessagesScreen} options={{ tabBarLabel: 'Duyurular' }} />
    </Tab.Navigator>
  );
}
