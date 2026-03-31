import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../theme/colors';

interface BadgeChipProps {
  name: string;
  icon?: string;
  color?: string;
}

const BadgeChip: React.FC<BadgeChipProps> = ({ name, icon, color }) => {
  return (
    <View style={[styles.chip, { backgroundColor: color ?? Colors.SECONDARY }]}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.label} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 4,
  },
  icon: {
    fontSize: 13,
    marginRight: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.TEXT,
  },
});

export default BadgeChip;
