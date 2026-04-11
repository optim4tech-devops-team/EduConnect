import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  Switch,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../theme/colors';
import { studentApi, StudentDto } from '../../api/client';
import { usePostStore } from '../../store/postStore';
import AiTagConfirmModal from '../../components/AiTagConfirmModal';

type Step = 'target' | 'media' | 'analyzing' | 'confirm';

interface DetectedTag {
  studentId: string;
  studentName: string;
  confidence: number;
}

export default function PostCreateScreen() {
  const { createPost, confirmTags, publishPost } = usePostStore();
  const [step, setStep] = useState<Step>('target');
  const [allClass, setAllClass] = useState(true);
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);
  const [detectedTags, setDetectedTags] = useState<DetectedTag[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const { data } = await studentApi.list();
      setStudents(data);
    } catch {
      // ignore
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const pickPhotos = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('İzin Gerekli', 'Fotoğraf erişim izni vermeniz gerekiyor.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (photos.length === 0) {
      Alert.alert('Fotoğraf Seçin', 'En az bir fotoğraf seçmelisiniz.');
      return;
    }
    try {
      setIsUploading(true);
      setStep('analyzing');

      const formData = new FormData();
      photos.forEach((photo, index) => {
        const filename = photo.fileName ?? `photo_${index}.jpg`;
        if (Platform.OS === 'web') {
          const file = (photo as ImagePicker.ImagePickerAsset & { file?: File }).file;
          if (file) formData.append('files', file, filename);
        } else {
          formData.append('files', {
            uri: photo.uri,
            name: filename,
            type: photo.mimeType ?? 'image/jpeg',
          } as unknown as Blob);
        }
      });
      if (caption) formData.append('caption', caption);
      if (!allClass) {
        selectedStudents.forEach((id) => formData.append('targetStudentIds[]', id));
      }

      const post = await createPost(formData);
      setCreatedPostId(post.id);

      // Simulate / use returned AI tags
      const tags: DetectedTag[] = (post.tags ?? []).map((t) => ({
        studentId: t.studentId,
        studentName: t.studentName,
        confidence: t.confidence ?? 0.5,
      }));
      setDetectedTags(tags);
      setIsUploading(false);
      setStep('confirm');
      setShowConfirm(true);
    } catch (err) {
      setIsUploading(false);
      setStep('media');
      Alert.alert('Hata', err instanceof Error ? err.message : 'Yükleme başarısız.');
    }
  };

  const handleConfirmAndPublish = async (
    confirmedTags: { studentId: string; isConfirmed: boolean }[]
  ) => {
    if (!createdPostId) return;
    try {
      await confirmTags(createdPostId, confirmedTags);
      await publishPost(createdPostId);
      setShowConfirm(false);
      Alert.alert('Yayınlandı!', 'Fotoğrafınız başarıyla paylaşıldı.', [
        {
          text: 'Tamam',
          onPress: () => {
            setStep('target');
            setPhotos([]);
            setCaption('');
            setCreatedPostId(null);
            setDetectedTags([]);
          },
        },
      ]);
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Yayınlama başarısız.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />
      <View style={styles.header}>
        <Text style={styles.title}>Fotoğraf Paylaş</Text>
        {/* Step indicator */}
        <View style={styles.steps}>
          {(['target', 'media', 'confirm'] as Step[]).map((s, i) => (
            <View key={s} style={styles.stepRow}>
              <View
                style={[
                  styles.stepDot,
                  (step === s ||
                    (step === 'analyzing' && s === 'media') ||
                    (step === 'confirm' && i < 2)) && styles.stepDotActive,
                ]}
              />
              {i < 2 && <View style={styles.stepLine} />}
            </View>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Step 1: Target */}
        {step === 'target' && (
          <View>
            <Text style={styles.stepTitle}>Hedef Seçin</Text>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Tüm Sınıf</Text>
              <Switch
                value={allClass}
                onValueChange={setAllClass}
                trackColor={{ false: Colors.BORDER, true: Colors.PRIMARY }}
                thumbColor={Colors.WHITE}
              />
            </View>

            {!allClass && (
              <View style={styles.studentCheckList}>
                <Text style={styles.subLabel}>Öğrenci Seçin</Text>
                {students.map((student) => {
                  const checked = selectedStudents.includes(student.id);
                  return (
                    <TouchableOpacity
                      key={student.id}
                      style={styles.checkRow}
                      onPress={() => toggleStudent(student.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                        {checked && <Ionicons name="checkmark" size={14} color={Colors.WHITE} />}
                      </View>
                      <Text style={styles.checkLabel}>{student.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => setStep('media')}
              activeOpacity={0.85}
            >
              <Text style={styles.nextButtonText}>Devam Et</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.WHITE} />
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Media */}
        {step === 'media' && (
          <View>
            <Text style={styles.stepTitle}>Fotoğraf Ekle</Text>

            <TouchableOpacity style={styles.pickButton} onPress={pickPhotos} activeOpacity={0.8}>
              <Ionicons name="images-outline" size={24} color={Colors.PRIMARY} />
              <Text style={styles.pickButtonText}>Galeriden Seç</Text>
            </TouchableOpacity>

            {photos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                {photos.map((photo, index) => (
                  <View key={index} style={styles.photoThumb}>
                    <Image source={{ uri: photo.uri }} style={styles.thumbImage} />
                    <TouchableOpacity
                      style={styles.removePhoto}
                      onPress={() => removePhoto(index)}
                    >
                      <Ionicons name="close-circle" size={20} color={Colors.ERROR} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <Text style={styles.subLabel}>Açıklama (İsteğe Bağlı)</Text>
            <TextInput
              style={styles.captionInput}
              placeholder="Bu fotoğraf hakkında bir şeyler yazın..."
              placeholderTextColor="#B0B0B0"
              value={caption}
              onChangeText={setCaption}
              multiline
              numberOfLines={3}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStep('target')}
              >
                <Ionicons name="arrow-back" size={18} color={Colors.PRIMARY} />
                <Text style={styles.backButtonText}>Geri</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.uploadButton, photos.length === 0 && { opacity: 0.5 }]}
                onPress={handleUpload}
                disabled={photos.length === 0 || isUploading}
                activeOpacity={0.85}
              >
                <Ionicons name="cloud-upload-outline" size={18} color={Colors.WHITE} />
                <Text style={styles.uploadButtonText}>Yükle ve Analiz Et</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 3: Analyzing */}
        {step === 'analyzing' && (
          <View style={styles.analyzingContainer}>
            <ActivityIndicator size="large" color={Colors.PRIMARY} />
            <Text style={styles.analyzingTitle}>AI analiz ediyor...</Text>
            <Text style={styles.analyzingSubtitle}>
              Fotoğraflarınızdaki öğrenciler tespit ediliyor
            </Text>
          </View>
        )}

        {/* Step 4: handled by modal */}
        {step === 'confirm' && !showConfirm && (
          <View style={styles.analyzingContainer}>
            <Ionicons name="checkmark-circle" size={60} color={Colors.ACCENT} />
            <Text style={styles.analyzingTitle}>Analiz Tamamlandı</Text>
          </View>
        )}
      </ScrollView>

      <AiTagConfirmModal
        visible={showConfirm}
        onClose={() => setShowConfirm(false)}
        postId={createdPostId ?? ''}
        detectedTags={detectedTags}
        onConfirm={handleConfirmAndPublish}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', color: Colors.TEXT },
  steps: { flexDirection: 'row', alignItems: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.BORDER,
  },
  stepDotActive: { backgroundColor: Colors.PRIMARY },
  stepLine: { width: 16, height: 2, backgroundColor: Colors.BORDER, marginHorizontal: 2 },
  scroll: { padding: 20, paddingBottom: 60 },
  stepTitle: { fontSize: 20, fontWeight: '700', color: Colors.TEXT, marginBottom: 20 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.WHITE,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  toggleLabel: { fontSize: 16, fontWeight: '600', color: Colors.TEXT },
  studentCheckList: { marginBottom: 20 },
  subLabel: { fontSize: 14, fontWeight: '600', color: Colors.TEXT, opacity: 0.65, marginBottom: 10 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY },
  checkLabel: { fontSize: 15, color: Colors.TEXT },
  nextButton: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: { color: Colors.WHITE, fontSize: 16, fontWeight: '700' },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.PRIMARY,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 20,
    gap: 10,
    marginBottom: 16,
  },
  pickButtonText: { fontSize: 16, color: Colors.PRIMARY, fontWeight: '600' },
  photoScroll: { marginBottom: 16 },
  photoThumb: { position: 'relative', marginRight: 10 },
  thumbImage: { width: 90, height: 90, borderRadius: 12 },
  removePhoto: { position: 'absolute', top: -6, right: -6 },
  captionInput: {
    backgroundColor: Colors.WHITE,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: Colors.TEXT,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  buttonRow: { flexDirection: 'row', gap: 12 },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 6,
  },
  backButtonText: { color: Colors.PRIMARY, fontWeight: '700', fontSize: 15 },
  uploadButton: {
    flex: 1,
    backgroundColor: Colors.PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadButtonText: { color: Colors.WHITE, fontSize: 15, fontWeight: '700' },
  analyzingContainer: { alignItems: 'center', paddingTop: 80, gap: 16 },
  analyzingTitle: { fontSize: 22, fontWeight: '700', color: Colors.TEXT },
  analyzingSubtitle: { fontSize: 15, color: Colors.TEXT, opacity: 0.55, textAlign: 'center' },
});
