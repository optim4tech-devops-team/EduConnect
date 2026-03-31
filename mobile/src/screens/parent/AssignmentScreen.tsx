import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../theme/colors';
import { assignmentApi, AssignmentDto } from '../../api/client';

type Tab = 'pending' | 'submitted';

export default function AssignmentScreen() {
  const [tab, setTab] = useState<Tab>('pending');
  const [assignments, setAssignments] = useState<AssignmentDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentDto | null>(null);
  const [submissionNote, setSubmissionNote] = useState('');
  const [attachedUri, setAttachedUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      setIsLoading(true);
      const { data } = await assignmentApi.myChildren();
      setAssignments(data);
    } catch {
      Alert.alert('Hata', 'Ödevler yüklenemedi.');
    } finally {
      setIsLoading(false);
    }
  };

  const pending = assignments.filter((a) => a.status === 'Pending');
  const submitted = assignments.filter((a) => a.status !== 'Pending');
  const displayed = tab === 'pending' ? pending : submitted;

  const pickFile = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('İzin Gerekli', 'Galeri erişim izni gerekiyor.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setAttachedUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAssignment) return;
    try {
      setIsSubmitting(true);
      const formData = new FormData();
      if (submissionNote) formData.append('note', submissionNote);
      if (attachedUri) {
        formData.append('file', {
          uri: attachedUri,
          name: 'submission.jpg',
          type: 'image/jpeg',
        } as unknown as Blob);
      }
      await assignmentApi.submit(selectedAssignment.id, formData);
      Alert.alert('Başarılı', 'Ödev teslim edildi!', [
        {
          text: 'Tamam',
          onPress: () => {
            setSelectedAssignment(null);
            setSubmissionNote('');
            setAttachedUri(null);
            loadAssignments();
          },
        },
      ]);
    } catch {
      Alert.alert('Hata', 'Ödev teslim edilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAssignment = ({ item }: { item: AssignmentDto }) => {
    const isOverdue = item.status === 'Pending' && new Date(item.dueDate) < new Date();
    const statusColors: Record<string, string> = {
      Pending: isOverdue ? Colors.ERROR : Colors.INFO,
      Submitted: Colors.ACCENT,
      Graded: Colors.PRIMARY,
    };
    const statusLabels: Record<string, string> = {
      Pending: isOverdue ? 'Gecikmiş' : 'Bekliyor',
      Submitted: 'Teslim Edildi',
      Graded: 'Değerlendirildi',
    };

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => item.status === 'Pending' && setSelectedAssignment(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] + '22' }]}>
            <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
              {statusLabels[item.status]}
            </Text>
          </View>
          <Text style={[styles.dueDate, isOverdue && { color: Colors.ERROR }]}>
            {new Date(item.dueDate).toLocaleDateString('tr-TR')}
          </Text>
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        <Text style={styles.teacherName}>{item.teacherName}</Text>
        {item.status === 'Pending' && (
          <View style={styles.tapHint}>
            <Ionicons name="cloud-upload-outline" size={14} color={Colors.PRIMARY} />
            <Text style={styles.tapHintText}>Teslim etmek için dokun</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />
      <View style={styles.header}>
        <Text style={styles.title}>Ödevler</Text>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'pending' && styles.tabActive]}
          onPress={() => setTab('pending')}
        >
          <Text style={[styles.tabText, tab === 'pending' && styles.tabTextActive]}>
            Bekleyen {pending.length > 0 ? `(${pending.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'submitted' && styles.tabActive]}
          onPress={() => setTab('submitted')}
        >
          <Text style={[styles.tabText, tab === 'submitted' && styles.tabTextActive]}>
            Teslim Edildi {submitted.length > 0 ? `(${submitted.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.INFO} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          renderItem={renderAssignment}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="book-outline" size={48} color={Colors.BORDER} />
              <Text style={styles.emptyText}>
                {tab === 'pending' ? 'Bekleyen ödev yok' : 'Teslim edilen ödev yok'}
              </Text>
            </View>
          }
        />
      )}

      {/* Submission Modal */}
      <Modal
        visible={selectedAssignment !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedAssignment(null)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ödev Teslim Et</Text>
            <TouchableOpacity onPress={() => setSelectedAssignment(null)}>
              <Ionicons name="close" size={24} color={Colors.TEXT} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {selectedAssignment && (
              <>
                <Text style={styles.modalAssignmentTitle}>{selectedAssignment.title}</Text>
                <Text style={styles.modalAssignmentDesc}>{selectedAssignment.description}</Text>

                <Text style={styles.inputLabel}>Not (İsteğe Bağlı)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ödeviniz hakkında not ekleyin..."
                  placeholderTextColor="#B0B0B0"
                  value={submissionNote}
                  onChangeText={setSubmissionNote}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <TouchableOpacity style={styles.attachButton} onPress={pickFile}>
                  <Ionicons
                    name={attachedUri ? 'image' : 'attach'}
                    size={20}
                    color={attachedUri ? Colors.ACCENT : Colors.PRIMARY}
                  />
                  <Text style={[styles.attachText, attachedUri && { color: Colors.ACCENT }]}>
                    {attachedUri ? 'Dosya Eklendi ✓' : 'Dosya / Fotoğraf Ekle'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={Colors.WHITE} size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color={Colors.WHITE} />
                      <Text style={styles.submitButtonText}>Teslim Et</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.TEXT },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: Colors.LIGHT_GRAY,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: Colors.WHITE, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.TEXT, opacity: 0.5 },
  tabTextActive: { color: Colors.INFO, opacity: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.WHITE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  dueDate: { fontSize: 12, color: Colors.TEXT, opacity: 0.55 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.TEXT, marginBottom: 6 },
  cardDesc: { fontSize: 13, color: Colors.TEXT, opacity: 0.6, lineHeight: 18, marginBottom: 8 },
  teacherName: { fontSize: 12, color: Colors.INFO, fontWeight: '600' },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
  },
  tapHintText: { fontSize: 12, color: Colors.PRIMARY },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: Colors.TEXT, opacity: 0.4 },
  modal: { flex: 1, backgroundColor: Colors.BACKGROUND },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.TEXT },
  modalContent: { padding: 20 },
  modalAssignmentTitle: { fontSize: 18, fontWeight: '700', color: Colors.TEXT, marginBottom: 8 },
  modalAssignmentDesc: { fontSize: 14, color: Colors.TEXT, opacity: 0.65, lineHeight: 20, marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: Colors.TEXT, opacity: 0.65, marginBottom: 8 },
  input: {
    backgroundColor: Colors.WHITE,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: Colors.TEXT,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.PRIMARY,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  attachText: { fontSize: 15, color: Colors.PRIMARY, fontWeight: '600' },
  submitButton: {
    backgroundColor: Colors.INFO,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.INFO,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: { color: Colors.WHITE, fontSize: 16, fontWeight: '700' },
});
