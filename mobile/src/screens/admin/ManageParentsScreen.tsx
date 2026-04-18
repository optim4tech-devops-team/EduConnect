import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../theme/colors';
import { parentApi, studentApi, StudentDto } from '../../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LinkedStudent {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  relationship?: string;
  isPrimaryContact: boolean;
  canPickup: boolean;
}

interface ParentItem {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  students: LinkedStudent[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [Colors.INFO, Colors.PRIMARY, Colors.ACCENT, '#6C63FF', '#20B2AA'];

// ─── Component ───────────────────────────────────────────────────────────────

export default function ManageParentsScreen() {
  const [parents, setParents]       = useState<ParentItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');

  // Link student modal state
  const [linkTarget, setLinkTarget]         = useState<ParentItem | null>(null);
  const [students, setStudents]             = useState<StudentDto[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [relationship, setRelationship]     = useState('');
  const [isPrimary, setIsPrimary]           = useState(false);
  const [canPickup, setCanPickup]           = useState(true);
  const [saving, setSaving]                 = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await parentApi.list({ search: search || undefined });
      setParents((res.data as unknown) as ParentItem[]);
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openLinkModal = async (parent: ParentItem) => {
    setLinkTarget(parent);
    setSelectedStudentId('');
    setRelationship('');
    setIsPrimary(false);
    setCanPickup(true);
    setStudentsLoading(true);
    try {
      const res = await studentApi.list();
      setStudents(res.data);
    } catch {
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleLink = async () => {
    if (!linkTarget || !selectedStudentId) return;
    setSaving(true);
    try {
      const existingStudents = linkTarget.students.map((s) => ({
        studentId: s.studentId,
        relationship: s.relationship,
        isPrimaryContact: s.isPrimaryContact,
        canPickup: s.canPickup,
      }));

      // Don't add duplicate
      const alreadyLinked = existingStudents.some((s) => s.studentId === selectedStudentId);
      const newStudents = alreadyLinked
        ? existingStudents
        : [
            ...existingStudents,
            {
              studentId: selectedStudentId,
              relationship: relationship || undefined,
              isPrimaryContact: isPrimary,
              canPickup,
            },
          ];

      await parentApi.update(linkTarget.id, {
        fullName: linkTarget.fullName,
        email: linkTarget.email,
        phone: linkTarget.phone ?? '',
        avatarUrl: linkTarget.avatarUrl,
        isActive: linkTarget.isActive,
        students: newStudents,
      });

      setLinkTarget(null);
      load();
    } catch {
      Alert.alert('Hata', 'Öğrenci bağlanırken bir sorun oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async (parent: ParentItem, studentId: string) => {
    Alert.alert(
      'Bağlantıyı Kaldır',
      'Bu öğrenciyi veliden ayırmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            try {
              const remaining = parent.students
                .filter((s) => s.studentId !== studentId)
                .map((s) => ({
                  studentId: s.studentId,
                  relationship: s.relationship,
                  isPrimaryContact: s.isPrimaryContact,
                  canPickup: s.canPickup,
                }));
              await parentApi.update(parent.id, {
                fullName: parent.fullName,
                email: parent.email,
                phone: parent.phone ?? '',
                avatarUrl: parent.avatarUrl,
                isActive: parent.isActive,
                students: remaining,
              });
              load();
            } catch {
              Alert.alert('Hata', 'Bağlantı kaldırılırken bir sorun oluştu.');
            }
          },
        },
      ],
    );
  };

  const renderParent = ({ item, index }: { item: ParentItem; index: number }) => {
    const bg = AVATAR_COLORS[index % AVATAR_COLORS.length];
    return (
      <View style={styles.card}>
        <View style={[styles.avatar, { backgroundColor: bg + '22' }]}>
          <Text style={[styles.avatarText, { color: bg }]}>{getInitials(item.fullName)}</Text>
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.parentName}>{item.fullName}</Text>
          <Text style={styles.parentMeta}>{item.phone ?? item.email ?? '—'}</Text>

          {item.students?.length > 0 && (
            <View style={styles.studentsList}>
              {item.students.map((s) => (
                <View key={s.studentId} style={styles.studentChip}>
                  <Text style={styles.studentChipText}>{s.studentName}</Text>
                  <TouchableOpacity onPress={() => handleUnlink(item, s.studentId)}>
                    <Ionicons name="close-circle" size={14} color={Colors.ERROR} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.linkBtn} onPress={() => openLinkModal(item)}>
          <Ionicons name="person-add-outline" size={18} color={Colors.PRIMARY} />
        </TouchableOpacity>
      </View>
    );
  };

  // Available students = those not already linked to this parent
  const availableStudents = linkTarget
    ? students.filter((s) => !linkTarget.students.some((ls) => ls.studentId === s.id))
    : students;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />

      <View style={styles.header}>
        <Text style={styles.title}>Veliler</Text>
        <Text style={styles.count}>{parents.length} veli</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color={Colors.TEXT_MUTED} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="İsim, telefon veya e-posta ile ara..."
          placeholderTextColor={Colors.TEXT_MUTED}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          onSubmitEditing={load}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.TEXT_MUTED} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={parents}
          keyExtractor={(item) => item.id}
          renderItem={renderParent}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={Colors.BORDER} />
              <Text style={styles.emptyText}>Henüz veli kaydı yok</Text>
            </View>
          }
        />
      )}

      {/* ─── Link Student Modal ─────────────────────────────────────────── */}
      <Modal
        visible={!!linkTarget}
        animationType="slide"
        transparent
        onRequestClose={() => setLinkTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Öğrenci Bağla</Text>
              <Text style={styles.modalSubtitle}>{linkTarget?.fullName}</Text>
              <TouchableOpacity onPress={() => setLinkTarget(null)} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={Colors.TEXT_MUTED} />
              </TouchableOpacity>
            </View>

            {studentsLoading ? (
              <ActivityIndicator color={Colors.PRIMARY} style={{ marginVertical: 32 }} />
            ) : availableStudents.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>
                  {students.length === 0
                    ? 'Henüz öğrenci kaydı yok'
                    : 'Tüm öğrenciler bu veliye bağlı'}
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.modalSectionLabel}>Öğrenci Seç</Text>
                {availableStudents.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.studentRow,
                      selectedStudentId === s.id && styles.studentRowSelected,
                    ]}
                    onPress={() => setSelectedStudentId(s.id)}
                  >
                    <View style={styles.studentRowLeft}>
                      <View style={styles.studentRowAvatar}>
                        <Text style={styles.studentRowAvatarText}>
                          {getInitials(s.name ?? '')}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.studentRowName}>{s.name}</Text>
                        <Text style={styles.studentRowClass}>{s.className ?? '—'}</Text>
                      </View>
                    </View>
                    {selectedStudentId === s.id && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.PRIMARY} />
                    )}
                  </TouchableOpacity>
                ))}

                {selectedStudentId !== '' && (
                  <>
                    <Text style={[styles.modalSectionLabel, { marginTop: 16 }]}>
                      İlişki (isteğe bağlı)
                    </Text>
                    <TextInput
                      style={styles.relInput}
                      placeholder="Anne, Baba, Vasi..."
                      placeholderTextColor={Colors.TEXT_MUTED}
                      value={relationship}
                      onChangeText={setRelationship}
                    />

                    <View style={styles.checkRow}>
                      <TouchableOpacity
                        style={styles.checkbox}
                        onPress={() => setIsPrimary((v) => !v)}
                      >
                        <Ionicons
                          name={isPrimary ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={Colors.PRIMARY}
                        />
                        <Text style={styles.checkLabel}>Birincil İletişim</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.checkRow}>
                      <TouchableOpacity
                        style={styles.checkbox}
                        onPress={() => setCanPickup((v) => !v)}
                      >
                        <Ionicons
                          name={canPickup ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={Colors.PRIMARY}
                        />
                        <Text style={styles.checkLabel}>Öğrenciyi Teslim Alabilir</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[
                styles.linkConfirmBtn,
                (!selectedStudentId || saving) && styles.linkConfirmBtnDisabled,
              ]}
              onPress={handleLink}
              disabled={!selectedStudentId || saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.linkConfirmBtnText}>Bağla</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 24, fontWeight: '800', color: Colors.TEXT },
  count: { fontSize: 14, color: Colors.TEXT_MUTED },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.SECONDARY,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 14, color: Colors.TEXT },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  avatarText: { fontSize: 16, fontWeight: '700' },
  cardInfo: { flex: 1 },
  parentName: { fontSize: 15, fontWeight: '600', color: Colors.TEXT },
  parentMeta: { fontSize: 13, color: Colors.TEXT_MUTED, marginTop: 2 },
  studentsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  studentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.PRIMARY + '18',
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  studentChipText: { fontSize: 12, color: Colors.PRIMARY, fontWeight: '600' },
  linkBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: Colors.PRIMARY + '18',
    marginLeft: 8,
  },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: Colors.TEXT_MUTED },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.SECONDARY,
    marginBottom: 4,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.TEXT },
  modalSubtitle: { fontSize: 13, color: Colors.TEXT_MUTED, marginTop: 2 },
  modalClose: { position: 'absolute', right: 16, top: 4 },
  modalScroll: { paddingHorizontal: 20 },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 12,
  },
  modalEmpty: { paddingVertical: 32, alignItems: 'center' },
  modalEmptyText: { fontSize: 14, color: Colors.TEXT_MUTED },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: Colors.BACKGROUND,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  studentRowSelected: {
    borderColor: Colors.PRIMARY,
    backgroundColor: Colors.PRIMARY + '10',
  },
  studentRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  studentRowAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.PRIMARY + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentRowAvatarText: { fontSize: 13, fontWeight: '700', color: Colors.PRIMARY },
  studentRowName: { fontSize: 14, fontWeight: '600', color: Colors.TEXT },
  studentRowClass: { fontSize: 12, color: Colors.TEXT_MUTED },
  relInput: {
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.SECONDARY,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: Colors.TEXT,
    marginBottom: 8,
  },
  checkRow: { marginBottom: 6 },
  checkbox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkLabel: { fontSize: 14, color: Colors.TEXT },
  linkConfirmBtn: {
    backgroundColor: Colors.PRIMARY,
    marginHorizontal: 20,
    marginTop: 16,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkConfirmBtnDisabled: { opacity: 0.5 },
  linkConfirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
