import { useEffect, useState } from 'react';
import { api, type DemoRequestDto } from '../lib/api';

interface DemoRequestsPageProps {
  token: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Yeni',
  contacted: 'İletişime Geçildi',
  demo_done: 'Demo Yapıldı',
  converted: 'Müşteri Oldu',
  rejected: 'Reddedildi',
};

const STATUS_COLORS: Record<string, string> = {
  new: '#e3a04f',
  contacted: '#52b788',
  demo_done: '#2d6a4f',
  converted: '#204937',
  rejected: '#c0392b',
};

export default function DemoRequestsPage({ token }: DemoRequestsPageProps) {
  const [items, setItems] = useState<DemoRequestDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.demoRequests(token, statusFilter || undefined);
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token, statusFilter]);

  async function handleStatusChange(id: string, status: string) {
    setUpdating(id);
    try {
      await api.updateDemoStatus(token, id, status);
      setItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));
    } catch {
      /* ignore */
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="panel-card">
      <div className="panel-card-header">
        <div>
          <div className="section-eyebrow">Landing Page</div>
          <h3>Demo Talepleri</h3>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e0ddd8', fontSize: 14 }}
          >
            <option value="">Tüm Durumlar</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button
            className="action-btn action-btn--primary"
            onClick={() => void load()}
            disabled={loading}
          >
            Yenile
          </button>
        </div>
      </div>

      {loading ? (
        <div className="panel-copy" style={{ textAlign: 'center', padding: '40px 0' }}>Yükleniyor...</div>
      ) : items.length === 0 ? (
        <div className="panel-copy" style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
          Henüz demo talebi yok.
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 12, fontSize: 13, color: '#888' }}>
            Toplam <strong>{total}</strong> talep
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f0ede8' }}>
                  <th style={thStyle}>Ad Soyad</th>
                  <th style={thStyle}>Okul</th>
                  <th style={thStyle}>Telefon</th>
                  <th style={thStyle}>Öğrenci Sayısı</th>
                  <th style={thStyle}>Şehir</th>
                  <th style={thStyle}>Tarih</th>
                  <th style={thStyle}>Durum</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f5f3ef' }}>
                    <td style={tdStyle}>{item.firstName} {item.lastName}</td>
                    <td style={tdStyle}>{item.schoolName}</td>
                    <td style={tdStyle}>
                      <a href={`tel:${item.phone}`} style={{ color: '#204937', fontWeight: 600 }}>
                        {item.phone}
                      </a>
                    </td>
                    <td style={tdStyle}>{item.studentCount || '—'}</td>
                    <td style={tdStyle}>{item.city || '—'}</td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      {new Date(item.createdAt).toLocaleDateString('tr-TR', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td style={tdStyle}>
                      <select
                        value={item.status}
                        disabled={updating === item.id}
                        onChange={e => handleStatusChange(item.id, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          border: `1.5px solid ${STATUS_COLORS[item.status] ?? '#ccc'}`,
                          color: STATUS_COLORS[item.status] ?? '#333',
                          fontWeight: 600,
                          fontSize: 13,
                          background: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  fontWeight: 700,
  fontSize: 12,
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '12px',
  verticalAlign: 'middle',
};
