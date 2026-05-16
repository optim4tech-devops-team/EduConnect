import { FormEvent, useEffect, useState } from 'react';
import { api, type PlatformSchoolDto } from '../lib/api';

interface PlatformSchoolsPageProps {
  token: string;
}

interface SchoolFormState {
  name: string;
  address: string;
  phone: string;
  plan: string;
  maxStudents: string;
  maxTeachers: string;
  isActive: boolean;
}

interface AdminFormState {
  fullName: string;
  phone: string;
  email: string;
}

const initialSchoolForm: SchoolFormState = {
  name: '',
  address: '',
  phone: '',
  plan: 'starter',
  maxStudents: '200',
  maxTeachers: '20',
  isActive: true,
};

const initialAdminForm: AdminFormState = {
  fullName: '',
  phone: '',
  email: '',
};

export default function PlatformSchoolsPage({ token }: PlatformSchoolsPageProps) {
  const [schools, setSchools] = useState<PlatformSchoolDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSchoolFormOpen, setIsSchoolFormOpen] = useState(false);
  const [isAdminFormOpen, setIsAdminFormOpen] = useState(false);
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  const [assigningSchoolId, setAssigningSchoolId] = useState<string | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'passive'>('all');
  const [schoolForm, setSchoolForm] = useState<SchoolFormState>(initialSchoolForm);
  const [adminForm, setAdminForm] = useState<AdminFormState>(initialAdminForm);

  const selectedSchool = schools.find((school) => school.id === selectedSchoolId) ?? schools[0] ?? null;

  useEffect(() => {
    void loadPage();
  }, [token]);

  async function loadPage() {
    setLoading(true);
    setError(null);

    try {
      const result = await api.platformSchools(
        token,
        searchTerm.trim() || undefined,
        activeFilter === 'all' ? undefined : activeFilter === 'active',
      );
      setSchools(result);
      setSelectedSchoolId((current) =>
        current && result.some((school) => school.id === current)
          ? current
          : result[0]?.id ?? null,
      );
    } catch {
      setSchools([]);
      setSelectedSchoolId(null);
      setError('Okul verileri yuklenemedi.');
    } finally {
      setLoading(false);
    }
  }

  function openCreateForm() {
    setEditingSchoolId(null);
    setSchoolForm(initialSchoolForm);
    setAdminForm(initialAdminForm);
    setIsAdminFormOpen(false);
    setIsSchoolFormOpen(true);
    setError(null);
    setSuccess(null);
  }

  function openEditForm(item: PlatformSchoolDto) {
    setEditingSchoolId(item.id);
    setSchoolForm({
      name: item.name,
      address: item.address || '',
      phone: item.phone || '',
      plan: item.plan || 'starter',
      maxStudents: String(item.maxStudents || 0),
      maxTeachers: String(item.maxTeachers || 0),
      isActive: item.isActive,
    });
    setIsAdminFormOpen(false);
    setIsSchoolFormOpen(true);
    setError(null);
    setSuccess(null);
  }

  function openAssignAdminForm(item: PlatformSchoolDto) {
    setAssigningSchoolId(item.id);
    setAdminForm({
      fullName: item.primaryAdminName || '',
      phone: item.primaryAdminPhone || '',
      email: '',
    });
    setIsSchoolFormOpen(false);
    setIsAdminFormOpen(true);
    setError(null);
    setSuccess(null);
  }

  function closeForms() {
    setEditingSchoolId(null);
    setAssigningSchoolId(null);
    setIsSchoolFormOpen(false);
    setIsAdminFormOpen(false);
    setSchoolForm(initialSchoolForm);
    setAdminForm(initialAdminForm);
  }

  async function handleSchoolSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        name: schoolForm.name.trim(),
        address: schoolForm.address.trim() || undefined,
        phone: schoolForm.phone.trim() || undefined,
        plan: schoolForm.plan,
        isActive: schoolForm.isActive,
        maxStudents: Number(schoolForm.maxStudents || '0'),
        maxTeachers: Number(schoolForm.maxTeachers || '0'),
      };

      if (editingSchoolId) {
        await api.updatePlatformSchool(token, editingSchoolId, payload);
        setSuccess('Okul kaydi guncellendi.');
      } else {
        const result = await api.createPlatformSchool(token, {
          ...payload,
          primaryAdmin: {
            fullName: adminForm.fullName.trim(),
            phone: adminForm.phone.trim(),
            email: adminForm.email.trim() || undefined,
          },
        });
        setSuccess(formatAdminPasswordSuccess('Yeni okul basariyla eklendi.', result.primaryAdminTemporaryPassword));
      }

      closeForms();
      await loadPage();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Okul kaydi olusturulamadi.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignAdminSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assigningSchoolId) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await api.assignPlatformSchoolAdmin(token, assigningSchoolId, {
        fullName: adminForm.fullName.trim(),
        phone: adminForm.phone.trim(),
        email: adminForm.email.trim() || undefined,
      });
      setSuccess(formatAdminPasswordSuccess('Okul yoneticisi atandi.', result.primaryAdminTemporaryPassword));
      closeForms();
      await loadPage();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Okul yoneticisi atanamadi.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: PlatformSchoolDto) {
    if (!window.confirm(`${item.name} okulunu silmek istiyor musun?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      await api.deletePlatformSchool(token, item.id);
      setSuccess('Okul kaydi silindi.');
      await loadPage();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Okul silinemedi.');
    }
  }

  return (
    <div className="content-grid">
      <section className="panel-card full-span">
        <div className="panel-card-header">
          <div>
            <div className="section-eyebrow">Canli veri</div>
            <h3>Okullar</h3>
            <p className="panel-copy compact-copy">
              Platform admin bu alandan okul acabilir, duzenleyebilir, silebilir ve okul yoneticisi atayabilir.
            </p>
          </div>
          <div className="header-actions stack-on-mobile">
            <span className="table-meta">{schools.length} okul</span>
            <button type="button" className="primary-button" onClick={openCreateForm}>
              Yeni Okul
            </button>
          </div>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}
        {success ? <div className="success-banner">{success}</div> : null}

        <form
          className="inline-form-shell compact-filter-shell"
          onSubmit={(event) => {
            event.preventDefault();
            void loadPage();
          }}
        >
          <div className="form-grid">
            <label className="field">
              <span>Okul ara</span>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Okul adi, telefon veya adres"
              />
            </label>
            <label className="field">
              <span>Durum</span>
              <select
                value={activeFilter}
                onChange={(event) => setActiveFilter(event.target.value as 'all' | 'active' | 'passive')}
              >
                <option value="all">Tumu</option>
                <option value="active">Aktif okullar</option>
                <option value="passive">Pasif okullar</option>
              </select>
            </label>
          </div>
          <div className="inline-form-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setSearchTerm('');
                setActiveFilter('all');
                setTimeout(() => void loadPage(), 0);
              }}
            >
              Temizle
            </button>
            <button type="submit" className="primary-button">
              Filtrele
            </button>
          </div>
        </form>

        {isSchoolFormOpen ? (
          <form className="inline-form-shell" onSubmit={handleSchoolSubmit}>
            <div className="inline-form-header">
              <div>
                <div className="section-eyebrow">{editingSchoolId ? 'Duzenle' : 'Yeni kayit'}</div>
                <strong>{editingSchoolId ? 'Okul Kaydini Guncelle' : 'Okul ve Ilk Yonetici Bilgileri'}</strong>
              </div>
              <span className="soft-pill">{editingSchoolId ? 'Platform guncelleme' : 'Platform onboarding'}</span>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Okul adi</span>
                <input value={schoolForm.name} onChange={(event) => setSchoolForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="field">
                <span>Telefon</span>
                <input value={schoolForm.phone} onChange={(event) => setSchoolForm((current) => ({ ...current, phone: event.target.value }))} />
              </label>
              <label className="field field-span-2">
                <span>Adres</span>
                <textarea rows={3} value={schoolForm.address} onChange={(event) => setSchoolForm((current) => ({ ...current, address: event.target.value }))} />
              </label>
              <label className="field">
                <span>Plan</span>
                <select value={schoolForm.plan} onChange={(event) => setSchoolForm((current) => ({ ...current, plan: event.target.value }))}>
                  <option value="starter">starter</option>
                  <option value="growth">growth</option>
                  <option value="enterprise">enterprise</option>
                  <option value="demo">demo</option>
                </select>
              </label>
              <label className="field">
                <span>Aktif</span>
                <input type="checkbox" checked={schoolForm.isActive} onChange={(event) => setSchoolForm((current) => ({ ...current, isActive: event.target.checked }))} />
              </label>
              <label className="field">
                <span>Maks ogrenci</span>
                <input value={schoolForm.maxStudents} onChange={(event) => setSchoolForm((current) => ({ ...current, maxStudents: event.target.value }))} />
              </label>
              <label className="field">
                <span>Maks ogretmen</span>
                <input value={schoolForm.maxTeachers} onChange={(event) => setSchoolForm((current) => ({ ...current, maxTeachers: event.target.value }))} />
              </label>
              {!editingSchoolId ? (
                <>
                  <label className="field">
                    <span>Ilk yonetici adi</span>
                    <input value={adminForm.fullName} onChange={(event) => setAdminForm((current) => ({ ...current, fullName: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Ilk yonetici telefonu</span>
                    <input value={adminForm.phone} onChange={(event) => setAdminForm((current) => ({ ...current, phone: event.target.value }))} />
                  </label>
                  <label className="field field-span-2">
                    <span>Ilk yonetici e-posta</span>
                    <input value={adminForm.email} onChange={(event) => setAdminForm((current) => ({ ...current, email: event.target.value }))} />
                  </label>
                </>
              ) : null}
            </div>
            <div className="inline-form-actions">
              <button type="button" className="ghost-button" onClick={closeForms}>
                Vazgec
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Kaydediliyor...' : editingSchoolId ? 'Degisiklikleri Kaydet' : 'Okulu Kaydet'}
              </button>
            </div>
          </form>
        ) : null}

        {isAdminFormOpen ? (
          <form className="inline-form-shell" onSubmit={handleAssignAdminSubmit}>
            <div className="inline-form-header">
              <div>
                <div className="section-eyebrow">Yonetici atama</div>
                <strong>Okul Yonetici Bilgileri</strong>
              </div>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Ad soyad</span>
                <input value={adminForm.fullName} onChange={(event) => setAdminForm((current) => ({ ...current, fullName: event.target.value }))} />
              </label>
              <label className="field">
                <span>Telefon</span>
                <input value={adminForm.phone} onChange={(event) => setAdminForm((current) => ({ ...current, phone: event.target.value }))} />
              </label>
              <label className="field field-span-2">
                <span>E-posta</span>
                <input value={adminForm.email} onChange={(event) => setAdminForm((current) => ({ ...current, email: event.target.value }))} />
              </label>
            </div>
            <div className="inline-form-actions">
              <button type="button" className="ghost-button" onClick={closeForms}>
                Vazgec
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Kaydediliyor...' : 'Yoneticiyi Ata'}
              </button>
            </div>
          </form>
        ) : null}

        {selectedSchool ? (
          <div className="inline-form-shell platform-detail-card">
            <div className="inline-form-header">
              <div>
                <div className="section-eyebrow">Okul detayi</div>
                <strong>{selectedSchool.name}</strong>
                <p className="panel-copy compact-copy">
                  {selectedSchool.address || 'Adres bilgisi girilmemis.'}
                </p>
              </div>
              <span className="soft-pill">{selectedSchool.isActive ? 'Aktif' : 'Pasif'} · {selectedSchool.plan}</span>
            </div>
            <div className="stats-grid inline-stats">
              <article className="metric-card">
                <span>Sinif</span>
                <strong>{selectedSchool.classCount}</strong>
              </article>
              <article className="metric-card">
                <span>Ogrenci</span>
                <strong>{selectedSchool.studentCount}</strong>
              </article>
              <article className="metric-card">
                <span>Ogretmen</span>
                <strong>{selectedSchool.teacherCount}</strong>
              </article>
              <article className="metric-card">
                <span>Veli</span>
                <strong>{selectedSchool.parentCount}</strong>
              </article>
            </div>
            <div className="soft-inline-list">
              <span className="soft-pill">Telefon: {selectedSchool.phone || '-'}</span>
              <span className="soft-pill">Yonetici: {selectedSchool.primaryAdminName || 'Atanmadi'}</span>
              <span className="soft-pill">Yonetici Tel: {selectedSchool.primaryAdminPhone || '-'}</span>
              <span className="soft-pill">Limit: {selectedSchool.maxStudents} ogrenci / {selectedSchool.maxTeachers} ogretmen</span>
            </div>
          </div>
        ) : null}

        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Okul</th>
                <th>Plan</th>
                <th>Yonetici</th>
                <th>Sinif</th>
                <th>Ogrenci</th>
                <th>Ogretmen</th>
                <th>Durum</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((school) => (
                <tr key={school.id}>
                  <td>{school.name}</td>
                  <td>{school.plan}</td>
                  <td>{school.primaryAdminName || '-'}</td>
                  <td>{school.classCount}</td>
                  <td>{school.studentCount}</td>
                  <td>{school.teacherCount}</td>
                  <td>{school.isActive ? 'Aktif' : 'Pasif'}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="mini-button" onClick={() => openEditForm(school)}>
                        Duzenle
                      </button>
                      <button type="button" className="mini-button" onClick={() => setSelectedSchoolId(school.id)}>
                        Detay
                      </button>
                      <button type="button" className="mini-button" onClick={() => openAssignAdminForm(school)}>
                        Yonetici
                      </button>
                      <button type="button" className="mini-button danger-button" onClick={() => handleDelete(school)}>
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!schools.length && !loading ? (
                <tr>
                  <td colSpan={8} className="empty-cell">Okul kaydi bulunamadi.</td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={8} className="empty-cell">Okul listesi yukleniyor...</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function formatAdminPasswordSuccess(message: string, temporaryPassword?: string) {
  return temporaryPassword
    ? `${message} Gecici yonetici sifresi: ${temporaryPassword}`
    : message;
}
