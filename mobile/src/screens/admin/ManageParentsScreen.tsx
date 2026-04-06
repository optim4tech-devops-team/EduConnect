import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../theme/colors';
import { parentApi, UserDto } from '../../api/client';

export default function ManageParentsScreen() {
  const [parents, setParents] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await parentApi.list();
      setParents(res.data as unknown as UserDto[]);
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const renderParent = ({ item }: { item: UserDto }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name?.charAt(0) ?? '?'}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.parentName}>{item.name}</Text>
        <Text style={styles.parentMeta}>{item.phone ?? item.email ?? '—'}</Text>
      </View>
      <TouchableOpacity
        style={styles.linkBtn}
        onPress={() => Alert.alert('Öğrenci Bağla', 'Bu özellik yakında aktif olacak.')}
      >
        <Ionicons name="link-outline" size={18} color={Colors.PRIMARY} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />

      <View style={styles.header}>
        <Text style={styles.title}>Veliler</Text>
        <Text style={styles.count}>{parents.length} veli</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={parents}
          keyExtractor={(item) => item.id}
          renderItem={renderParent}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={Colors.BORDER} />
              <Text style={styles.emptyText}>Henüz veli kaydı yok</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '800', color: Colors.TEXT },
  count: { fontSize: 14, color: Colors.TEXT_MUTED },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.WHITE,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.INFO_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: Colors.INFO },
  cardInfo: { flex: 1 },
  parentName: { fontSize: 15, fontWeight: '600', color: Colors.TEXT },
  parentMeta: { fontSize: 13, color: Colors.TEXT_MUTED, marginTop: 2 },
  linkBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.PRIMARY_LIGHT,
  },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: Colors.TEXT_MUTED },
});
