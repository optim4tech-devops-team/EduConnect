import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Switch,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import Colors from '../../theme/colors';

interface DetectedTag {
  studentId: string;
  studentName: string;
  confidence: number;
}

interface AiTagConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  detectedTags: DetectedTag[];
  onConfirm: (confirmedIds: string[]) => void;
}

const AiTagConfirmModal: React.FC<AiTagConfirmModalProps> = ({
  visible,
  onClose,
  detectedTags,
  onConfirm,
}) => {
  const [included, setIncluded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const initial: Record<string, boolean> = {};
    detectedTags.forEach((t) => {
      initial[t.studentId] = true;
    });
    setIncluded(initial);
  }, [detectedTags]);

  const toggle = (id: string, value: boolean) => {
    setIncluded((prev) => ({ ...prev, [id]: value }));
  };

  const handleConfirm = () => {
    const confirmedIds = Object.entries(included)
      .filter(([, val]) => val)
      .map(([id]) => id);
    onConfirm(confirmedIds);
  };

  const confidenceColor = (pct: number) => {
    if (pct >= 85) return Colors.ACCENT;
    if (pct >= 60) return Colors.SECONDARY;
    return Colors.ERROR;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>AI Tespit Sonuçları</Text>
                <Text style={styles.subtitle}>Doğru değilse düzeltebilirsiniz</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Tag list */}
            <FlatList
              data={detectedTags}
              keyExtractor={(item) => item.studentId}
              style={styles.list}
              renderItem={({ item }) => {
                const pct = Math.round(item.confidence * 100);
                return (
                  <View style={styles.row}>
                    <View style={styles.rowLeft}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>
                          {item.studentName
                            .split(' ')
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.studentName}>{item.studentName}</Text>
                        <View style={styles.confBadge}>
                          <View
                            style={[
                              styles.confDot,
                              { backgroundColor: confidenceColor(pct) },
                            ]}
                          />
                          <Text style={[styles.confText, { color: confidenceColor(pct) }]}>
                            %{pct} güven
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Switch
                      value={included[item.studentId] ?? true}
                      onValueChange={(val) => toggle(item.studentId, val)}
                      trackColor={{ false: Colors.BORDER, true: Colors.PRIMARY_LIGHT }}
                      thumbColor={included[item.studentId] ? Colors.PRIMARY : '#ccc'}
                    />
                  </View>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Tespit edilen öğrenci yok.</Text>
              }
            />

            {/* Confirm button */}
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
              <Text style={styles.confirmText}>Onayla ve Yayınla</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  safeArea: {
    backgroundColor: 'transparent',
  },
  card: {
    backgroundColor: Colors.WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.TEXT,
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    color: Colors.TEXT,
    fontWeight: '600',
  },
  list: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.INFO_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.INFO,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.TEXT,
  },
  confBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  confDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 4,
  },
  confText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    padding: 16,
  },
  confirmBtn: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  confirmText: {
    color: Colors.WHITE,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default AiTagConfirmModal;
