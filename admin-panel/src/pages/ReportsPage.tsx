import { useEffect, useMemo, useState } from 'react';
import { api, type AdminStatsDto, type ClassDto, type ParentDto, type PlatformSchoolDto, type StudentDto, type TeacherDto } from '../lib/api';

interface ReportsPageProps {
  mode: 'platform' | 'school';
  token: string;
}

const EMPTY_STATS: AdminStatsDto = {
  schoolName: 'Okul',
  classCount: 0,
  teacherCount: 0,
  studentCount: 0,
  parentCount: 0,
};

export default function ReportsPage({ mode, token }: ReportsPageProps) {
  const [platformSchools, setPlatformSchools] = useState<PlatformSchoolDto[]>([]);
  const [schoolStats, setSchoolStats] = useState<AdminStatsDto>(EMPTY_STATS);
  const [schoolClasses, setSchoolClasses] = useState<ClassDto[]>([]);
  const [schoolTeachers, setSchoolTeachers] = useState<TeacherDto[]>([]);
  const [schoolStudents, setSchoolStudents] = useState<StudentDto[]>([]);
  const [schoolParents, setSchoolParents] = useState<ParentDto[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (mode === 'platform') {
          const schools = await api.platformSchools(token);
          if (!cancelled) {
            setPlatformSchools(schools);
          }
          return;
        }

        const [stats, classes, teachers, students, parents] = await Promise.all([
          api.stats(token),
          api.classes(token),
          api.teachers(token),
          api.students(token),
          api.parents(token),
        ]);

        if (!cancelled) {
          setSchoolStats(stats);
          setSchoolClasses(classes);
          setSchoolTeachers(teachers);
          setSchoolStudents(students);
          setSchoolParents(parents);
        }
      } catch {
        if (!cancelled) {
          setPlatformSchools([]);
          setSchoolClasses([]);
          setSchoolTeachers([]);
          setSchoolStudents([]);
          setSchoolParents([]);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [mode, token]);

  const platformSummary = useMemo(() => {
    const planBuckets = platformSchools.reduce<Record<string, number>>((acc, school) => {
      acc[school.plan] = (acc[school.plan] ?? 0) + 1;
      return acc;
    }, {});

    return {
      totalSchools: platformSchools.length,
      activeSchools: platformSchools.filter((school) => school.isActive).length,
      totalStudents: platformSchools.reduce((sum, school) => sum + school.studentCount, 0),
      totalParents: platformSchools.reduce((sum, school) => sum + school.parentCount, 0),
      topSchools: [...platformSchools].sort((a, b) => b.studentCount - a.studentCount).slice(0, 5),
      planBuckets,
    };
  }, [platformSchools]);

  const schoolSummary = useMemo(() => {
    const classesWithoutTeacher = schoolClasses.filter((item) => !item.teacherName).length;
    const linkedParents = schoolParents.filter((parent) => parent.students.length > 0).length;
    const topClass = [...schoolClasses].sort((a, b) => b.studentCount - a.studentCount)[0];
    const studentsWithAllergies = schoolStudents.filter((student) => !!student.allergies?.trim());
    const studentsWithMedicationNotes = schoolStudents.filter((student) => !!student.medicationNotes?.trim());
    const studentsWithHealthNotes = schoolStudents.filter((student) => !!student.healthNotes?.trim());
    const studentsMissingPhoto = schoolStudents.filter((student) => !student.avatarUrl);
    const studentsMissingParents = schoolStudents.filter((student) => !student.parents?.length);
    const studentsMissingBirthDate = schoolStudents.filter((student) => !student.birthDate);
    const studentsMissingGender = schoolStudents.filter((student) => !student.gender);
    const studentsMissingHealthInfo = schoolStudents.filter((student) =>
      !student.allergies?.trim() &&
      !student.medicationNotes?.trim() &&
      !student.healthNotes?.trim(),
    );

    return {
      classesWithoutTeacher,
      linkedParents,
      topClass,
      inactiveTeachers: schoolTeachers.filter((teacher) => teacher.isActive === false).length,
      studentsWithAllergies,
      studentsWithMedicationNotes,
      studentsWithHealthNotes,
      studentsMissingPhoto,
      studentsMissingParents,
      studentsMissingBirthDate,
      studentsMissingGender,
      studentsMissingHealthInfo,
    };
  }, [schoolClasses, schoolParents, schoolTeachers, schoolStudents]);

  if (mode === 'platform') {
    return (
      <div className="content-grid">
        <section className="panel-card">
          <div className="panel-card-header">
            <div>
              <div className="section-eyebrow">Canli rapor</div>
              <h3>Platform ozetleri</h3>
            </div>
          </div>
          <div className="stats-grid inline-stats">
            <article className="metric-card">
              <span>Toplam okul</span>
              <strong>{platformSummary.totalSchools}</strong>
            </article>
            <article className="metric-card">
              <span>Aktif okul</span>
              <strong>{platformSummary.activeSchools}</strong>
            </article>
            <article className="metric-card">
              <span>Toplam ogrenci</span>
              <strong>{platformSummary.totalStudents}</strong>
            </article>
            <article className="metric-card">
              <span>Toplam veli</span>
              <strong>{platformSummary.totalParents}</strong>
            </article>
          </div>
        </section>

        <section className="panel-card">
          <div className="panel-card-header">
            <div>
              <div className="section-eyebrow">Canli dagilim</div>
              <h3>Plan bazli okul sayisi</h3>
            </div>
          </div>
          <div className="insight-list">
            {Object.entries(platformSummary.planBuckets).map(([plan, count], index) => (
              <div key={plan} className="insight-item">
                <span>{index + 1 < 10 ? `0${index + 1}` : index + 1}</span>
                <div>
                  <strong>{plan}</strong>
                  <p>Bu planda {count} okul bulunuyor.</p>
                </div>
              </div>
            ))}
            {!Object.keys(platformSummary.planBuckets).length ? (
              <p className="panel-copy">Plan dagilimi icin okul verisi bulunamadi.</p>
            ) : null}
          </div>
        </section>

        <section className="panel-card full-span">
          <div className="panel-card-header">
            <div>
              <div className="section-eyebrow">Canli siralama</div>
              <h3>Ogrenci sayisina gore one cikan okullar</h3>
            </div>
          </div>
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Okul</th>
                  <th>Plan</th>
                  <th>Ogrenci</th>
                  <th>Ogretmen</th>
                  <th>Veli</th>
                </tr>
              </thead>
              <tbody>
                {platformSummary.topSchools.map((school) => (
                  <tr key={school.id}>
                    <td>{school.name}</td>
                    <td>{school.plan}</td>
                    <td>{school.studentCount}</td>
                    <td>{school.teacherCount}</td>
                    <td>{school.parentCount}</td>
                  </tr>
                ))}
                {!platformSummary.topSchools.length ? (
                  <tr>
                    <td colSpan={5} className="empty-cell">Rapor uretmek icin okul verisi bulunamadi.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="content-grid">
      <section className="panel-card">
        <div className="panel-card-header">
          <div>
            <div className="section-eyebrow">Canli rapor</div>
            <h3>{schoolStats.schoolName} ozeti</h3>
          </div>
        </div>
        <div className="stats-grid inline-stats">
          <article className="metric-card">
            <span>Sinif</span>
            <strong>{schoolStats.classCount}</strong>
          </article>
          <article className="metric-card">
            <span>Ogretmen</span>
            <strong>{schoolStats.teacherCount}</strong>
          </article>
          <article className="metric-card">
            <span>Ogrenci</span>
            <strong>{schoolStats.studentCount}</strong>
          </article>
          <article className="metric-card">
            <span>Veli</span>
            <strong>{schoolStats.parentCount}</strong>
          </article>
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-card-header">
          <div>
            <div className="section-eyebrow">Saglik takibi</div>
            <h3>Saglik bloklari</h3>
          </div>
        </div>
        <div className="insight-list">
          <div className="insight-item">
            <span>01</span>
            <div>
              <strong>Alerji bilgisi olan ogrenciler</strong>
              <p>{schoolSummary.studentsWithAllergies.length} ogrencide metin olarak alerji bilgisi kayitli.</p>
            </div>
          </div>
          <div className="insight-item">
            <span>02</span>
            <div>
              <strong>Ilac bilgisi tutulan ogrenciler</strong>
              <p>{schoolSummary.studentsWithMedicationNotes.length} ogrencide ilac veya doz notu bulunuyor.</p>
            </div>
          </div>
          <div className="insight-item">
            <span>03</span>
            <div>
              <strong>Saglik notu olan ogrenciler</strong>
              <p>{schoolSummary.studentsWithHealthNotes.length} ogrencide okulun dikkat etmesi gereken saglik notu var.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-card-header">
          <div>
            <div className="section-eyebrow">Eksik kayitlar</div>
            <h3>Takip listesi</h3>
          </div>
        </div>
        <div className="insight-list">
          <div className="insight-item">
            <span>01</span>
            <div>
              <strong>Fotografi eksik ogrenciler</strong>
              <p>{schoolSummary.studentsMissingPhoto.length} ogrencinin fotografi alani bos.</p>
            </div>
          </div>
          <div className="insight-item">
            <span>02</span>
            <div>
              <strong>Velisi baglanmamis ogrenciler</strong>
              <p>{schoolSummary.studentsMissingParents.length} ogrencide veli baglantisi eksik.</p>
            </div>
          </div>
          <div className="insight-item">
            <span>03</span>
            <div>
              <strong>Saglik profili bos ogrenciler</strong>
              <p>{schoolSummary.studentsMissingHealthInfo.length} ogrencide saglik verisi girilmemis.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel-card full-span">
        <div className="panel-card-header">
          <div>
            <div className="section-eyebrow">Canli dagilim</div>
            <h3>Sinif bazli ogrenci dagilimi</h3>
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
              {schoolClasses
                .slice()
                .sort((a, b) => b.studentCount - a.studentCount)
                .map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.teacherName || 'Atanmadi'}</td>
                    <td>{item.studentCount}</td>
                  </tr>
                ))}
              {!schoolClasses.length ? (
                <tr>
                  <td colSpan={3} className="empty-cell">Sinif dagilimi icin veri bulunamadi.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {schoolSummary.topClass ? (
          <p className="panel-copy compact-copy">
            En kalabalik sinif: {schoolSummary.topClass.name} ({schoolSummary.topClass.studentCount} ogrenci)
          </p>
        ) : null}
      </section>

      <section className="panel-card full-span">
        <div className="panel-card-header">
          <div>
            <div className="section-eyebrow">Saglik raporu</div>
            <h3>Ogrenci saglik listesi</h3>
          </div>
        </div>
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ogrenci</th>
                <th>Sinif</th>
                <th>Cinsiyet</th>
                <th>Alerjiler</th>
                <th>Ilac bilgisi</th>
                <th>Saglik notu</th>
              </tr>
            </thead>
            <tbody>
              {schoolStudents
                .filter((student) =>
                  !!student.allergies?.trim() ||
                  !!student.medicationNotes?.trim() ||
                  !!student.healthNotes?.trim(),
                )
                .map((student) => (
                  <tr key={student.id}>
                    <td>{student.fullName || student.name}</td>
                    <td>{student.className}</td>
                    <td>{student.gender || '-'}</td>
                    <td>{student.allergies?.trim() || '-'}</td>
                    <td>{student.medicationNotes?.trim() || '-'}</td>
                    <td>{student.healthNotes?.trim() || '-'}</td>
                  </tr>
                ))}
              {!schoolStudents.some((student) =>
                !!student.allergies?.trim() ||
                !!student.medicationNotes?.trim() ||
                !!student.healthNotes?.trim(),
              ) ? (
                <tr>
                  <td colSpan={6} className="empty-cell">Saglik verisi girilmis ogrenci bulunamadi.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel-card full-span">
        <div className="panel-card-header">
          <div>
            <div className="section-eyebrow">Eksik kayit raporu</div>
            <h3>Tamamlanmasi gereken ogrenci profilleri</h3>
          </div>
        </div>
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ogrenci</th>
                <th>Sinif</th>
                <th>Fotograf</th>
                <th>Veli</th>
                <th>Cinsiyet</th>
                <th>Dogum tarihi</th>
                <th>Saglik profili</th>
              </tr>
            </thead>
            <tbody>
              {schoolStudents
                .filter((student) =>
                  !student.avatarUrl ||
                  !student.parents?.length ||
                  !student.gender ||
                  !student.birthDate ||
                  (
                    !student.allergies?.trim() &&
                    !student.medicationNotes?.trim() &&
                    !student.healthNotes?.trim()
                  ),
                )
                .map((student) => (
                  <tr key={student.id}>
                    <td>{student.fullName || student.name}</td>
                    <td>{student.className}</td>
                    <td>{student.avatarUrl ? 'Tamam' : 'Eksik'}</td>
                    <td>{student.parents?.length ? 'Tamam' : 'Eksik'}</td>
                    <td>{student.gender || 'Eksik'}</td>
                    <td>{student.birthDate || 'Eksik'}</td>
                    <td>
                      {student.allergies?.trim() || student.medicationNotes?.trim() || student.healthNotes?.trim()
                        ? 'Tamam'
                        : 'Eksik'}
                    </td>
                  </tr>
                ))}
              {!schoolStudents.some((student) =>
                !student.avatarUrl ||
                !student.parents?.length ||
                !student.gender ||
                !student.birthDate ||
                (
                  !student.allergies?.trim() &&
                  !student.medicationNotes?.trim() &&
                  !student.healthNotes?.trim()
                ),
              ) ? (
                <tr>
                  <td colSpan={7} className="empty-cell">Eksik profil kaydi bulunamadi.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="panel-copy compact-copy">
          Ogretmen atamasi eksik sinif: {schoolSummary.classesWithoutTeacher} · Ogrenciye bagli veli kaydi olan toplam veli: {schoolSummary.linkedParents} · Cinsiyet bilgisi eksik ogrenci: {schoolSummary.studentsMissingGender.length} · Dogum tarihi eksik ogrenci: {schoolSummary.studentsMissingBirthDate.length}
        </p>
      </section>
    </div>
  );
}
