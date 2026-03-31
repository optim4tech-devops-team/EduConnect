import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  SectionList,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../theme/colors';
import { studentApi, postApi, PostDto, StudentDto } from '../../api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_WIDTH - 40 - 8) / 3;

interface SectionData {
  title: string;
  data: PostDto[][];
}

function groupByMonth(posts: PostDto[]): SectionData[] {
  const map: Record<string, PostDto[]> = {};
  posts.forEach((post) => {
    const date = new Date(post.publishedAt ?? post.createdAt);
    const key = date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
    if (!map[key]) map[key] = [];
    map[key].push(post);
  });

  return Object.entries(map).map(([title, items]) => {
    const rows: PostDto[][] = [];
    for (let i = 0; i < items.length; i += 3) {
      rows.push(items.slice(i, i + 3));
    }
    return { title, data: rows };
  });
}

export default function ChildGalleryScreen() {
  const [child, setChild] = useState<StudentDto | null>(null);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PostDto | null>(null);

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
        const { data: posts } = await postApi.childPosts(firstChild.id);
        setSections(groupByMonth(posts));
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />
      <View style={styles.header}>
        <Text style={styles.title}>Fotoğraf Galerisi</Text>
        {child && <Text style={styles.subtitle}>{child.name}</Text>}
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.PARENT_PINK} style={{ marginTop: 40 }} />
      ) : sections.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="images-outline" size={64} color={Colors.BORDER} />
          <Text style={styles.emptyTitle}>Henüz fotoğraf yok</Text>
          <Text style={styles.emptySubtitle}>Öğretmenin fotoğraf paylaşmasını bekleyin</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(row, index) => `row-${index}`}
          contentContainerStyle={styles.list}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item: row }) => (
            <View style={styles.photoRow}>
              {row.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  onPress={() => setSelectedPhoto(photo)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: photo.thumbnailUrl ?? photo.mediaUrl }}
                    style={styles.photo}
                  />
                </TouchableOpacity>
              ))}
              {/* Fill empty cells */}
              {row.length < 3 &&
                Array.from({ length: 3 - row.length }).map((_, i) => (
                  <View key={`empty-${i}`} style={styles.photoPlaceholder} />
                ))}
            </View>
          )}
        />
      )}

      {/* Full-screen Modal */}
      <Modal
        visible={selectedPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedPhoto(null)}
          >
            <Ionicons name="close" size={28} color={Colors.WHITE} />
          </TouchableOpacity>

          {selectedPhoto && (
            <>
              <Image
                source={{ uri: selectedPhoto.mediaUrl }}
                style={styles.fullImage}
                resizeMode="contain"
              />
              {selectedPhoto.caption ? (
                <View style={styles.captionContainer}>
                  <Text style={styles.captionText}>{selectedPhoto.caption}</Text>
                </View>
              ) : null}
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.TEXT },
  subtitle: { fontSize: 14, color: Colors.TEXT, opacity: 0.55, marginTop: 2 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionHeader: { paddingVertical: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.TEXT, opacity: 0.7 },
  photoRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  photo: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 10 },
  photoPlaceholder: { width: PHOTO_SIZE, height: PHOTO_SIZE },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.TEXT, opacity: 0.5 },
  emptySubtitle: { fontSize: 14, color: Colors.TEXT, opacity: 0.4, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
  },
  fullImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.2 },
  captionContainer: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 14,
  },
  captionText: { color: Colors.WHITE, fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
