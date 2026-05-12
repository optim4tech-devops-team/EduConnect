# ECC Skill Adoption Roadmap

Bu dokuman, `everything-claude-code (ECC)` skill havuzunu EduConnect kod tabanina gore filtrelemek, hangi skill'lerin gercekten gerekli oldugunu secmek ve bunu fazli bir uygulama planina donusturmek icin hazirlandi.

Amac:

- Tum skill'leri ayni anda kullanmak yerine projeye uygun cekirdek bir set belirlemek
- Backend, web admin, mobile, landing ve deployment taraflarini ayni kalite cizgisine almak
- Yeni moduller acilirken hangi skill ile ilerleyecegimizi tekrar tekrar tartismamak

## 1. Repo Yuzeyi

Bu repo tek bir uygulama degil, birden fazla urun yuzeyini birlikte tasiyan bir yapi:

- `backend/`
  - `ASP.NET Core + EF Core + PostgreSQL + Hangfire + SignalR`
  - Ana domain, auth, okul/sinif/ogrenci/veli, raporlar, duyurular, mesajlar
- `admin-panel/`
  - `React 19 + TypeScript + Vite`
  - Yeni web admin paneli
  - Platform admin ve okul yoneticisi akislarinin asil hedef yuzeyi
- `mobile/`
  - `Expo + React Native + Expo Router`
  - Ogretmen, veli, yonetici ve paylasilan mobil akislar
- `landing/`
  - Statik tanitim/marketing sayfasi
- `qa-suite/`
  - Lokal QA yardimcilari ve web servisleme scriptleri
- `docker-compose.yml`, `helm/`, `k8s/`, `api-gateway/`
  - Lokal calisma, container, deploy ve ortama cikis katmani

Bu nedenle tek bir skill ile tum projeyi yonetmek yerine, katman bazli skill paketi belirlemek gerekiyor.

## 2. Cekirdek Skill Seti

Asagidaki skill'ler bu repo icin cekirdek kabul edilmeli. Bunlar olmadan buyuk is acmak kodu ilerletir ama sistemi olgunlastirmaz.

### Zorunlu cekirdek

- `codebase-onboarding`
  - Repo haritasi, giris noktalari ve kurallar icin
- `coding-standards`
  - Ortak okunabilirlik ve tutarlilik zemini icin
- `verification-loop`
  - Her anlamli degisiklikten sonra build/test/dogrulama icin
- `architecture-decision-records`
  - Ozellikle `mobile web` ve `admin-panel` ayrimi gibi kararlarin kaybolmamasi icin

### Yakin zorunlu

- `repo-scan`
  - Monorepo icindeki artik, tekrarli ve gecis surecindeki dosyalari temizlemek icin
- `ai-regression-testing`
  - AI ile hizli degisen endpoint ve UI akislarinda regressions kacirmamak icin
- `research-ops`
  - MEB duyurulari, rakip urun UX'i, yemek takvimi ve veli bildirim kurgulari gibi guncel arastirmalar icin

## 3. Katman Bazli Skill Haritasi

### Backend

Kullanim alani:

- `backend/EduLink.Api`
- `backend/EduLink.Application`
- `backend/EduLink.Infrastructure`

Oncelikli skill'ler:

- `dotnet-patterns`
- `api-design`
- `csharp-testing`
- `database-migrations`
- `error-handling`
- `security-review`
- `ai-regression-testing`

Bu skill'ler neden gerekli:

- `dotnet-patterns`
  - Controller, service, DTO, DI ve async akislarini temiz tutmak icin
- `api-design`
  - Web admin, mobile ve ileride public entegrasyonlar ayni kontrati kullansin diye
- `csharp-testing`
  - Ogrenci profili, meal plan, calendar event, rapor endpointleri icin unit + integration test katmani kurmak icin
- `database-migrations`
  - JSON fallback'ten ayrik tablo/kolon modeline gecerken guvenli migration yapmak icin
- `error-handling`
  - Kullaniciya anlasilir hata, loglara zengin baglam birakmak icin
- `security-review`
  - Auth, upload, import, school scoping ve rol kontrollerini sertlestirmek icin
