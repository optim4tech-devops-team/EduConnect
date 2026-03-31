import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../theme/colors';
import { studentApi, badgeApi, BadgeAwardDto, StudentDto } from '../../api/client';

const BADGE_EMOJIS = ['🌟', '🏆', '🎯', '💡', '🎨', '🌈', '🦋', '🚀', '❤️', '👑', '⭐', '🎖️'];

function getBadgeEmoji(badgeName: string, index: number): string {
  const lower = badgeName.toLowerCase();
  if (lower.includes('yıldız') || lower.includes('star')) return '⭐';
  if (lower.includes('kahraman') || lower.includes('hero')) return '🦸';
  if (lower.includes('sanat') || lower.includes('art')) return '🎨';
  if (lower.includes('bilim') || lower.includes('science')) return '🔬';
  if (lower.includes('spor') || lower.includes('sport')) return '⚽';
  return BADGE_EMOJIS[index % BADGE_EMOJIS.length];
}

export default function BadgeViewScreen() {
  const [child, setChild] = useState<StudentDto | null>(null);
  const [badges, setBadges] = useState<BadgeAwardDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const { data: children } = await studentApi.myChildren();
      const firstChild = children[0] ?? null;
      setChild(firstChild);
      if (firstChild) {
        const { data: badgeData } = await badgeApi.studentBadges(firstChild.id);
        setBadges(badgeData);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const renderBadge = ({ item, index }: { item: BadgeAwardDto; index: number }) => (
    <View style={styles.card}>
      <View style={[styles.badgeCircle, { backgroundColor: item.badgeColor ? item.badgeColor + '33' : Colors.SECONDARY + '44' }]}>
        <Text style={styles.badgeEmoji}>{getBadgeEmoji(item.badgeName, index)}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.badgeName}>{item.badgeName}</Text>
        <Text style={styles.awardedBy}>{item.awardedByName} tarafından</Text>
        <Text style={styles.awardedAt}>
          {new Date(item.awardedAt).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
        {item.note && <Text style={styles.note}>"{item.note}"</Text>}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />
      <View style={styles.header}>
        <Text style={styles.title}>
          {child ? `${child.name.split(' ')[0]}'nin Rozetleri` : 'Rozetler'}
        </Text>
        <Text style={styles.subtitle}>Toplam {badges.length} rozet</Text>
      </View>

      {/* Stats row */}
      {badges.length > 0 && (
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{badges.length}</Text>
            <Text style={styles.statLabel}>Toplam</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {new Set(badges.map((b) => b.badgeId)).size}
            </Text>
            <Text style={styles.statLabel}>Farklı Rozet</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {badges.filter((b) => {
                const d = new Date(b.awardedAt);
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              }).length}
            </Text>
            <Text style={styles.statLabel}>Bu Ay</Text>
          </View>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={Colors.PARENT_PINK} style={{ marginTop: 40 }} />
      ) : badges.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🏆</Text>
          <Text style={styles.emptyTitle}>Henüz rozet kazanılmadı</Text>
          <Text style={styles.emptySubtitle}>Çalışmaya devam edin!</Text>
        </View>
      ) : (
        <FlatList
          data={badges}
          keyExtractor={(item) => item.id}
          renderItem={renderBadge}
          contentContainerStyle={styles.list}
          numColumns={2}
          columnWrapperStyle={styles.row}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.TEXT },
  subtitle: { fontSize: 14, color: Colors.TEXT, opacity: 0.55, marginTop: 2 },
  statsCard: {
    backgroundColor: Colors.WHITE,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: '800', color: Colors.PARENT_PINK },
  statLabel: { fontSize: 12, color: Colors.TEXT, opacity: 0.55, marginTop: 2 },
  statDivider: { width: 1, height: 40, backgroundColor: Colors.BORDER },
  list: { paddingHorizontal: 14, paddingBottom: 40 },
  row: { gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    backgroundColor: Colors.WHITE,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  badgeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  badgeEmoji: { fontSize: 32 },
  cardContent: { alignItems: 'center' },
  badgeName: { fontSize: 14, fontWeight: '700', color: Colors.TEXT, textAlign: 'center', marginBottom: 4 },
  awardedBy: { fontSize: 11, color: Colors.TEXT, opacity: 0.5, textAlign: 'center' },
  awardedAt: { fontSize: 11, color: Colors.TEXT, opacity: 0.4, textAlign: 'center', marginTop: 2 },
  note: {
    fontSize: 11,
    color: Colors.INFO,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyEmoji: { fontSize: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.TEXT, opacity: 0.6 },
  emptySubtitle: { fontSize: 14, color: Colors.TEXT, opacity: 0.4 },
});
