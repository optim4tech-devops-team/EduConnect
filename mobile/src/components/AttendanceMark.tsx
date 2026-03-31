import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '../../theme/colors';

type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused' | null;

interface AttendanceMarkProps {
  status: AttendanceStatus;
  onPress: (status: AttendanceStatus) => void;
}

interface StatusOption {
  key: 'Present' | 'Absent' | 'Late' | 'Excused';
  label: string;
  icon: string;
  activeColor: string;
  borderColor: string;
}

const OPTIONS: StatusOption[] = [
  { key: 'Present', label: 'P', icon: '✓', activeColor: Colors.ACCENT, borderColor: Colors.ACCENT },
  { key: 'Absent', label: 'A', icon: '✗', activeColor: Colors.ERROR, borderColor: Colors.ERROR },
  { key: 'Late', label: 'L', icon: '⏰', activeColor: Colors.SECONDARY, borderColor: '#E6B800' },
  { key: 'Excused', label: 'E', icon: 'ℹ', activeColor: Colors.INFO, borderColor: Colors.INFO },
];

const AttendanceMark: React.FC<AttendanceMarkProps> = ({ status, onPress }) => {
  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => {
        const isActive = status === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.button,
              { borderColor: opt.borderColor },
              isActive && { backgroundColor: opt.activeColor },
            ]}
            onPress={() => onPress(isActive ? null : opt.key)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.icon,
                isActive ? styles.iconActive : { color: opt.borderColor },
              ]}
            >
              {opt.icon}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  button: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.WHITE,
  },
  icon: {
    fontSize: 14,
    fontWeight: '700',
  },
  iconActive: {
    color: Colors.WHITE,
  },
});

export default AttendanceMark;
