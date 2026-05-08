import { useEffect, useMemo, useState } from 'react';
import { api, type PlatformSchoolDto } from '../lib/api';

interface PlatformDashboardPageProps {
  token: string;
}

export default function PlatformDashboardPage({ token }: PlatformDashboardPageProps) {
  const [schools, setSchools] = useState<PlatformSchoolDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await api.platformSchools(token);
        if (!cancelled) {
          setSchools(data);
        }
      } catch {
        if (!cancelled) {
          setSchools([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const metrics = useMemo(() => {
    return {
      totalSchools: schools.length,
      activeSchools: schools.filter((school) => school.isActive).length,
      totalStudents: schools.reduce((sum, school) => sum + school.studentCount, 0),
      totalTeachers: schools.reduce((sum, school) => sum + school.teacherCount, 0),
      schoolsWithoutAdmin: schools.filter((school) => !school.primaryAdminName).length,
    };
  }, [schools]);

  const topSchools = useMemo(
    () => [...schools].sort((a, b) => b.studentCount - a.studentCount).slice(0, 3),
    [schools],
  );

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <div className="hero-eyebrow">Platform genel gorunumu</div>
          <h2>Notio Platform</h2>
          <p>
            Bu alan platform admin icin ayrildi. Okullar, yoneticiler ve genel buyume
            takibi bu shell ustunden ilerleyecek.
          </p>
        </div>
        <div className="hero-badge">
          {loading ? 'Yukleniyor' : `${metrics.activeSchools} aktif okul`}
        </div>
      </section>

      <section className="stats-grid">
        <article className="metric-card">
          <span>Toplam okul</span>
          <strong>{metrics.totalSchools}</strong>
        </article>
        <article className="metric-card">
          <span>Aktif okul</span>
          <strong>{metrics.activeSchools}</strong>
        </article>
        <article className="metric-card">
          <span>Toplam ogrenci</span>
          <strong>{metrics.totalStudents}</strong>
        </article>
        <article className="metric-card">
          <span>Toplam ogretmen</span>
          <strong>{metrics.totalTeachers}</strong>
        </article>
      </section>

      <section className="content-grid">
        <div className="panel-card">
          <div className="panel-card-header">
            <div>
              <div className="section-eyebrow">Okul listesi</div>
              <h3>Son okullar</h3>
            </div>
          </div>
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Okul</th>
                  <th>Plan</th>
                  <th>Yonetici</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {schools.slice(0, 8).map((school) => (
                  <tr key={school.id}>
                    <td>{school.name}</td>
                    <td>{school.plan}</td>
                    <td>{school.primaryAdminName || '-'}</td>
                    <td>{school.isActive ? 'Aktif' : 'Pasif'}</td>
                  </tr>
                ))}
                {!schools.length ? (
                  <tr>
                    <td colSpan={4} className="empty-cell">Okul verisi bulunamadi.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-card-header">
            <div>
              <div className="section-eyebrow">Canli ozet</div>
              <h3>Platform takibi</h3>
            </div>
          </div>
          <div className="insight-list">
            <div className="insight-item">
              <span>01</span>
              <div>
                <strong>Yonetici atamasi eksik okullar</strong>
                <p>{metrics.schoolsWithoutAdmin} okulda birincil yonetici bilgisi eksik.</p>
              </div>
            </div>
            <div className="insight-item">
              <span>02</span>
              <div>
                <strong>En buyuk okul</strong>
                <p>
                  {topSchools[0]
                    ? `${topSchools[0].name} su an ${topSchools[0].studentCount} ogrenci ile one cikiyor.`
                    : 'Henuz okul verisi bulunmuyor.'}
                </p>
              </div>
            </div>
            <div className="insight-item">
              <span>03</span>
              <div>
                <strong>Ilk 3 okul</strong>
                <p>
                  {topSchools.length > 0
                    ? topSchools.map((school) => school.name).join(', ')
                    : 'Liste olusturmak icin okul verisi bekleniyor.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
