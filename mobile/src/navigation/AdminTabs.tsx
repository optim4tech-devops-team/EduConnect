import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../theme/colors';
import AdminDashboard from '../screens/admin/AdminDashboard';
import ManageClassesScreen from '../screens/admin/ManageClassesScreen';
import ManageStudentsScreen from '../screens/admin/ManageStudentsScreen';
import ManageParentsScreen from '../screens/admin/ManageParentsScreen';
import ManageTeachersScreen from '../screens/admin/ManageTeachersScreen';
import SchoolCalendarScreen from '../screens/admin/SchoolCalendarScreen';

export type AdminTabParamList = {
  Panel: undefined;
  Siniflar: undefined;
  Ogrenciler: undefined;
  Veliler: undefined;
  Ogretmenler: undefined;
  Takvim: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

export default function AdminTabs() {
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
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'grid';
          if (route.name === 'Panel') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Siniflar') {
            iconName = focused ? 'school' : 'school-outline';
          } else if (route.name === 'Ogrenciler') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Veliler') {
            iconName = focused ? 'person-add' : 'person-add-outline';
          } else if (route.name === 'Ogretmenler') {
            iconName = focused ? 'ribbon' : 'ribbon-outline';
          } else if (route.name === 'Takvim') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Panel" component={AdminDashboard} options={{ tabBarLabel: 'Panel' }} />
      <Tab.Screen name="Siniflar" component={ManageClassesScreen} options={{ tabBarLabel: 'Sınıflar' }} />
      <Tab.Screen name="Ogrenciler" component={ManageStudentsScreen} options={{ tabBarLabel: 'Öğrenciler' }} />
      <Tab.Screen name="Veliler" component={ManageParentsScreen} options={{ tabBarLabel: 'Veliler' }} />
      <Tab.Screen name="Ogretmenler" component={ManageTeachersScreen} options={{ tabBarLabel: 'Öğretmenler' }} />
      <Tab.Screen name="Takvim" component={SchoolCalendarScreen} options={{ tabBarLabel: 'Takvim' }} />
    </Tab.Navigator>
  );
}
