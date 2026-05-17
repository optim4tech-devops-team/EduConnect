import { useEffect, useMemo, useState } from 'react';
import { api, type AdminStatsDto, type ClassDto, type ExternalAnnouncementsResponseDto } from '../lib/api';

interface DashboardPageProps {
  token: string;
}

const EMPTY_STATS: AdminStatsDto = {
  schoolName: 'Okul',
  classCount: 0,
  teacherCount: 0,
  studentCount: 0,
  parentCount: 0,
};

export default function DashboardPage({ token }: DashboardPageProps) {
  const [stats, setStats] = useState<AdminStatsDto>(EMPTY_STATS);
  const [classes, setClasses] = useState<ClassDto[]>([]);
  const [externalAnnouncements, setExternalAnnouncements] = useState<ExternalAnnouncementsResponseDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [statsData, classesData, announcementsData] = await Promise.all([
          api.stats(token),
          api.classes(token),
          api.externalAnnouncements(token, 6),
        ]);
        if (!cancelled) {
          setStats(statsData);
          setClasses(classesData);
          setExternalAnnouncements(announcementsData);
        }
      } catch {
        if (!cancelled) {
          setStats(EMPTY_STATS);
          setClasses([]);
          setExternalAnnouncements(null);
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

  const highlights = useMemo(() => {
    const topClass = [...classes].sort((a, b) => b.studentCount - a.studentCount)[0];
    const classesWithoutTeacher = classes.filter((item) => !item.teacherName).length;
    const avgStudents = classes.length ? Math.round(stats.studentCount / classes.length) : 0;

    return {
      topClass,
      classesWithoutTeacher,
      avgStudents,
    };
  }, [classes, stats.studentCount]);

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <div className="hero-eyebrow">Okul genel gorunumu</div>
          <h2>{stats.schoolName}</h2>
          <p>Bu alan web admin paneli icin yeni sabit shell. Mobil akis korunurken web buradan buyuyecek.</p>
        </div>
        <div className="hero-badge">{loading ? 'Yukleniyor' : `${stats.classCount} sinif aktif`}</div>
      </section>

      <section className="stats-grid">
        <article className="metric-card">
          <span>Sınıflar</span>
          <strong>{stats.classCount}</strong>
        </article>
        <article className="metric-card">
          <span>Ogretmenler</span>
          <strong>{stats.teacherCount}</strong>
        </article>
        <article className="metric-card">
          <span>Ogrenciler</span>
          <strong>{stats.studentCount}</strong>
        </article>
        <article className="metric-card">
          <span>Veliler</span>
          <strong>{stats.parentCount}</strong>
        </article>
      </section>

      <section className="content-grid">
        <div className="panel-card">
          <div className="panel-card-header">
            <div>
              <div className="section-eyebrow">Sinif listesi</div>
              <h3>Guncel siniflar</h3>
            </div>
          </div>
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sinif</th>
                  <th>Ogretmen</th>
                  <th>Ogrenci</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.teacherName || 'Atanmadi'}</td>
                    <td>{item.studentCount}</td>
                  </tr>
                ))}
                {!classes.length ? (
                  <tr>
                    <td colSpan={3} className="empty-cell">Sinif verisi bulunamadi.</td>
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
              <h3>Okul gorunumu</h3>
            </div>
          </div>
          <div className="insight-list">
            <div className="insight-item">
              <span>01</span>
              <div>
                <strong>En kalabalik sinif</strong>
                <p>
                  {highlights.topClass
                    ? `${highlights.topClass.name} sinifinda ${highlights.topClass.studentCount} ogrenci kayitli.`
                    : 'Henuz ogrenci bagli bir sinif yok.'}
                </p>
              </div>
            </div>
            <div className="insight-item">
              <span>02</span>
              <div>
                <strong>Ogretmen atamasi bekleyen siniflar</strong>
                <p>{highlights.classesWithoutTeacher} sinifta ogretmen atamasi bekleniyor.</p>
              </div>
            </div>
            <div className="insight-item">
              <span>03</span>
              <div>
                <strong>Sinif basi ortalama ogrenci</strong>
                <p>Mevcut dagilimda sinif basina ortalama {highlights.avgStudents} ogrenci dusuyor.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="panel-card full-span">
          <div className="panel-card-header">
            <div>
              <div className="section-eyebrow">Dis duyurular</div>
              <h3>MEB duyurulari</h3>
              <p className="panel-copy compact-copy">
                Okul muduru icin resmi duyuru akisini panelde tek noktadan takip etmeyi kolaylastirir.
              </p>
            </div>
            <span className="soft-pill">
              {externalAnnouncements?.isFallback ? 'Gecici fallback' : 'Canli kaynak'}
            </span>
          </div>

          {externalAnnouncements?.items?.length ? (
            <div className="insight-list">
              {externalAnnouncements.items.map((item, index) => (
                <a
                  key={`${item.title}-${index}`}
                  className="insight-item"
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>{index + 1 < 10 ? `0${index + 1}` : index + 1}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>
                      {item.publishedAt
                        ? `${new Date(item.publishedAt).toLocaleDateString('tr-TR')} · ${item.source}`
                        : item.source}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="panel-copy">Duyuru akisi henuz bulunamadi.</p>
          )}
        </div>
      </section>
    </div>
  );
}
