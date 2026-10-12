import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { APP_DISPLAY_NAME, FACILITY_NAME, THEME } from '../config/api';

export function FacilityLogoMark() {
  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel={FACILITY_NAME}>
      <View style={styles.badge}>
        <Text style={styles.county}>KAKAMEGA COUNTY</Text>
        <View style={styles.divider} />
        <Text style={styles.hospital}>County General</Text>
        <Text style={styles.hospitalSub}>Teaching & Referral Hospital</Text>
      </View>
      <Text style={styles.appName}>{APP_DISPLAY_NAME}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: THEME.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    minWidth: 260,
    borderWidth: 2,
    borderColor: THEME.accent,
  },
  county: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
    width: '100%',
    marginVertical: 8,
  },
  hospital: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  hospitalSub: {
    color: '#E8F5E9',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  appName: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: THEME.accent,
  },
});
