import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, type CalendarEventDto, type ClassDto, type UpsertCalendarEventPayload } from '../lib/api';

interface CalendarEventsPageProps {
  token: string;
}

interface EventFormState {
  id?: string;
  classId: string;
  title: string;
  eventType: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  isAllDay: boolean;
  isActive: boolean;
  category: string;
  description: string;
  requiredMaterials: string;
  dressCodeNotes: string;
  parentNotificationText: string;
}

const EVENT_TYPES = [
  { value: 'activity', label: 'Etkinlik' },
  { value: 'trip', label: 'Gezi' },
  { value: 'meeting', label: 'Toplanti' },
  { value: 'reminder', label: 'Hatirlatma' },
  { value: 'other', label: 'Diger' },
];

function toLocalDate(isoValue?: string) {
  if (!isoValue) return '';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function toLocalTime(isoValue?: string) {
  if (!isoValue) return '';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function toIso(date: string, time: string) {
  const resolvedTime = time || '09:00';
  return new Date(`${date}T${resolvedTime}:00`).toISOString();
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitialFormState(defaultClassId = ''): EventFormState {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return {
    classId: defaultClassId,
    title: '',
    eventType: 'activity',
    startDate: date,
    startTime: '09:00',
    endDate: '',
    endTime: '',
    isAllDay: false,
    isActive: true,
    category: '',
    description: '',
    requiredMaterials: '',
    dressCodeNotes: '',
    parentNotificationText: '',
  };
}

export default function CalendarEventsPage({ token }: CalendarEventsPageProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [classes, setClasses] = useState<ClassDto[]>([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [items, setItems] = useState<CalendarEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormState>(() => getInitialFormState());

  const activeClassName = useMemo(
    () => classes.find((item) => item.id === selectedClassFilter)?.name,
    [classes, selectedClassFilter],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadClasses() {
      try {
        const classItems = await api.classes(token);
        if (cancelled) return;
        setClasses(classItems);
        setForm((current) => ({
          ...current,
          classId: current.classId || classItems[0]?.id || '',
        }));
      } catch {
        if (!cancelled) {
          setClasses([]);
        }
      }
    }

    void loadClasses();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setLoading(true);
      setError(null);
      try {
        const events = await api.calendarEvents(
          token,
          year,
          month,
          selectedClassFilter === 'all' ? undefined : selectedClassFilter,
          includeInactive,
        );
        if (!cancelled) {
          setItems(events);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setError('Etkinlik verileri yuklenemedi.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadEvents();
    return () => {
      cancelled = true;
    };
  }, [includeInactive, month, selectedClassFilter, token, year]);

  function handleMonthChange(value: string) {
    if (!value) return;
    const [nextYear, nextMonth] = value.split('-').map(Number);
    if (!nextYear || !nextMonth) return;
    setYear(nextYear);
    setMonth(nextMonth);
  }

  function openCreate() {
    setError(null);
    setSuccess(null);
    setForm(getInitialFormState(classes[0]?.id || ''));
    setIsComposerOpen(true);
  }

  function openEdit(item: CalendarEventDto) {
    setError(null);
    setSuccess(null);
    setForm({
      id: item.id,
      classId: item.classId || '',
      title: item.title,
      eventType: item.type,
      startDate: toLocalDate(item.startAt),
      startTime: toLocalTime(item.startAt),
      endDate: toLocalDate(item.endAt),
      endTime: toLocalTime(item.endAt),
      isAllDay: item.isAllDay,
      isActive: item.isActive,
      category: item.category || '',
      description: item.description || '',
      requiredMaterials: item.requiredMaterials || '',
      dressCodeNotes: item.dressCodeNotes || '',
      parentNotificationText: item.parentNotificationText || '',
    });
    setIsComposerOpen(true);
  }

  function closeComposer() {
    setForm(getInitialFormState(classes[0]?.id || ''));
    setIsComposerOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.title.trim()) {
      setError('Etkinlik basligi zorunludur.');
      return;
    }

    if (!form.startDate) {
      setError('Baslangic tarihi zorunludur.');
      return;
    }

    setSaving(true);
    try {
      const payload: UpsertCalendarEventPayload = {
        classId: form.classId || undefined,
        title: form.title.trim(),
        eventType: form.eventType,
        startAt: toIso(form.startDate, form.startTime || '09:00'),
        endAt: form.endDate ? toIso(form.endDate, form.endTime || '10:00') : undefined,
        isAllDay: form.isAllDay,
        isActive: form.isActive,
        category: form.category.trim() || undefined,
        description: form.description.trim() || undefined,
        requiredMaterials: form.requiredMaterials.trim() || undefined,
        dressCodeNotes: form.dressCodeNotes.trim() || undefined,
        parentNotificationText: form.parentNotificationText.trim() || undefined,
      };

      if (form.id) {
        await api.updateCalendarEvent(token, form.id, payload);
        setSuccess('Etkinlik kaydi guncellendi.');
      } else {
        await api.createCalendarEvent(token, payload);
        setSuccess('Etkinlik basariyla eklendi.');
      }

      closeComposer();
      const refreshed = await api.calendarEvents(
        token,
        year,
        month,
        selectedClassFilter === 'all' ? undefined : selectedClassFilter,
        includeInactive,
      );
      setItems(refreshed);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Etkinlik kaydi tamamlanamadi.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: CalendarEventDto) {
    if (!window.confirm(`${item.title} kaydini pasife almak istiyor musun?`)) return;

    setError(null);
    setSuccess(null);
    try {
      await api.deleteCalendarEvent(token, item.id);
      setSuccess('Etkinlik kaydi pasife alindi.');
      const refreshed = await api.calendarEvents(
        token,
        year,
        month,
        selectedClassFilter === 'all' ? undefined : selectedClassFilter,
        includeInactive,
      );
      setItems(refreshed);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Etkinlik silinemedi.');
    }
  }

  return (
    <div className="content-grid">
      <section className="panel-card full-span">
        <div className="panel-card-header">
          <div>
            <div className="section-eyebrow">Aylik program</div>
            <h3>Etkinlik Programi</h3>
            <p className="panel-copy compact-copy">
              Veliye gidecek bildirim metnini, gerekli malzemeleri ve kiyafet bilgisini etkinlik bazinda planlayabilirsin.
            </p>
          </div>
          <div className="header-actions stack-on-mobile">
            <span className="table-meta">{items.length} etkinlik</span>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                if (isComposerOpen && !form.id) {
                  closeComposer();
                } else {
                  openCreate();
                }
              }}
            >
              {isComposerOpen && !form.id ? 'Formu Kapat' : 'Yeni Etkinlik'}
            </button>
          </div>
        </div>

        <div className="form-grid meal-plan-filter-grid">
          <label className="field">
            <span>Ay secimi</span>
            <input
              type="month"
              value={`${year}-${String(month).padStart(2, '0')}`}
              onChange={(event) => handleMonthChange(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Sinif filtresi</span>
            <select value={selectedClassFilter} onChange={(event) => setSelectedClassFilter(event.target.value)}>
              <option value="all">Tum siniflar</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field checkbox-field">
            <span>Pasifleri goster</span>
            <input type="checkbox" checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} />
          </label>
        </div>

        {activeClassName ? (
          <p className="panel-copy compact-copy">Filtre: {activeClassName}</p>
        ) : null}

        {error ? <div className="error-banner">{error}</div> : null}
        {success ? <div className="success-banner">{success}</div> : null}

        {isComposerOpen ? (
          <form className="inline-form-shell" onSubmit={handleSubmit}>
            <div className="inline-form-header">
              <div>
                <div className="section-eyebrow">{form.id ? 'Duzenle' : 'Yeni kayit'}</div>
                <strong>{form.id ? 'Etkinligi Guncelle' : 'Etkinlik Bilgileri'}</strong>
              </div>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Etkinlik basligi</span>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Ornek: Boyama etkinligi"
                />
              </label>
              <label className="field">
                <span>Etkinlik tipi</span>
                <select
                  value={form.eventType}
                  onChange={(event) => setForm((current) => ({ ...current, eventType: event.target.value }))}
                >
                  {EVENT_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Sinif</span>
                <select value={form.classId} onChange={(event) => setForm((current) => ({ ...current, classId: event.target.value }))}>
                  <option value="">Tum siniflar</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Kategori (opsiyonel)</span>
                <input
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  placeholder="Ornek: Doga haftasi"
                />
              </label>
              <label className="field">
                <span>Baslangic tarihi</span>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Baslangic saati</span>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Bitis tarihi (opsiyonel)</span>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Bitis saati (opsiyonel)</span>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
                />
              </label>
              <label className="field field-span-2">
                <span>Gerekli malzemeler</span>
                <textarea
                  rows={2}
                  value={form.requiredMaterials}
                  onChange={(event) => setForm((current) => ({ ...current, requiredMaterials: event.target.value }))}
                  placeholder="Ornek: Parmak boyasi, onluk"
                />
              </label>
              <label className="field">
                <span>Kiyafet notu</span>
                <input
                  value={form.dressCodeNotes}
                  onChange={(event) => setForm((current) => ({ ...current, dressCodeNotes: event.target.value }))}
                  placeholder="Ornek: Esofman + yedek tisort"
                />
              </label>
              <label className="field checkbox-field">
                <span>Tum gun surer</span>
                <input
                  type="checkbox"
                  checked={form.isAllDay}
                  onChange={(event) => setForm((current) => ({ ...current, isAllDay: event.target.checked }))}
                />
              </label>
              <label className="field field-span-2">
                <span>Veliye gidecek bildirim metni</span>
                <textarea
                  rows={3}
                  value={form.parentNotificationText}
                  onChange={(event) => setForm((current) => ({ ...current, parentNotificationText: event.target.value }))}
                  placeholder="Yarin etkinlikte boya calismasi var. Lutfen onluk getiriniz."
                />
              </label>
              <label className="field field-span-2">
                <span>Etkinlik aciklamasi</span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Ogretmen notu veya etkinlik detayi"
                />
              </label>
              <label className="field checkbox-field">
                <span>Aktif kayit</span>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                />
              </label>
            </div>

            <div className="inline-form-actions">
              <button type="button" className="ghost-button" onClick={closeComposer}>
                Vazgec
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Kaydediliyor...' : form.id ? 'Degisiklikleri Kaydet' : 'Etkinligi Kaydet'}
              </button>
            </div>
          </form>
        ) : null}

        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Etkinlik</th>
                <th>Tarih</th>
                <th>Sinif</th>
                <th>Tip</th>
                <th>Veli bildirimi</th>
                <th>Durum</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    {item.requiredMaterials ? (
                      <div className="field-hint">Malzeme: {item.requiredMaterials}</div>
                    ) : null}
                    {item.dressCodeNotes ? (
                      <div className="field-hint">Kiyafet: {item.dressCodeNotes}</div>
                    ) : null}
                  </td>
                  <td>{formatDateTime(item.startAt)}</td>
                  <td>{item.className || 'Tum siniflar'}</td>
                  <td>{EVENT_TYPES.find((type) => type.value === item.type)?.label || item.type}</td>
                  <td>{item.parentNotificationText || '-'}</td>
                  <td>{item.isActive ? 'Aktif' : 'Pasif'}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="mini-button" onClick={() => openEdit(item)}>
                        Duzenle
                      </button>
                      <button type="button" className="mini-button danger-button" onClick={() => void handleDelete(item)}>
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && !loading ? (
                <tr>
                  <td colSpan={7} className="empty-cell">Secilen donemde etkinlik bulunamadi.</td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={7} className="empty-cell">Etkinlik listesi yukleniyor...</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
