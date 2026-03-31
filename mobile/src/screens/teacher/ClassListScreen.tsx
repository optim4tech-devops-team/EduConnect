import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../theme/colors';
import { studentApi, StudentDto } from '../../api/client';

// ─── Mock data (shown when API is unavailable) ────────────────────────────────
const MOCK_STUDENTS: StudentDto[] = [
  {
    id: 's1',
    name: 'Elif Yıldız',
    classId: 'c1',
    className: 'Papatyalar',
    parentName: 'Mehmet Yıldız',
    parentId: 'p1',
    badgeCount: 5,
  },
  {
    id: 's2',
    name: 'Can Demir',
    classId: 'c1',
    className: 'Papatyalar',
    parentName: 'Ayşe Demir',
    parentId: 'p2',
    badgeCount: 3,
  },
  {
    id: 's3',
    name: 'Zeynep Kaya',
    classId: 'c1',
    className: 'Papatyalar',
    parentName: 'Ali Kaya',
    parentId: 'p3',
    badgeCount: 0,
  },
  {
    id: 's4',
    name: 'Ahmet Çelik',
    classId: 'c1',
    className: 'Papatyalar',
    parentName: 'Fatma Çelik',
    parentId: 'p4',
    badgeCount: 7,
  },
  {
    id: 's5',
    name: 'Selin Arslan',
    classId: 'c1',
    className: 'Papatyalar',
    parentName: 'Hasan Arslan',
    parentId: 'p5',
    badgeCount: 2,
  },
  {
    id: 's6',
    name: 'Burak Şahin',
    classId: 'c1',
    className: 'Papatyalar',
    parentName: 'Merve Şahin',
    parentId: 'p6',
    badgeCount: 1,
  },
  {
    id: 's7',
    name: 'Deniz Aydın',
    classId: 'c1',
    className: 'Papatyalar',
    parentName: 'Osman Aydın',
    parentId: 'p7',
    badgeCount: 4,
  },
  {
    id: 's8',
    name: 'Ece Doğan',
    classId: 'c1',
    className: 'Papatyalar',
    parentName: 'Selma Doğan',
    parentId: 'p8',
    badgeCount: 0,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function ClassListScreen() {
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [filtered, setFiltered] = useState<StudentDto[]>([]);
  const [search, setSearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ── Filter whenever search or students change ─────────────────────────────
  useEffect(() => {
    if (search.trim() === '') {
      setFiltered(students);
    } else {
      const q = search.toLowerCase();
      setFiltered(
        students.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.parentName.toLowerCase().includes(q),
        ),
      );
    }
  }, [search, students]);

  const loadStudents = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await studentApi.list();
      setStudents(data);
      setFiltered(data);
    } catch {
      // Fall back to mock data
      setStudents(MOCK_STUDENTS);
      setFiltered(MOCK_STUDENTS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // ── Student card ──────────────────────────────────────────────────────────
  const renderStudent = ({ item }: { item: StudentDto }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.75}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.parentName}>Veli: {item.parentName}</Text>
      </View>

      {item.badgeCount > 0 && (
        <View style={styles.badgePill}>
          <Ionicons name="star" size={11} color={Colors.WHITE} />
          <Text style={styles.badgePillText}>{item.badgeCount}</Text>
        </View>
      )}

      <Ionicons name="chevron-forward" size={18} color={Colors.BORDER} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Sınıfım</Text>
          <Text style={styles.subtitle}>{students.length} öğrenci</Text>
        </View>
        <TouchableOpacity style={styles.filterButton} activeOpacity={0.7}>
          <Ionicons name="options-outline" size={20} color={Colors.PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* ── Search Bar ─────────────────────────────────────────────────── */}
      <View
        style={[
          styles.searchContainer,
          isFocused && styles.searchContainerFocused,
        ]}
      >
        <Ionicons
          name="search-outline"
          size={18}
          color={isFocused ? Colors.PRIMARY : Colors.TEXT}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Öğrenci veya veli ara..."
          placeholderTextColor="#B0B0B0"
          value={search}
          onChangeText={setSearch}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color="#B0B0B0" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Student List ────────────────────────────────────────────────── */}
      {isLoading ? (
        <ActivityIndicator
          color={Colors.PRIMARY}
          size="large"
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderStudent}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={52} color={Colors.BORDER} />
              <Text style={styles.emptyTitle}>Öğrenci bulunamadı</Text>
              <Text style={styles.emptySubtitle}>
                {search.length > 0
                  ? 'Arama kriterlerinizi değiştirin'
                  : 'Henüz öğrenci eklenmemiş'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── FAB (+) ─────────────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Ionicons name="add" size={30} color={Colors.WHITE} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.TEXT,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.TEXT,
    opacity: 0.5,
    marginTop: 2,
  },
  filterButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.PRIMARY + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.WHITE,
    marginHorizontal: 22,
    marginBottom: 14,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchContainerFocused: {
    borderColor: Colors.PRIMARY,
    shadowColor: Colors.PRIMARY,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIcon: {
    opacity: 0.55,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.TEXT,
    padding: 0,
  },

  // List
  listContent: {
    paddingHorizontal: 22,
    paddingBottom: 110,
  },

  // Student card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.WHITE,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.PRIMARY + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.PRIMARY,
  },
  info: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.TEXT,
  },
  parentName: {
    fontSize: 13,
    color: Colors.TEXT,
    opacity: 0.52,
    marginTop: 3,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.SECONDARY,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 8,
    gap: 4,
  },
  badgePillText: {
    fontSize: 12,
    color: Colors.WHITE,
    fontWeight: '700',
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.TEXT,
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.TEXT,
    opacity: 0.45,
    marginTop: 6,
    textAlign: 'center',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.42,
    shadowRadius: 10,
    elevation: 8,
  },

  // Misc
  loader: {
    marginTop: 50,
  },
});
