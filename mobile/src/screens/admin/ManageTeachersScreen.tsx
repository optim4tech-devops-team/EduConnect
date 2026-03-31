import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, Modal, TextInput, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../theme/colors';

const MOCK_TEACHERS = [
  { id: '1', fullName: 'Ayşe Hanım', email: 'ayse@school.com', phone: '0555 111 22 33', className: 'Papatyalar' },
  { id: '2', fullName: 'Fatma Hanım', email: 'fatma@school.com', phone: '0555 222 33 44', className: 'Yıldızlar' },
  { id: '3', fullName: 'Mehmet Bey', email: 'mehmet@school.com', phone: '0555 333 44 55', className: 'Güneşler' },
];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function ManageTeachersScreen() {
  const [teachers, setTeachers] = useState(MOCK_TEACHERS);
  const [modalVisible, setModalVisible] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(false);

  const openAdd = () => {
    setFullName(''); setEmail(''); setPhone(''); setPassword(''); setClassName('');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Hata', 'Ad, e-posta ve şifre zorunludur');
      return;
    }
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 500));
      setTeachers(prev => [...prev, {
        id: Date.now().toString(), fullName, email, phone, className,
      }]);
      setModalVisible(false);
      Alert.alert('Başarılı', 'Öğretmen hesabı oluşturuldu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Öğretmenler</Text>
        <Text style={styles.count}>{teachers.length} öğretmen</Text>
      </View>

      <FlatList
        data={teachers}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(item.fullName)}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.fullName}</Text>
              <Text style={styles.sub}>{item.email}</Text>
              {item.className ? (
                <View style={styles.classBadge}>
                  <Text style={styles.classBadgeText}>{item.className}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity style={styles.moreBtn}>
              <Ionicons name="ellipsis-vertical" size={18} color="#aaa" />
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Ionicons name="add" size={28} color={Colors.WHITE} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Öğretmen Ekle</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { label: 'Ad Soyad *', value: fullName, setter: setFullName, placeholder: 'Ayşe Yılmaz' },
                { label: 'E-posta *', value: email, setter: setEmail, placeholder: 'ayse@okul.com', keyboardType: 'email-address' as const },
                { label: 'Telefon', value: phone, setter: setPhone, placeholder: '0555 000 00 00', keyboardType: 'phone-pad' as const },
                { label: 'Şifre *', value: password, setter: setPassword, placeholder: '••••••••', secure: true },
                { label: 'Sınıf Adı', value: className, setter: setClassName, placeholder: 'Papatyalar' },
              ].map(f => (
                <View key={f.label}>
                  <Text style={styles.label}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={f.value}
                    onChangeText={f.setter}
                    placeholder={f.placeholder}
                    keyboardType={f.keyboardType}
                    secureTextEntry={f.secure}
                    autoCapitalize="none"
                  />
                </View>
              ))}
            </ScrollView>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, loading && { opacity: 0.7 }]} onPress={handleSave} disabled={loading}>
                <Text style={styles.saveText}>{loading ? 'Kaydediliyor...' : 'Kaydet'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.TEXT },
  count: { fontSize: 14, color: Colors.PRIMARY, fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.WHITE, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.PRIMARY, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: Colors.WHITE, fontWeight: 'bold', fontSize: 16 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: 'bold', color: Colors.TEXT },
  sub: { fontSize: 13, color: '#888', marginTop: 2 },
  classBadge: { alignSelf: 'flex-start', backgroundColor: Colors.SECONDARY + '50', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  classBadgeText: { fontSize: 12, color: Colors.TEXT, fontWeight: '600' },
  moreBtn: { padding: 8 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.PRIMARY, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.PRIMARY, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '92%', maxHeight: '85%', backgroundColor: Colors.WHITE, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.TEXT, marginBottom: 12 },
  label: { fontSize: 13, color: '#888', marginBottom: 4, marginTop: 10 },
  input: { borderWidth: 1, borderColor: Colors.BORDER, borderRadius: 8, padding: 10, fontSize: 15, color: Colors.TEXT },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 10 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.BORDER },
  cancelText: { color: Colors.TEXT },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: Colors.PRIMARY },
  saveText: { color: Colors.WHITE, fontWeight: '600' },
});
