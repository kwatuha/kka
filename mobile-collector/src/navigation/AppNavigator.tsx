import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';

import apiService, { AuthUser } from '../services/api';
import LoginScreen from '../screens/LoginScreen';
import TemplatesScreen from '../screens/TemplatesScreen';
import SubmissionsScreen from '../screens/SubmissionsScreen';
import NewVisitScreen from '../screens/NewVisitScreen';
import ChemistReferralsScreen from '../screens/ChemistReferralsScreen';
import AssetVerifyScreen from '../screens/AssetVerifyScreen';
import QueueScreen from '../screens/QueueScreen';
import PharmacyDispenseScreen from '../screens/PharmacyDispenseScreen';
import RegisterPatientScreen from '../screens/RegisterPatientScreen';
import HospitalOverviewScreen from '../screens/HospitalOverviewScreen';
import ConsultationScreen from '../screens/ConsultationScreen';
import MainTabBar from '../components/MainTabBar';
import { THEME } from '../config/api';
import {
  getTabsForProfile,
  profileLabel,
  resolveFieldAppProfile,
  TabDef,
} from '../config/roleTabs';
import { refreshCatalog, refreshClinicalSnapshot } from '../services/syncService';
import { startNetworkAutoSync, stopNetworkAutoSync } from '../services/networkSync';
import { startClinicalPeriodicSync, stopClinicalPeriodicSync } from '../services/clinicalSyncService';

export const AuthContext = React.createContext<{
  logout: () => Promise<void>;
  user: AuthUser | null;
} | null>(null);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function renderTabScreen(tab: TabDef) {
  switch (tab.kind) {
    case 'overview':
      return <HospitalOverviewScreen />;
    case 'queue':
      return (
        <QueueScreen
          servicePoint={tab.servicePoint!}
          title={tab.title}
        />
      );
    case 'dispense':
      return <PharmacyDispenseScreen />;
    case 'register':
      return <RegisterPatientScreen />;
    case 'chemist':
      return <ChemistReferralsScreen />;
    case 'assets':
      return <AssetVerifyScreen />;
    case 'submissions':
      return <SubmissionsScreen />;
    case 'templates':
    default:
      return <TemplatesScreen />;
  }
}

const RoleMainTabs: React.FC<{ user: AuthUser | null }> = ({ user }) => {
  const profile = resolveFieldAppProfile(user?.roleName);
  const tabs = useMemo(() => getTabsForProfile(profile), [user?.roleName]);
  const workspace = profileLabel(profile);

  return (
    <Tab.Navigator
      tabBar={(props) => <MainTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {tabs.map((tab) => (
        <Tab.Screen
          key={tab.id}
          name={tab.id}
          options={{
            title: tab.title,
            tabBarLabel: tab.label,
            tabBarAccessibilityLabel: `${tab.label} — ${workspace}`,
          }}
        >
          {() => renderTabScreen(tab)}
        </Tab.Screen>
      ))}
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const session = await apiService.resumeSession();
      setIsAuthenticated(session.authenticated);
      setUser(session.user ?? (await apiService.getStoredUser()));
    } catch {
      setIsAuthenticated(false);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const logout = useCallback(async () => {
    stopNetworkAutoSync();
    stopClinicalPeriodicSync();
    await apiService.logout();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    apiService.setUnauthorizedHandler(() => {
      setUser(null);
      setIsAuthenticated(false);
    });
    return () => apiService.setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      stopNetworkAutoSync();
      stopClinicalPeriodicSync();
      return;
    }
    startNetworkAutoSync();
    refreshCatalog().catch(() => {});
    const profile = resolveFieldAppProfile(user?.roleName);
    if (profile === 'doctor') {
      refreshClinicalSnapshot('consultation').catch(() => {});
      startClinicalPeriodicSync(user?.roleName);
    } else if (profile === 'pharmacy' || profile === 'cashier') {
      const sp = profile === 'pharmacy' ? 'pharmacy' : 'cashier';
      refreshClinicalSnapshot(sp).catch(() => {});
      startClinicalPeriodicSync(user?.roleName);
    }
    return () => {
      stopNetworkAutoSync();
      stopClinicalPeriodicSync();
    };
  }, [isAuthenticated, user?.roleName]);

  if (isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={THEME.primary} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ logout, user }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <Stack.Screen name="Login">
              {() => <LoginScreen onLoginSuccess={() => void checkAuth()} />}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name="MainTabs">
                {() => <RoleMainTabs user={user} />}
              </Stack.Screen>
              <Stack.Screen name="NewVisit" component={NewVisitScreen} />
              <Stack.Screen name="Consultation" component={ConsultationScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
};

export default AppNavigator;
