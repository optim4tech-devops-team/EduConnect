import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, type ClassDto, type StudentDto, type StudentImportResult } from '../lib/api';

interface StudentsPageProps {
  token: string;
}

interface StudentFormState {
  fullName: string;
  classId: string;
  birthDate: string;
  gender: string;
  allergiesText: string;
  medicationNotes: string;
  healthNotes: string;
}

const initialForm: StudentFormState = {
  fullName: '',
  classId: '',
  birthDate: '',
  gender: '',
  allergiesText: '',
  medicationNotes: '',
  healthNotes: '',
};

export default function StudentsPage({ token }: StudentsPageProps) {
  const [items, setItems] = useState<StudentDto[]>([]);
  const [classes, setClasses] = useState<ClassDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<StudentFormState>(initialForm);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string>('');
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string>('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<StudentImportResult | null>(null);

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === form.classId),
    [classes, form.classId],
  );

  useEffect(() => {
    void loadPage();
  }, [token]);

  async function loadPage() {
    setLoading(true);
    setError(null);

    try {
      const [students, classItems] = await Promise.all([api.students(token), api.classes(token)]);
      setItems(students);
      setClasses(classItems);
      setForm((current) => ({
        ...current,
        classId: current.classId || classItems[0]?.id || '',
      }));
    } catch {
      setItems([]);
      setClasses([]);
      setError('Ogrenci verileri yuklenemedi.');
    } finally {
      setLoading(false);
    }
  }

  function resetComposer(defaultClassId = classes[0]?.id || '') {
    setEditingId(null);
    setForm({ ...initialForm, classId: defaultClassId });
    setAvatarFile(null);
    setAvatarPreviewUrl('');
    setCurrentAvatarUrl('');
    setIsComposerOpen(false);
  }

  function openCreateComposer() {
    setError(null);
    setSuccess(null);
    setImportResult(null);
    setEditingId(null);
    setForm({ ...initialForm, classId: classes[0]?.id || '' });
    setAvatarFile(null);
    setAvatarPreviewUrl('');
    setCurrentAvatarUrl('');
    setIsComposerOpen(true);
  }

  function openEditComposer(item: StudentDto) {
    setError(null);
    setSuccess(null);
    setImportResult(null);
    setEditingId(item.id);
    setForm({
      fullName: item.fullName || item.name || '',
      classId: item.classId,
      birthDate: item.birthDate || '',
      gender: item.gender || '',
      allergiesText: item.allergies?.join(', ') || '',
      medicationNotes: item.medicationNotes || '',
      healthNotes: item.healthNotes || '',
    });
    setAvatarFile(null);
    setCurrentAvatarUrl(item.avatarUrl || '');
    setAvatarPreviewUrl(item.avatarUrl || '');
    setIsComposerOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.fullName.trim()) {
      setError('Ogrenci adi zorunludur.');
      return;
    }

    if (!form.classId) {
      setError('Ogrenci icin bir sinif secmelisin.');
      return;
    }

    setSaving(true);
    try {
      let avatarUrl = currentAvatarUrl || undefined;
      if (avatarFile) {
        const uploadResult = await api.uploadStudentAvatar(token, avatarFile);
        avatarUrl = uploadResult.url;
      }

      const payload = {
        fullName: form.fullName.trim(),
        classId: form.classId,
        birthDate: form.birthDate || undefined,
        gender: form.gender || undefined,
        allergies: form.allergiesText.trim() ? [form.allergiesText.trim()] : [],
        medicationNotes: form.medicationNotes.trim() || undefined,
        healthNotes: form.healthNotes.trim() || undefined,
        avatarUrl,
      };

      if (editingId) {
        await api.updateStudent(token, editingId, payload);
        setSuccess('Ogrenci kaydi guncellendi.');
      } else {
        await api.createStudent(token, payload);
        setSuccess('Yeni ogrenci basariyla eklendi.');
      }

      resetComposer(form.classId);
      await loadPage();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Ogrenci kaydi olusturulamadi.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: StudentDto) {
    if (!window.confirm(`${item.fullName || item.name} kaydini pasife almak istiyor musun?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      await api.deleteStudent(token, item.id);
      if (editingId === item.id) {
        resetComposer(classes[0]?.id || '');
      }
      setSuccess('Ogrenci pasife alindi.');
      await loadPage();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Ogrenci silinemedi.');
    }
  }

  async function handleImport() {
    setError(null);
    setSuccess(null);
    setImportResult(null);

    if (!importFile) {
      setError('Once Notio Excel sablonuna uygun bir dosya secmelisin.');
      return;
    }

    setImporting(true);
    try {
      const result = await api.importStudents(token, importFile);
      setImportResult(result);
      setSuccess(
        result.failed > 0
          ? `${result.imported} ogrenci ice aktarildi, ${result.failed} satir kontrol bekliyor.`
          : `${result.imported} ogrenci tek seferde basariyla eklendi.`,
      );
      setImportFile(null);
      await loadPage();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Toplu ogrenci importu tamamlanamadi.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="content-grid">
      <section className="panel-card full-span">
        <div className="panel-card-header">
          <div>
            <div className="section-eyebrow">Canli veri</div>
            <h3>Ogrenciler</h3>
            <p className="panel-copy compact-copy">
              Okul yoneticisi bu alandan ogrenci listesini gorebilir, guncelleyebilir ve yeni kayit acabilir.
            </p>
          </div>
          <div className="header-actions stack-on-mobile">
            <span className="table-meta">{items.length} ogrenci</span>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                if (isComposerOpen && !editingId) {
                  resetComposer(classes[0]?.id || '');
                } else {
                  openCreateComposer();
                }
              }}
            >
              {isComposerOpen && !editingId ? 'Formu Kapat' : 'Yeni Ogrenci'}
            </button>
          </div>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}
        {success ? <div className="success-banner">{success}</div> : null}

        <div className="split-callout-grid">
          <div className="soft-card import-card">
            <div className="section-eyebrow">Toplu aktarim</div>
            <strong>Notio ogrenci Excel sablonu</strong>
            <p className="panel-copy compact-copy">
              Okul muduru bu sablonu indirip sadece istedigimiz kolonlari doldurarak toplu ogrenci kaydi acabilir.
              Ogrenci resmi zorunlu degildir; istenirse sonradan tekil kayitta ya da `AvatarUrl` kolonu ile eklenebilir.
              Cinsiyet ve saglik verileri de ayni Excel standardi ile aktarilabilir.
            </p>
            <div className="soft-inline-list">
              <span className="soft-pill">FullName</span>
              <span className="soft-pill">ClassName</span>
              <span className="soft-pill">BirthDate</span>
              <span className="soft-pill">Gender</span>
              <span className="soft-pill">Allergies</span>
              <span className="soft-pill">MedicationNotes</span>
              <span className="soft-pill">HealthNotes</span>
              <span className="soft-pill">AvatarUrl (opsiyonel)</span>
            </div>
            <div className="header-actions stack-on-mobile">
              <a className="ghost-button button-link" href="/templates/notio-student-import-template.xlsx" download>
                Excel Sablonunu Indir
              </a>
              <label className="ghost-button button-link button-file">
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                />
                {importFile ? 'Dosya Hazir' : 'Excel Dosyasi Sec'}
              </label>
              <button type="button" className="primary-button" onClick={() => void handleImport()} disabled={importing}>
                {importing ? 'Ice Aktariliyor...' : 'Toplu Ogrenci Yukle'}
              </button>
            </div>
            <div className="field-hint">
              {importFile ? `${importFile.name} secildi.` : 'Sadece .xlsx formatindaki Notio sablonu desteklenir.'}
            </div>
          </div>

          <div className="soft-card import-card">
            <div className="section-eyebrow">Resim politikasi</div>
            <strong>Ogrenci resmi opsiyonel</strong>
            <p className="panel-copy compact-copy">
              Tekil ogrenci kaydinda gorsel yukleyebilirsin. Toplu importta ise `AvatarUrl` kolonu bos birakilabilir;
              okul dilerse resmi sonradan ogrenci kartindan ekler. Alerji bilgisi duz metin olarak yazilabilir.
            </p>
            {importResult ? (
              <div className="import-summary-card">
                <div className="metric-inline">
                  <strong>{importResult.imported}</strong>
                  <span>Iceri alinan</span>
                </div>
                <div className="metric-inline">
                  <strong>{importResult.failed}</strong>
                  <span>Kontrol gereken</span>
                </div>
              </div>
            ) : (
              <div className="field-hint">
                Sample akista once bir sinif olmasi gerekir. `ClassName` kolonu mevcut sinif adi ile birebir eslesmelidir.
              </div>
            )}
            {importResult?.errors.length ? (
              <ul className="import-error-list">
                {importResult.errors.slice(0, 6).map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        {isComposerOpen ? (
          <form className="inline-form-shell" onSubmit={handleSubmit}>
            <div className="inline-form-header">
              <div>
                <div className="section-eyebrow">{editingId ? 'Duzenle' : 'Yeni kayit'}</div>
                <strong>{editingId ? 'Ogrenci Kaydini Guncelle' : 'Ogrenci Bilgileri'}</strong>
              </div>
              {selectedClass ? (
                <span className="soft-pill">
                  {selectedClass.name}
                  {selectedClass.teacherName ? ` · ${selectedClass.teacherName}` : ''}
                </span>
              ) : null}
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Ad soyad</span>
                <input
                  value={form.fullName}
                  onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                  placeholder="Ogrenci adi soyadi"
                />
              </label>
              <label className="field">
                <span>Sinif</span>
                <select
                  value={form.classId}
                  onChange={(event) => setForm((current) => ({ ...current, classId: event.target.value }))}
                >
                  <option value="">Sinif sec</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.teacherName ? ` · ${item.teacherName}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Dogum tarihi</span>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Cinsiyet</span>
                <select
                  value={form.gender}
                  onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))}
                >
                  <option value="">Belirtmek istemiyorum</option>
                  <option value="Kiz">Kiz</option>
                  <option value="Erkek">Erkek</option>
                </select>
              </label>
              <label className="field">
                <span>Ogrenci resmi</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] ?? null;
                    setAvatarFile(nextFile);
                    setAvatarPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : currentAvatarUrl);
                  }}
                />
              </label>
              <label className="field field-span-2">
                <span>Alerjiler</span>
                <textarea
                  rows={3}
                  value={form.allergiesText}
                  onChange={(event) => setForm((current) => ({ ...current, allergiesText: event.target.value }))}
                  placeholder="Ornek: Fistik alerjisi var. Laktozsuz besleniyor."
                />
              </label>
              <label className="field">
                <span>Kullandigi ilaclar</span>
                <textarea
                  rows={4}
                  value={form.medicationNotes}
                  onChange={(event) => setForm((current) => ({ ...current, medicationNotes: event.target.value }))}
                  placeholder="Duzenli kullandigi ilac veya doz bilgisi"
                />
              </label>
              <label className="field">
                <span>Saglik notu</span>
                <textarea
                  rows={4}
                  value={form.healthNotes}
                  onChange={(event) => setForm((current) => ({ ...current, healthNotes: event.target.value }))}
                  placeholder="Okulun bilmesi gereken saglik veya dikkat notu"
                />
              </label>
            </div>
            {avatarPreviewUrl ? (
              <div className="avatar-preview-card">
                <img src={avatarPreviewUrl} alt="Ogrenci onizleme" className="avatar-preview-image" />
                <div>
                  <div className="section-eyebrow">Onizleme</div>
                  <strong>{avatarFile?.name || 'Mevcut ogrenci resmi'}</strong>
                  <p className="panel-copy compact-copy">Bu gorsel ogrenci kartinda ve detay ekranlarinda kullanilacak.</p>
                </div>
              </div>
            ) : null}
            <div className="inline-form-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => resetComposer(form.classId || classes[0]?.id || '')}
              >
                Vazgec
              </button>
              <button type="submit" className="primary-button" disabled={saving || !classes.length}>
                {saving ? 'Kaydediliyor...' : editingId ? 'Degisiklikleri Kaydet' : 'Ogrenciyi Kaydet'}
              </button>
            </div>
          </form>
        ) : null}

        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ad soyad</th>
                <th>Sinif</th>
                <th>Cinsiyet</th>
                <th>Dogum tarihi</th>
                <th>Saglik ozeti</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="student-cell">
                      {item.avatarUrl ? (
                        <img src={item.avatarUrl} alt={item.name || item.fullName || 'Ogrenci'} className="student-avatar" />
                      ) : (
                        <div className="student-avatar student-avatar-fallback">
                          {(item.name || item.fullName || '?').slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <strong>{item.name || item.fullName || '-'}</strong>
                      </div>
                    </div>
                  </td>
                  <td>{item.className}</td>
                  <td>{item.gender || '-'}</td>
                  <td>{item.birthDate || '-'}</td>
                  <td>
                    <div className="health-cell">
                      <div className="health-summary-copy">
                        {item.allergies?.[0]?.trim() || item.medicationNotes?.trim() || item.healthNotes?.trim() ? (
                          <>
                            {item.allergies?.[0]?.trim() ? `Alerji: ${item.allergies[0]}` : ''}
                            {item.allergies?.[0]?.trim() && (item.medicationNotes?.trim() || item.healthNotes?.trim()) ? ' · ' : ''}
                            {item.medicationNotes?.trim() ? `Ilac: ${item.medicationNotes}` : ''}
                            {item.medicationNotes?.trim() && item.healthNotes?.trim() ? ' · ' : ''}
                            {item.healthNotes?.trim() ? item.healthNotes : ''}
                          </>
                        ) : (
                          '-'
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="mini-button" onClick={() => openEditComposer(item)}>
                        Duzenle
                      </button>
                      <button type="button" className="mini-button danger-button" onClick={() => handleDelete(item)}>
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && !loading ? (
                <tr>
                  <td colSpan={6} className="empty-cell">Ogrenci kaydi bulunamadi.</td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={6} className="empty-cell">Ogrenci listesi yukleniyor...</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