- `ai-regression-testing`
  - AI ile hizli yazilan endpointlerde ayni bug'in geri donmesini engellemek icin

### Web Admin

Kullanim alani:

- `admin-panel/`

Oncelikli skill'ler:

- `frontend-patterns`
- `vite-patterns`
- `design-system`
- `accessibility`
- `browser-qa`
- `e2e-testing`
- `error-handling`

Bu skill'ler neden gerekli:

- `frontend-patterns`
  - Sayfa kompozisyonu, form state'i, veri yukleme ve tablo akislarini duzgun kurmak icin
- `vite-patterns`
  - Proxy, build, env ve local publish akislarini stabil tutmak icin
- `design-system`
  - Platform admin ve okul yoneticisi shell'inin ayni urun diliyle ilerlemesi icin
- `accessibility`
  - Table, dialog, input, sidebar ve route state ekranlarinin temel WCAG uyumunu saglamak icin
- `browser-qa`
  - 4174 uzerindeki akislari tarayici icinden gercek kullanici gibi test etmek icin
- `e2e-testing`
  - Login, CRUD, import, rapor ve logout akislarini kalici test paketine donusturmek icin
- `error-handling`
  - Import, upload ve bos durum ekranlarinda net geri bildirim saglamak icin

### Mobile

Kullanim alani:

- `mobile/`

Oncelikli skill'ler:

- `frontend-patterns`
- `accessibility`
- `ai-regression-testing`
- `design-system`

Not:

ECC icinde dogrudan `Expo/React Native` odakli bir skill yok. Bu nedenle mobile icin birebir framework skill'i yerine:

- `frontend-patterns`
- repo icindeki mevcut navigation/store/pragmatic pattern'ler
- ve bizim mevcut mobil kurallarimiz

birlikte kullanilmali.

Bu skill'ler neden gerekli:

- `frontend-patterns`
  - Ekran durumlari, veri yukleme ve form akislarini duzene sokmak icin
- `accessibility`
  - Veli ve ogretmen akislarinda okunabilirlik ve erisilebilirlik icin
- `ai-regression-testing`
  - Backend kontrat degistikce mobile ekranlarin sessizce kirilmamasi icin
- `design-system`
  - Login, profile, parent dashboard, meal plan ve activity ekranlarinda tutarlilik icin

### Landing

Kullanim alani:

- `landing/`

Oncelikli skill'ler:

- `design-system`
- `brand-voice`
- `accessibility`
- `browser-qa`
- `motion-ui`

Bu skill'ler neden gerekli:

- `design-system`
  - Landing ile web admin/login renk ve tipografi dilini hizalamak icin
- `brand-voice`
  - Metin tonu ve urun anlatimi tek cizgide kalsin diye
- `accessibility`
  - Buton, contrast, heading hiyerarsisi ve keyboard ulasilabilirligi icin
- `browser-qa`
  - Responsive landing smoke testleri icin
- `motion-ui`
  - Landing tarafinda anlamsiz degil, anlamli hareket kullanmak icin

### DevOps ve Release

Kullanim alani:

- `docker-compose.yml`
- `qa-suite/`
- `helm/`
- `k8s/`
- `api-gateway/`

Oncelikli skill'ler:

- `docker-patterns`
- `deployment-patterns`
- `production-audit`
- `canary-watch`

Bu skill'ler neden gerekli:

- `docker-patterns`
  - Lokal servisleri her seferinde el yordamiyla degil, guvenli compose kaliplariyla yonetmek icin
- `deployment-patterns`
  - Lokal build, staging publish ve production rollout farkini netlestirmek icin
- `production-audit`
  - Health check, config, secret, image ve rollback okumasi icin
- `canary-watch`
  - Ileride kademeli rollout / izleme gerekiyorsa devreye almak icin

### Product ve Arastirma

Kullanim alani:

- `ideas/`
- `docs/`
- yeni modul kararlarimiz

Oncelikli skill'ler:

- `product-lens`
- `product-capability`
- `research-ops`
- `architecture-decision-records`

Bu skill'ler neden gerekli:

- `product-lens`
  - Yarin yapacagimiz modulu once gercekten neden yaptigimizi sinamak icin
