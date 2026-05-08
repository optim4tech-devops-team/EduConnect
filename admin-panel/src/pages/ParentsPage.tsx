import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, type ParentDto, type StudentDto } from '../lib/api';

interface ParentsPageProps {
  token: string;
}

interface ParentFormState {
  fullName: string;
  email: string;
  phone: string;
  studentId: string;
  relationship: string;
  isPrimaryContact: boolean;
  canPickup: boolean;
}

const initialForm: ParentFormState = {
  fullName: '',
  email: '',
  phone: '',
  studentId: '',
  relationship: 'Anne',
  isPrimaryContact: true,
  canPickup: true,
};

export default function ParentsPage({ token }: ParentsPageProps) {
  const [items, setItems] = useState<ParentDto[]>([]);
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<ParentFormState>(initialForm);

  const selectedStudent = useMemo(
    () => students.find((item) => item.id === form.studentId),
    [students, form.studentId],
  );

  useEffect(() => {
    void loadPage();
  }, [token]);

  async function loadPage() {
    setLoading(true);
    setError(null);

    try {
      const [parents, studentItems] = await Promise.all([api.parents(token), api.students(token)]);
      setItems(parents);
      setStudents(studentItems);
      setForm((current) => ({
        ...current,
        studentId: current.studentId || studentItems[0]?.id || '',
      }));
    } catch {
      setItems([]);
      setStudents([]);
      setError('Veli verileri yuklenemedi.');
    } finally {
      setLoading(false);
    }
  }

  function openCreateComposer() {
    setEditingId(null);
    setError(null);
    setSuccess(null);
    setForm({
      ...initialForm,
      studentId: students[0]?.id || '',
    });
    setIsComposerOpen(true);
  }

  function openEditComposer(item: ParentDto) {
    const firstStudent = item.students[0];
    setEditingId(item.id);
    setError(null);
    setSuccess(null);
    setForm({
      fullName: item.fullName,
      email: item.email || '',
      phone: item.phone || '',
      studentId: firstStudent?.studentId || students[0]?.id || '',
      relationship: firstStudent?.relationship || 'Anne',
      isPrimaryContact: firstStudent?.isPrimaryContact ?? true,
      canPickup: firstStudent?.canPickup ?? true,
    });
    setIsComposerOpen(true);
  }

  function closeComposer() {
    setEditingId(null);
    setForm(initialForm);
    setIsComposerOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.fullName.trim() || !form.phone.trim()) {
      setError('Veli adi ve telefonu zorunludur.');
      return;
    }

    if (!form.studentId) {
      setError('Veliyi baglamak icin bir ogrenci secmelisin.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim(),
        isActive: true,
        students: [
          {
            studentId: form.studentId,
            relationship: form.relationship.trim() || undefined,
            isPrimaryContact: form.isPrimaryContact,
            canPickup: form.canPickup,
          },
        ],
      };

      if (editingId) {
        await api.updateParent(token, editingId, payload);
        setSuccess('Veli kaydi guncellendi.');
      } else {
        await api.createParent(token, payload);
        setSuccess('Yeni veli basariyla eklendi.');
      }

      closeComposer();
      await loadPage();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Veli kaydi olusturulamadi.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: ParentDto) {
    if (!window.confirm(`${item.fullName} kaydini pasife almak istiyor musun?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      await api.deleteParent(token, item.id);
      if (editingId === item.id) {
        closeComposer();
      }
      setSuccess('Veli pasife alindi.');
      await loadPage();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Veli silinemedi.');
    }
  }

  return (
    <div className="content-grid">
      <section className="panel-card full-span">
        <div className="panel-card-header">
          <div>
            <div className="section-eyebrow">Canli veri</div>
            <h3>Veliler</h3>
            <p className="panel-copy compact-copy">
              En dogru akista veli ogrenciye bagli olusturulur; bu ekranda ilk baglanti ve guncelleme yonetilir.
            </p>
          </div>
          <div className="header-actions stack-on-mobile">
            <span className="table-meta">{items.length} veli</span>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                if (isComposerOpen && !editingId) {
                  closeComposer();
                } else {
                  openCreateComposer();
                }
              }}
            >
              {isComposerOpen && !editingId ? 'Formu Kapat' : 'Yeni Veli'}
            </button>
          </div>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}
        {success ? <div className="success-banner">{success}</div> : null}

        {isComposerOpen ? (
          <form className="inline-form-shell" onSubmit={handleSubmit}>
            <div className="inline-form-header">
              <div>
                <div className="section-eyebrow">{editingId ? 'Duzenle' : 'Yeni kayit'}</div>
                <strong>{editingId ? 'Veli Kaydini Guncelle' : 'Veli ve Ogrenci Baglantisi'}</strong>
              </div>
              {selectedStudent ? (
                <span className="soft-pill">
                  {(selectedStudent.fullName || selectedStudent.name) ?? '-'} · {selectedStudent.className}
                </span>
              ) : null}
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Ad soyad</span>
                <input
                  value={form.fullName}
                  onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                  placeholder="Veli adi soyadi"
                />
              </label>
              <label className="field">
                <span>Telefon</span>
                <input
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="0532 000 00 00"
                />
              </label>
              <label className="field">
                <span>E-posta</span>
                <input
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="veli@aile.com"
                />
              </label>
              <label className="field">
                <span>Baglanacak ogrenci</span>
                <select
                  value={form.studentId}
                  onChange={(event) => setForm((current) => ({ ...current, studentId: event.target.value }))}
                >
                  <option value="">Ogrenci sec</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.fullName || student.name} · {student.className}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Yakinlik</span>
                <select
                  value={form.relationship}
                  onChange={(event) => setForm((current) => ({ ...current, relationship: event.target.value }))}
                >
                  <option value="Anne">Anne</option>
                  <option value="Baba">Baba</option>
                  <option value="Buyukanne">Buyukanne</option>
                  <option value="Buyukbaba">Buyukbaba</option>
                  <option value="Diger">Diger</option>
                </select>
              </label>
              <label className="field checkbox-field">
                <span>Birincil iletisim</span>
                <input
                  type="checkbox"
                  checked={form.isPrimaryContact}
                  onChange={(event) => setForm((current) => ({ ...current, isPrimaryContact: event.target.checked }))}
                />
              </label>
              <label className="field checkbox-field">
                <span>Teslim alabilir</span>
                <input
                  type="checkbox"
                  checked={form.canPickup}
                  onChange={(event) => setForm((current) => ({ ...current, canPickup: event.target.checked }))}
                />
              </label>
            </div>
            <div className="inline-form-actions">
              <button type="button" className="ghost-button" onClick={closeComposer}>
                Vazgec
              </button>
              <button type="submit" className="primary-button" disabled={saving || !students.length}>
                {saving ? 'Kaydediliyor...' : editingId ? 'Degisiklikleri Kaydet' : 'Veliyi Kaydet'}
              </button>
            </div>
          </form>
        ) : null}

        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ad soyad</th>
                <th>Telefon</th>
                <th>E-posta</th>
                <th>Bagli ogrenci</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.fullName}</td>
                  <td>{item.phone || '-'}</td>
                  <td>{item.email || '-'}</td>
                  <td>
                    {item.students
                      .map((student) => `${student.studentName}${student.relationship ? ` (${student.relationship})` : ''}`)
                      .join(', ') || '-'}
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
                  <td colSpan={5} className="empty-cell">Veli kaydi bulunamadi.</td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={5} className="empty-cell">Veli listesi yukleniyor...</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
