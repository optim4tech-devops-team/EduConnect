import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/theme/colors';
import { formApi, FormTemplateDto } from '@/api/client';
import { useFormStore } from '@/store/formStore';

interface Props {
  route?: { params?: { templateId: string } };
  navigation?: { goBack: () => void };
}

export default function FormDetailScreen({ route, navigation }: Props) {
  const templateId = route?.params?.templateId ?? '';
  const { submitForm, isLoading } = useFormStore();

  const [template, setTemplate] = useState<FormTemplateDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!templateId) return;
    formApi.getTemplate(templateId).then((res) => {
      const t = res.data as unknown as FormTemplateDto;
      setTemplate(t);
      // Initialize default answers
      const defaults: Record<string, unknown> = {};
      t.fields.forEach((f) => {
        if (f.type === 'checkbox') defaults[f.name] = false;
        else defaults[f.name] = '';
      });
      setAnswers(defaults);
    }).catch(() => {
      Alert.alert('Hata', 'Form yüklenemedi.');
    }).finally(() => setLoading(false));
  }, [templateId]);

  const handleSubmit = async () => {
    // Validate required fields
    const missing = template?.fields.filter((f) => f.required && !answers[f.name]);
    if (missing && missing.length > 0) {
      Alert.alert('Eksik Alan', `Lütfen şu alanları doldurun: ${missing.map((f) => f.label).join(', ')}`);
      return;
    }
    try {
      await submitForm(templateId, answers);
      setSubmitted(true);
    } catch {
      Alert.alert('Hata', 'Form gönderilemedi. Lütfen tekrar deneyin.');
    }
  };

  const setAnswer = (name: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={Colors.PRIMARY} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={72} color={Colors.SUCCESS} />
          <Text style={styles.successTitle}>Form Gönderildi</Text>
          <Text style={styles.successSub}>Formunuz başarıyla iletildi.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
            <Text style={styles.backBtnText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.BACKGROUND} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color={Colors.TEXT} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{template?.title ?? 'Form'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {template?.description ? (
          <Text style={styles.description}>{template.description}</Text>
        ) : null}

        {template?.fields.map((field) => (
          <View key={field.name} style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>

            {field.type === 'text' && (
              <TextInput
                style={styles.input}
                placeholder={field.label}
                placeholderTextColor={Colors.TEXT_MUTED}
                value={String(answers[field.name] ?? '')}
                onChangeText={(v) => setAnswer(field.name, v)}
              />
            )}

            {field.type === 'date' && (
              <TextInput
                style={styles.input}
                placeholder="GG.AA.YYYY"
                placeholderTextColor={Colors.TEXT_MUTED}
                value={String(answers[field.name] ?? '')}
                onChangeText={(v) => setAnswer(field.name, v)}
                keyboardType="numeric"
              />
            )}

            {field.type === 'checkbox' && (
              <View style={styles.switchRow}>
                <Switch
                  value={Boolean(answers[field.name])}
                  onValueChange={(v) => setAnswer(field.name, v)}
                  trackColor={{ false: Colors.BORDER, true: Colors.PRIMARY }}
                  thumbColor={Colors.WHITE}
                />
                <Text style={styles.switchLabel}>
                  {Boolean(answers[field.name]) ? 'Evet' : 'Hayır'}
                </Text>
              </View>
            )}

            {field.type === 'select' && (
              <View style={styles.optionRow}>
                {field.options?.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.optionChip, answers[field.name] === opt && styles.optionChipActive]}
                    onPress={() => setAnswer(field.name, opt)}
                  >
                    <Text style={[styles.optionText, answers[field.name] === opt && styles.optionTextActive]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.submitText}>Formu Gönder</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  backIcon: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.TEXT, flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  description: { fontSize: 14, color: Colors.TEXT_MUTED, lineHeight: 20, marginBottom: 20 },
  fieldGroup: { marginBottom: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.TEXT, marginBottom: 8 },
  required: { color: Colors.ERROR },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.TEXT,
    backgroundColor: Colors.WHITE,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchLabel: { fontSize: 15, color: Colors.TEXT },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    backgroundColor: Colors.WHITE,
  },
  optionChipActive: { borderColor: Colors.PRIMARY, backgroundColor: Colors.PRIMARY },
  optionText: { fontSize: 14, color: Colors.TEXT_MUTED },
  optionTextActive: { color: '#fff', fontWeight: '600' },
  submitBtn: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 14,
    height: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { fontSize: 16, color: '#fff', fontWeight: '700' },
  successBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 40 },
  successTitle: { fontSize: 24, fontWeight: '800', color: Colors.TEXT },
  successSub: { fontSize: 15, color: Colors.TEXT_MUTED, textAlign: 'center' },
  backBtn: {
    marginTop: 16,
    backgroundColor: Colors.PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  backBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