- `product-capability`
  - Yemek takvimi, etkinlik bildirimi, veliye push gibi modulleri implementasyon-ready hale getirmek icin
- `research-ops`
  - Rakip urunler, MEB duyurulari, aylik takvim UX'i gibi konularda kanit toplamak icin
- `architecture-decision-records`
  - Urun karari ile teknik karar birbirine karismasin diye

## 4. Bu Repo Icin Kullanilmamasi Gereken veya Simdilik Gerekli Olmayan Skill'ler

Bazi ECC skill'leri guclu olsa da bu repo icin simdilik ana lane degil:

- `dart-flutter-patterns`
  - Mobile tarafimiz Flutter degil, Expo/React Native
- `android-clean-architecture`
  - Native Android codebase'i tasimiyoruz
- `angular-developer`, `nextjs-turbopack`, `django-*`, `springboot-*`, `laravel-*`
  - Mevcut stack ile iliskisiz
- `agent-*` ailesinin buyuk bolumu
  - Simdilik urun ve kod akisi daha oncelikli

Bu ayrim onemli; fazla skill kullanmak odagi dagitir.

## 5. Fazli Uygulama Plani

### Faz 0 - Temel dogrulama, dokumantasyon ve milestone disiplin

Hedef:

- Repo icin sabit bir calisma standardi oturtmak

Kullanilacak skill'ler:

- `codebase-onboarding`
- `coding-standards`
- `architecture-decision-records`
- `verification-loop`

Cikti:

- Repo onboarding dokumani
- ADR listesi
- Standart degisiklik checklist'i
- Her buyuk adim sonunda pushlenecek milestone mantigi
- `Landing -> Web Admin -> Mobile` oncelik sirasinin repo karari haline gelmesi

### Faz 1 - Landing foundation ve marka zemini

Hedef:

- Landing'i urunun vitrini olacak seviyeye getirmek
- Login ve web admin ile ortak tasarim dilini burada sabitlemek

Kullanilacak skill'ler:

- `design-system`
- `brand-voice`
- `accessibility`
- `browser-qa`
- `motion-ui`

Oncelikli konular:

- hero ve bilgi mimarisi
- tasarim tokenlari
- logo, tipografi ve renk sistemi
- responsive polish
- landing metin dili
- local build ve publish standardi

### Faz 2 - Landing deploy hatti ve production hazirligi

Hedef:

- Landing'i sadece statik dosya olarak degil, k8s'e deploy edilen bir web yuzeyi haline getirmek

Kullanilacak skill'ler:

- `docker-patterns`
- `deployment-patterns`
- `production-audit`
- `browser-qa`

Oncelikli konular:

- landing Docker image
- landing icin GitHub Actions
- image build/tag/push stratejisi
- k8s manifest veya helm baglantisi
- smoke test
- rollback notlari

### Faz 3 - Web admin foundation ve shell olgunlastirma

Hedef:

- `admin-panel`i asil operasyon paneli haline getirmek
- Platform admin ve okul yoneticisi akislarini net shell altinda toplamak

Kullanilacak skill'ler:

- `frontend-patterns`
- `vite-patterns`
- `design-system`
- `accessibility`
- `browser-qa`
- `e2e-testing`

Oncelikli konular:

- dashboard akis mantigi
- platform admin menu yapisi
- okul yoneticisi menu yapisi
- responsive admin shell
- empty state / access denied / not found birligi
- login ve route guard kalitesi

### Faz 4 - Web admin operasyon modulleri ve backend destek isi

Hedef:

- Web admin tarafinda okulun gercekten veri girip yonetebildigi tum cekirdek modulleri kapatmak
- Backend gelisimlerini bu faza bagli alt is paketi olarak ilerletmek

Kullanilacak skill'ler:

- `dotnet-patterns`
- `api-design`
- `csharp-testing`
- `database-migrations`
- `error-handling`
- `security-review`
- `frontend-patterns`
- `design-system`
- `browser-qa`
- `ai-regression-testing`

Oncelikli konular:

