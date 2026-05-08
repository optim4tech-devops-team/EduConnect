import { FormEvent, useEffect, useState } from 'react';
import { api, type ClassDto, type TeacherDto } from '../lib/api';

interface ClassesPageProps {
  token: string;
}

interface ClassFormState {
  name: string;
  teacherId: string;
  academicYear: string;
}

const initialForm: ClassFormState = {
  name: '',
  teacherId: '',
  academicYear: '',
};

export default function ClassesPage({ token }: ClassesPageProps) {
  const [items, setItems] = useState<ClassDto[]>([]);
  const [teachers, setTeachers] = useState<TeacherDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<ClassFormState>(initialForm);

  useEffect(() => {
    void loadPage();
  }, [token]);

  async function loadPage() {
    setLoading(true);
    setError(null);

    try {
      const [classes, teacherItems] = await Promise.all([api.classes(token), api.teachers(token)]);
      setItems(classes);
      setTeachers(teacherItems.filter((item) => item.isActive !== false));
    } catch {
      setItems([]);
      setTeachers([]);
      setError('Sinif verileri yuklenemedi.');
    } finally {
      setLoading(false);
    }
  }

  function openCreateComposer() {
    setEditingId(null);
    setError(null);
    setSuccess(null);
    setForm(initialForm);
    setIsComposerOpen(true);
  }

  function openEditComposer(item: ClassDto) {
    setEditingId(item.id);
    setError(null);
    setSuccess(null);
    setForm({
      name: item.name,
      teacherId: item.teacherId || '',
      academicYear: item.academicYear || '',
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

    if (!form.name.trim()) {
      setError('Sinif adi zorunludur.');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await api.updateClass(token, editingId, {
          name: form.name.trim(),
          teacherId: form.teacherId || undefined,
          academicYear: form.academicYear.trim() || undefined,
          clearTeacher: !form.teacherId,
        });
        setSuccess('Sinif kaydi guncellendi.');
      } else {
        await api.createClass(token, {
          name: form.name.trim(),
          teacherId: form.teacherId || undefined,
          academicYear: form.academicYear.trim() || undefined,
        });
        setSuccess('Yeni sinif basariyla eklendi.');
      }

      closeComposer();
      await loadPage();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Sinif kaydi olusturulamadi.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: ClassDto) {
    if (!window.confirm(`${item.name} sinifini silmek istiyor musun?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      await api.deleteClass(token, item.id);
      if (editingId === item.id) {
        closeComposer();
      }
      setSuccess('Sinif kaydi silindi.');
      await loadPage();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Sinif silinemedi.');
    }
  }

  return (
    <div className="content-grid">
      <section className="panel-card full-span">
        <div className="panel-card-header">
          <div>
            <div className="section-eyebrow">Canli veri</div>
            <h3>Siniflar</h3>
            <p className="panel-copy compact-copy">
              Siniflar web panelden yonetilebilir; ogretmen atamasi ilk kayitta ya da sonradan degistirilebilir.
            </p>
          </div>
          <div className="header-actions stack-on-mobile">
            <span className="table-meta">{items.length} sinif</span>
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
              {isComposerOpen && !editingId ? 'Formu Kapat' : 'Yeni Sinif'}
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
                <strong>{editingId ? 'Sinifi Guncelle' : 'Sinif Bilgileri'}</strong>
              </div>
              <span className="soft-pill">{teachers.length} uygun ogretmen</span>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Sinif adi</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Ornek: Gunes Sinifi"
                />
              </label>
              <label className="field">
                <span>Ogretmen</span>
                <select
                  value={form.teacherId}
                  onChange={(event) => setForm((current) => ({ ...current, teacherId: event.target.value }))}
                >
                  <option value="">Daha sonra atanacak</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name || teacher.fullName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Egitim yili</span>
                <input
                  value={form.academicYear}
                  onChange={(event) => setForm((current) => ({ ...current, academicYear: event.target.value }))}
                  placeholder="2025-2026"
                />
              </label>
            </div>
            <div className="inline-form-actions">
              <button type="button" className="ghost-button" onClick={closeComposer}>
                Vazgec
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Kaydediliyor...' : editingId ? 'Degisiklikleri Kaydet' : 'Sinifi Kaydet'}
              </button>
            </div>
          </form>
        ) : null}

        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sinif</th>
                <th>Ogretmen</th>
                <th>Egitim yili</th>
                <th>Ogrenci sayisi</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.teacherName || 'Atanmadi'}</td>
                  <td>{item.academicYear || '-'}</td>
                  <td>{item.studentCount}</td>
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
                  <td colSpan={5} className="empty-cell">Sinif kaydi bulunamadi.</td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={5} className="empty-cell">Sinif listesi yukleniyor...</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
