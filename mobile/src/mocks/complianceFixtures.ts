import type { ComplianceDocumentDto } from '@/api/client';
import { FIXTURE_SCHOOL_ID, FIXTURE_SCHOOL_NAME } from './schoolFixtures';

function buildParentKvkkContent(schoolName: string) {
  return `${schoolName} olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında öğrenci ve veli bilgilerinin güvenli şekilde işlenmesine özen gösteriyoruz.

Bu metin; veli ve öğrenciye ait kimlik, iletişim, kayıt, eğitim süreci, fotoğraf/video paylaşımı, sağlık ve acil durum, ödeme ve iletişim kayıtlarının hangi amaçlarla işlenebileceğini açıklamak için hazırlanmıştır.

Kişisel veriler; kayıt işlemlerinin yürütülmesi, eğitim-öğretim faaliyetlerinin planlanması, okul-veli iletişiminin sağlanması, güvenlik, yoklama ve servis/teslim süreçlerinin yürütülmesi, yasal yükümlülüklerin yerine getirilmesi ve okul uygulamalarının düzenli şekilde sunulabilmesi amaçlarıyla işlenebilir.

Veriler; ilgili mevzuat izin verdiği ölçüde kamu kurumları, muhasebe/finans paydaşları, bilgi teknolojileri hizmet sağlayıcıları ve okulun hizmet süreçlerine destek olan yetkili iş ortakları ile sınırlı olarak paylaşılabilir.

Verileriniz; başvuru formları, okul yönetim sistemi, mobil uygulama, telefon görüşmeleri, e-posta, kamera kayıtları ve okul içinde tutulan fiziki belgeler aracılığıyla toplanabilir.

KVKK kapsamında; kişisel verinizin işlenip işlenmediğini öğrenme, eksik veya yanlış işlenmiş verinin düzeltilmesini isteme, gerekli şartlar oluşursa silinmesini veya yok edilmesini talep etme ve veri işleme sürecine ilişkin bilgi isteme haklarına sahipsiniz.

Bu metin okulun veli ve öğrenci aydınlatma yükümlülüğünü yerine getirmek için sunulmaktadır. Güncel iletişim ve başvuru kanalları okul yönetimi tarafından paylaşılır.`;
}

function buildTeacherKvkkContent(schoolName: string) {
  return `${schoolName} olarak, öğretmen ve eğitim personeline ait kişisel verilerin korunmasına ilişkin yükümlülüklerimizi 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında yerine getiriyoruz.

Bu metin; öğretmenlere ait kimlik, iletişim, özlük, görev, bordro, performans, eğitim, kamera kaydı, okul sistem giriş kayıtları ve mesleki süreçlere ilişkin verilerin hangi kapsamda işlenebileceğini açıklamak amacıyla hazırlanmıştır.

Kişisel veriler; insan kaynakları süreçlerinin yürütülmesi, sözleşme ve özlük dosyası takibi, eğitim-öğretim faaliyetlerinin planlanması, okul içi güvenlik ve operasyon süreçlerinin sürdürülmesi, mevzuattan doğan yükümlülüklerin yerine getirilmesi ve bilgi sistemlerinin güvenli şekilde yönetilmesi amaçlarıyla işlenebilir.

Veriler; ilgili kamu kurumları, mali müşavirlik ve insan kaynakları hizmetleri, bilgi teknolojileri tedarikçileri ve mevzuat kapsamında destek veren yetkili iş ortakları ile sınırlı olarak paylaşılabilir.

Verileriniz; işe alım süreci, personel dosyaları, okul bilgi sistemleri, mobil uygulama, e-posta, kamera kayıtları ve fiziki belgeler üzerinden toplanabilir.

KVKK kapsamında; verinizin işlenmesine ilişkin bilgi alma, düzeltme, güncelleme, belirli şartlarda silme/yok etme ve itiraz haklarına sahipsiniz.

Bu metin öğretmen/personel aydınlatma yükümlülüğü kapsamında sunulmaktadır ve okul tarafından güncellenebilir.`;
}

export const FIXTURE_COMPLIANCE_DOCUMENTS: ComplianceDocumentDto[] = [
  {
    id: 'fixture-kvkk-parent-v1',
    schoolId: FIXTURE_SCHOOL_ID,
    kind: 'kvkk',
    audience: 'parent',
    title: `${FIXTURE_SCHOOL_NAME} Veli ve Öğrenci KVKK Aydınlatma Metni`,
    content: buildParentKvkkContent(FIXTURE_SCHOOL_NAME),
    version: 1,
    isRequired: true,
    requireOnLogin: true,
    isActive: true,
    createdAt: new Date('2026-04-07T09:00:00Z').toISOString(),
    publishedAt: new Date('2026-04-07T09:00:00Z').toISOString(),
    createdById: 'fixture-school-admin',
    createdByName: 'Okul Yönetimi',
    acceptedCount: 0,
  },
  {
    id: 'fixture-kvkk-teacher-v1',
    schoolId: FIXTURE_SCHOOL_ID,
    kind: 'kvkk',
    audience: 'teacher',
    title: `${FIXTURE_SCHOOL_NAME} Öğretmen KVKK Aydınlatma Metni`,
    content: buildTeacherKvkkContent(FIXTURE_SCHOOL_NAME),
    version: 1,
    isRequired: true,
    requireOnLogin: true,
    isActive: true,
    createdAt: new Date('2026-04-07T09:05:00Z').toISOString(),
    publishedAt: new Date('2026-04-07T09:05:00Z').toISOString(),
    createdById: 'fixture-school-admin',
    createdByName: 'Okul Yönetimi',
    acceptedCount: 0,
  },
];
