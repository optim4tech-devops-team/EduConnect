import { useEffect, useMemo, useState } from 'react';
import { api, type ClassDto, type MealPlanEntryDto } from '../lib/api';

interface MealPlanPageProps {
  token: string;
}

interface DayFormState {
  day: number;
  breakfast: string;
  lunch: string;
  snack: string;
  allergens: string;
  notes: string;
}

function buildMonthRows(year: number, month: number) {
  const dayCount = new Date(year, month, 0).getDate();
  return Array.from({ length: dayCount }, (_, index) => ({
    day: index + 1,
    breakfast: '',
    lunch: '',
    snack: '',
    allergens: '',
    notes: '',
  }));
}

function parseDateDay(value: string) {
  const parts = value.split('-');
  const dayPart = parts[2];
  const day = Number(dayPart);
  return Number.isFinite(day) ? day : 0;
}

function isRowEmpty(row: DayFormState) {
  return (
    !row.breakfast.trim() &&
    !row.lunch.trim() &&
    !row.snack.trim() &&
    !row.allergens.trim() &&
    !row.notes.trim()
  );
}

export default function MealPlanPage({ token }: MealPlanPageProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [classes, setClasses] = useState<ClassDto[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [rows, setRows] = useState<DayFormState[]>(() => buildMonthRows(now.getFullYear(), now.getMonth() + 1));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === selectedClassId),
    [classes, selectedClassId],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadClasses() {
      try {
        const classItems = await api.classes(token);
        if (cancelled) {
          return;
        }
        setClasses(classItems);
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

    async function loadMealPlan() {
      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const data = await api.mealPlan(token, year, month, selectedClassId === 'all' ? undefined : selectedClassId);
        if (cancelled) {
          return;
        }

        const mappedByDay = new Map<number, MealPlanEntryDto>();
        data.forEach((entry) => {
          const day = parseDateDay(entry.date);
          if (day > 0) {
            mappedByDay.set(day, entry);
          }
        });

        const monthRows = buildMonthRows(year, month).map((row) => {
          const existing = mappedByDay.get(row.day);
          if (!existing) {
            return row;
          }

          return {
            day: row.day,
            breakfast: existing.breakfast ?? '',
            lunch: existing.lunch ?? '',
            snack: existing.snack ?? '',
            allergens: existing.allergens ?? '',
            notes: existing.notes ?? '',
          };
        });

        setRows(monthRows);
      } catch {
        if (!cancelled) {
          setRows(buildMonthRows(year, month));
          setError('Yemek takvimi yuklenemedi.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMealPlan();
    return () => {
      cancelled = true;
    };
  }, [month, selectedClassId, token, year]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const nonEmptyDays = rows
        .filter((row) => !isRowEmpty(row))
        .map((row) => ({
          day: row.day,
          breakfast: row.breakfast.trim() || undefined,
          lunch: row.lunch.trim() || undefined,
          snack: row.snack.trim() || undefined,
          allergens: row.allergens.trim() || undefined,
          notes: row.notes.trim() || undefined,
        }));

      const daysPayload = nonEmptyDays.length
        ? nonEmptyDays
        : rows.map((row) => ({ day: row.day }));

      await api.saveMonthlyMealPlan(token, {
        year,
        month,
        classId: selectedClassId === 'all' ? undefined : selectedClassId,
        days: daysPayload,
      });

      setSuccess('Aylik yemek takvimi kaydedildi.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Yemek takvimi kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  function updateRow(day: number, field: keyof Omit<DayFormState, 'day'>, value: string) {
    setRows((current) => current.map((row) => (row.day === day ? { ...row, [field]: value } : row)));
  }

  function handleMonthChange(value: string) {
    if (!value) {
      return;
    }

    const [nextYear, nextMonth] = value.split('-').map(Number);
    if (!nextYear || !nextMonth) {
      return;
    }

    setYear(nextYear);
    setMonth(nextMonth);
  }

  return (
    <div className="content-grid">
      <section className="panel-card full-span">
        <div className="panel-card-header">
          <div>
            <div className="section-eyebrow">Aylik planlama</div>
            <h3>Aylik Yemek Takvimi</h3>
            <p className="panel-copy compact-copy">
              Kahvalti, ogle yemegi, ara ogun ve alerjen notlarini gunluk girerek veli mobil akisini besleyebilirsin.
            </p>
          </div>
          <div className="header-actions stack-on-mobile">
            <button type="button" className="primary-button" onClick={() => void handleSave()} disabled={saving || loading}>
              {saving ? 'Kaydediliyor...' : 'Takvimi Kaydet'}
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
            <span>Sinif</span>
            <select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}>
              <option value="all">Tum okul</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <div className="field">
            <span>Kapsam</span>
            <div className="field-hint">
              {selectedClass ? `${selectedClass.name} sinifi icin plan duzenleniyor.` : 'Sinif secilmezse okul geneli plan duzenlenir.'}
            </div>
          </div>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}
        {success ? <div className="success-banner">{success}</div> : null}

        <div className="table-shell">
          <table className="data-table meal-plan-table">
            <thead>
              <tr>
                <th>Gun</th>
                <th>Kahvalti</th>
                <th>Ogle Yemegi</th>
                <th>Ara Ogun</th>
                <th>Alerjen</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.day}>
                  <td>{row.day}</td>
                  <td>
                    <input
                      value={row.breakfast}
                      onChange={(event) => updateRow(row.day, 'breakfast', event.target.value)}
                      placeholder="Ornek: Peynir, zeytin"
                    />
                  </td>
                  <td>
                    <input
                      value={row.lunch}
                      onChange={(event) => updateRow(row.day, 'lunch', event.target.value)}
                      placeholder="Ornek: Corba, pilav"
                    />
                  </td>
                  <td>
                    <input
                      value={row.snack}
                      onChange={(event) => updateRow(row.day, 'snack', event.target.value)}
                      placeholder="Ornek: Meyve"
                    />
                  </td>
                  <td>
                    <input
                      value={row.allergens}
                      onChange={(event) => updateRow(row.day, 'allergens', event.target.value)}
                      placeholder="Ornek: Sut urunu"
                    />
                  </td>
                  <td>
                    <input
                      value={row.notes}
                      onChange={(event) => updateRow(row.day, 'notes', event.target.value)}
                      placeholder="Ek not"
                    />
                  </td>
                </tr>
              ))}
              {!rows.length && !loading ? (
                <tr>
                  <td colSpan={6} className="empty-cell">Bu ay icin plan satiri olusturulamadi.</td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={6} className="empty-cell">Aylik plan yukleniyor...</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
