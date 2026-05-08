import { FormEvent, useEffect, useState } from 'react';
import { api, type TeacherDto } from '../lib/api';

interface TeachersPageProps {
  token: string;
}

interface TeacherFormState {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

const initialForm: TeacherFormState = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
};

export default function TeachersPage({ token }: TeachersPageProps) {
  const [items, setItems] = useState<TeacherDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<TeacherFormState>(initialForm);

  useEffect(() => {
    void loadPage();
  }, [token]);

  async function loadPage() {
    setLoading(true);
    setError(null);

    try {
      const teachers = await api.teachers(token);
      setItems(teachers);
    } catch {
      setItems([]);
      setError('Ogretmen verileri yuklenemedi.');
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

  function openEditComposer(item: TeacherDto) {
    setEditingId(item.id);
    setError(null);
    setSuccess(null);
    setForm({
      fullName: item.fullName || item.name || '',
      email: item.email,
      phone: item.phone || '',
      password: '',
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
      setError('Ogretmen adi ve telefonu zorunludur.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim(),
        password: form.password.trim() || undefined,
        isActive: true,
      };

      if (editingId) {
        await api.updateTeacher(token, editingId, payload);
        setSuccess('Ogretmen kaydi guncellendi.');
      } else {
        await api.createTeacher(token, payload);
        setSuccess('Yeni ogretmen basariyla eklendi.');
      }

      closeComposer();
      await loadPage();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Ogretmen kaydi olusturulamadi.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: TeacherDto) {
    if (!window.confirm(`${item.fullName || item.name} kaydini pasife almak istiyor musun?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      await api.deleteTeacher(token, item.id);
      if (editingId === item.id) {
        closeComposer();
      }
      setSuccess('Ogretmen pasife alindi.');
      await loadPage();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Ogretmen silinemedi.');
    }
  }

  return (
    <div className="content-grid">
      <section className="panel-card full-span">
        <div className="panel-card-header">
          <div>
            <div className="section-eyebrow">Canli veri</div>
            <h3>Ogretmenler</h3>
            <p className="panel-copy compact-copy">
              Ogretmenler burada acilir, duzenlenir ve gerektiğinde pasife alinabilir.
            </p>
          </div>
          <div className="header-actions stack-on-mobile">
            <span className="table-meta">{items.length} ogretmen</span>
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
              {isComposerOpen && !editingId ? 'Formu Kapat' : 'Yeni Ogretmen'}
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
                <strong>{editingId ? 'Ogretmeni Guncelle' : 'Ogretmen Bilgileri'}</strong>
              </div>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Ad soyad</span>
                <input
                  value={form.fullName}
                  onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                  placeholder="Ogretmen adi soyadi"
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
                  placeholder="ogretmen@okul.com"
                />
              </label>
              <label className="field">
                <span>{editingId ? 'Yeni sifre (opsiyonel)' : 'Gecici sifre'}</span>
                <input
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Bos birakirsan mevcut sifre korunur"
                />
              </label>
            </div>
            <div className="inline-form-actions">
              <button type="button" className="ghost-button" onClick={closeComposer}>
                Vazgec
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Kaydediliyor...' : editingId ? 'Degisiklikleri Kaydet' : 'Ogretmeni Kaydet'}
              </button>
            </div>
          </form>
        ) : null}

        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ad soyad</th>
                <th>E-posta</th>
                <th>Telefon</th>
                <th>Durum</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name || item.fullName}</td>
                  <td>{item.email}</td>
                  <td>{item.phone || '-'}</td>
                  <td>{item.isActive === false ? 'Pasif' : 'Aktif'}</td>
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
                  <td colSpan={5} className="empty-cell">Ogretmen kaydi bulunamadi.</td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={5} className="empty-cell">Ogretmen listesi yukleniyor...</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
