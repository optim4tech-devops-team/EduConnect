import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/theme/colors';
import { useFormStore } from '@/store/formStore';

export default function FormListScreen() {
  const { submissions, isLoading, fetchSubmissions } = useFormStore();

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const pending = submissions.filter((s) => s.status === 'pending');
  const completed = submissions.filter((s) => s.status === 'submitted');

  const renderItem = ({ item }: { item: typeof submissions[0] }) => {
    const isPending = item.status === 'pending';
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.85}>
        <View style={[styles.statusDot, { backgroundColor: isPending ? Colors.ACCENT : Colors.SUCCESS }]} />
        <View style={styles.cardContent}>
          <Text style={styles.formTitle}>{item.templateTitle}</Text>
          <Text style={styles.formMeta}>
            {isPending ? 'Doldurulması bekleniyor' : `Gönderildi · ${new Date(item.submittedAt).toLocaleDateString('tr-TR')}`}
          </Text>
        </View>
        <Ionicons
          name={isPending ? 'chevron-forward' : 'checkmark-circle'}
          size={20}
          color={isPending ? Colors.TEXT_MUTED : Colors.SUCCESS}
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />
      <View style={styles.headerRow}>
        <Text style={styles.title}>Formlar</Text>
        {pending.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pending.length}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={[...pending, ...completed]}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={Colors.BORDER} />
              <Text style={styles.emptyText}>Henüz form yok</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 10,
  },
  title: { fontSize: 24, fontWeight: '800', color: Colors.TEXT },
  badge: {
    backgroundColor: Colors.ACCENT,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.WHITE,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 14 },
  cardContent: { flex: 1 },
  formTitle: { fontSize: 15, fontWeight: '600', color: Colors.TEXT, marginBottom: 4 },
  formMeta: { fontSize: 13, color: Colors.TEXT_MUTED },
  separator: { height: 10 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: Colors.TEXT_MUTED },
});
