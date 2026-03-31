import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../theme/colors';

interface StudentCardProps {
  name: string;
  avatarUrl?: string;
  parentName?: string;
  badgeCount?: number;
}

const StudentCard: React.FC<StudentCardProps> = ({
  name,
  avatarUrl: _avatarUrl,
  parentName,
  badgeCount,
}) => {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        {parentName ? (
          <Text style={styles.parent} numberOfLines={1}>
            Veli: {parentName}
          </Text>
        ) : null}
      </View>
      {badgeCount !== undefined && badgeCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>⭐ {badgeCount}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.WHITE,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.INFO_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.INFO,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.TEXT,
  },
  parent: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  badge: {
    backgroundColor: Colors.SECONDARY,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.TEXT,
  },
});

export default StudentCard;
