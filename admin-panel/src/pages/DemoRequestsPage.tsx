import { useEffect, useState } from 'react';
import { api, type DemoRequestDto } from '../lib/api';

interface DemoRequestsPageProps {
  token: string;
}

const statusOptions = [
  { value: '', label: 'Tum durumlar' },
  { value: 'new', label: 'Yeni' },
  { value: 'contacted', label: 'Iletisime gecildi' },
  { value: 'qualified', label: 'Nitelikli' },
  { value: 'closed', label: 'Kapandi' },
];

export default function DemoRequestsPage({ token }: DemoRequestsPageProps) {
  const [items, setItems] = useState<DemoRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void loadPage();
  }, [token, statusFilter]);

  async function loadPage() {
    setLoading(true);
    setError(null);

    try {
      const response = await api.demoRequests(token, statusFilter || undefined, 1, 100);
      setItems(response.items);
    } catch (loadError) {
      setItems([]);
      setError(loadError instanceof Error ? loadError.message : 'Demo talepleri yuklenemedi.');
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(item: DemoRequestDto, status: string) {
    setUpdatingId(item.id);
    setError(null);
    setSuccess(null);

    try {
      await api.updateDemoStatus(token, item.id, status);
      setSuccess(`${item.schoolName} talebi guncellendi.`);
      await loadPage();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Durum guncellenemedi.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="content-grid">
      <section className="panel-card full-span">
        <div className="panel-card-header">
          <div>
            <div className="section-eyebrow">Canli veri</div>
            <h3>Demo Talepleri</h3>
            <p className="panel-copy compact-copy">
              Landing formundan gelen talepler platform admin tarafinda takip edilir ve duruma gore ilerletilir.
            </p>
          </div>
          <div className="header-actions stack-on-mobile">
            <span className="table-meta">{items.length} talep</span>
            <label className="field">
              <span>Durum filtresi</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {statusOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}
        {success ? <div className="success-banner">{success}</div> : null}

        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Yetkili</th>
                <th>Okul</th>
                <th>Telefon</th>
                <th>Ogrenci sayisi</th>
                <th>Sehir</th>
                <th>Durum</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.createdAt)}</td>
                  <td>{item.firstName} {item.lastName}</td>
                  <td>{item.schoolName}</td>
                  <td>{item.phone}</td>
                  <td>{item.studentCount || '-'}</td>
                  <td>{item.city || '-'}</td>
                  <td>{getStatusLabel(item.status)}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="mini-button"
                        disabled={updatingId === item.id}
                        onClick={() => void setStatus(item, 'contacted')}
                      >
                        Arandi
                      </button>
                      <button
                        type="button"
                        className="mini-button"
                        disabled={updatingId === item.id}
                        onClick={() => void setStatus(item, 'qualified')}
                      >
                        Nitelikli
                      </button>
                      <button
                        type="button"
                        className="mini-button danger-button"
                        disabled={updatingId === item.id}
                        onClick={() => void setStatus(item, 'closed')}
                      >
                        Kapat
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && !loading ? (
                <tr>
                  <td colSpan={8} className="empty-cell">Demo talebi bulunamadi.</td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={8} className="empty-cell">Demo talepleri yukleniyor...</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusLabel(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'new') {
    return 'Yeni';
  }
  if (normalized === 'contacted') {
    return 'Iletisime gecildi';
  }
  if (normalized === 'qualified') {
    return 'Nitelikli';
  }
  if (normalized === 'closed') {
    return 'Kapandi';
  }
  return status;
}