- ogrenci profili
- raporlar
- sinif / ogretmen / ogrenci / veli CRUD
- upload / import
- aylik yemek takvimi
- aylik program ve etkinlik girisi
- MEB duyurulari gibi yonetici panel veri bloklari
- mobile'in tukecegi backend kontratlarinin netlesmesi

### Faz 5 - Web admin deploy hatti ve k8s cikisi

Hedef:

- Tum web yuzeylerini k8s'e deploy edilebilir standarda getirmek
- Ozellikle `landing` ve `admin-panel` icin GitHub Actions hattini kurmak

Kullanilacak skill'ler:

- `docker-patterns`
- `deployment-patterns`
- `production-audit`
- `canary-watch`
- `verification-loop`

Oncelikli konular:

- `landing` icin GitHub Actions workflow
- `admin-panel` icin GitHub Actions workflow
- gerekiyorsa legacy web yuzeyleri icin ayri publish karari
- image registry stratejisi
- namespace / ingress / service standardi
- deploy sonrasi smoke test
- rollout ve rollback notlari

### Faz 6 - Mobile tuketim ve uygulama akislarinin olgunlastirilmasi

Hedef:

- Web admin'de girilen verinin mobile tarafinda anlamli sekilde tuketilmesi
- Mobile'i urunun son tuketim katmani olarak toparlamak

Kullanilacak skill'ler:

- `frontend-patterns`
- `design-system`
- `accessibility`
- `ai-regression-testing`
- `browser-qa`

Oncelikli konular:

- veliye yemek takvimi gosterimi
- ertesi gun etkinlik push kurgusu
- parent dashboard veri onceligi
- okul yoneticisi tarafinda girilen verilerin mobile map'i
- ogretmen akislarinin backend ile son kontrat dogrulamasi
- login / auth / notification / route kalitesi

## 6. Simdiki Oncelik Sirasi

Bu repo icin hemen aktif kullanilmasi gereken skill kombinasyonu su olmali:

1. `verification-loop`
   - Her anlamli feature turundan sonra
2. `design-system` + `brand-voice` + `browser-qa`
   - Landing fazi icin
3. `frontend-patterns` + `vite-patterns` + `browser-qa`
   - Web admin fazi icin
4. `dotnet-patterns` + `api-design` + `csharp-testing`
   - Web admin'i destekleyen backend kontratlari icin
5. `deployment-patterns` + `docker-patterns`
   - Landing ve web admin'in k8s deploy hatti icin
6. `research-ops` + `product-capability`
   - Yemek takvimi, etkinlik ve bildirim modulleri icin

## 7. Milestone Push Stratejisi

Bu noktadan sonra ilerleyis su mantikla pushlenmeli:

1. `M0`
   - roadmap ve skill adoption baseline
2. `M1`
   - landing tasarim ve responsive toparlama
3. `M2`
   - landing GitHub Actions + k8s deploy hatti
4. `M3`
   - web admin shell ve auth akislari
5. `M4`
   - web admin cekirdek CRUD + raporlar
6. `M5`
   - web admin meal plan + activity modules
7. `M6`
   - web admin GitHub Actions + k8s deploy hatti
8. `M7`
   - mobile tuketim ve bildirim akislarinin ilk tam surumu

Milestone kurali:

- Her milestone kendi basina build alabiliyor olmali
- Mümkünse local smoke test ile dogrulanmali
- Push onceki milestone'u bozmayacak sekilde yapilmali
- Dokuman ve ADR guncellemesi milestone'a dahil olmali

## 8. Bu Dokumana Gore Bir Sonraki Isleyis

Bu dokumana gore artik yeni islerde asagidaki dili kullanmak daha dogru olur:

- `Landing fazini design-system + browser-qa ile ilerlet`
- `Bu endpoint'i api-design + dotnet-patterns ile ilerlet`
- `Bu ekrani frontend-patterns + design-system ile toparla`
- `Bu modulu product-capability ile once kontratlastir`
- `Bu teslim oncesi verification-loop yap`
- `Bu web deploy akisina deployment-patterns ve docker-patterns gozuyla bak`

Bu sayede her is sifirdan tanimlanmayacak; skill secimi de repo karari haline gelecek.
