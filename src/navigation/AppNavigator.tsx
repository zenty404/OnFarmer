import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { AuthScreen } from '../screens/AuthScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { MapScreen } from '../screens/MapScreen';
import { ParcelDetailScreen } from '../screens/ParcelDetailScreen';

export type RootStackParamList = {
  Auth: undefined;
  Dashboard: undefined;
  Map: undefined;
  ParcelDetail: { parcelId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!session ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Map" component={MapScreen} />
            <Stack.Screen name="ParcelDetail" component={ParcelDetailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
