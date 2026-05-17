# Faz 1 Web Admin Kapanis Plani

Son guncelleme: 2026-05-17

Bu dokuman Faz 1 kapsaminda landing, platform admin, okul yoneticisi web paneli, API Gateway ve Kubernetes yayin akisinda kalan isleri netlestirmek icin tutulur. Faz 1 kapanmadan once hedef, platformun iki web rolunde de kullanilabilir hale gelmesi ve public yuzeylerin dogru sekilde deploy edilmesidir.

## 1. Faz 1 hedefi

Faz 1 tamamlandiginda su tablo gercek olmalidir:

- Landing sayfasi yayinda, demo talebi toplayabiliyor ve form dogrudan backend servisine degil API Gateway uzerinden gidiyor.
- Platform admin giris yapabiliyor, okul acabiliyor, okul yoneticisi atayabiliyor, demo taleplerini gorebiliyor ve temel platform raporlarini izleyebiliyor.
- Okul yoneticisi giris yapabiliyor, kendi okulunun sinif, ogretmen, ogrenci, veli ve rapor ekranlarini backend verisiyle kullanabiliyor.
- Backend servisleri public olarak sadece API Gateway arkasindan tuketiliyor; frontend tarafinda direkt backend servis adresi gorunmuyor.
- Landing, web admin, API Gateway ve notioedu-api icin GitHub Actions build, push ve Kubernetes rollout akisi calisiyor.
- Public domainler TLS sertifikasi ile calisiyor: `notioedu.com`, `www.notioedu.com`, `platform.notioedu.com`, `apigw.notioedu.com`.

## 2. Calisma ve commit prensibi

Faz 1 boyunca su prensip uygulanacak:

- Bir prompt, issue veya faz maddesi tamamlandiysa ve lokal testten gectiyse bekletmeden commit atilir.
- Commit sadece ilgili is paketinin dosyalarini icermelidir; yarim kalan baska degisiklikler ayni commit'e karistirilmaz.
- Commit sonrasi `master` push edilir ve ilgili GitHub Action sonucu kontrol edilir.
- Deploy edilen is icin en az bir canli dogrulama yapilir: `healthz`, login, ilgili ekran veya ilgili API endpoint.
- Bir is tamamlanmadiysa `WIP` olarak commitlenmez; ya tamamlanir ya da bu dokumanda "devam ediyor" durumuna alinir.
- Buyuk isler kucuk kapanabilir parcalara bolunur: ornek `demo-form-api`, `school-admin-password-flow`, `platform-demo-requests`, `admin-responsive-fix`.
- Commit mesaji kisa ve okunur olur: `feat(landing): submit demo requests through gateway`, `fix(admin): clarify school admin password flow`.
- Secret, kubeconfig, sifre, registry credential veya gecici token commitlenmez.

## 3. Mevcut durum ozeti

Tamamlanan ana parcala:

- Landing tasarimi Faz 1 seviyesine getirildi.
- Landing icin Docker image, registry push ve Kubernetes deploy workflow'u kuruldu.
- Platform web admin icin `platform.notioedu.com` yayini hazirlandi.
- API Gateway icin `apigw.notioedu.com` yayini hazirlandi.
- `notioedu-api`, `apigw`, `notio-web` deploy akisi GitHub Actions uzerinden calisir hale getirildi.
- Public TLS sertifika kapsami `notioedu.com`, `www`, `platform`, `apigw`, `k8s`, `registry` domainlerini kapsayacak sekilde toparlandi.
- Login hata mesajlarinda raw HTML / nginx 503 gostermeme duzeltmesi yapildi.

Bugun tamamlanan paketler:

- Landing demo formu API Gateway uzerinden `POST /api/demo-requests` gonderiyor.
- Demo talebi koruma katmani aktif: honeypot, gateway + backend rate limit, tekrar telefon kontrolu.
- Okul yoneticisi gecici sifre + ilk giriste zorunlu sifre degistirme akisi aktif.
- Platform okul CRUD + okul yoneticisi atama akisi gecici sifre donusu ile aktif.
- School admin panelinde aylik yemek takvimi ve etkinlik programi canli endpointlere baglandi.
- Raporlar ekraninda saglik + eksik kayit bloklarina ek olarak devamsizlik ve veli iletisim bloklari eklendi.
- Dashboard icin dis duyuru akisi eklendi: `GET /api/panel/external-announcements` (cache + fallback).

## 4. P0 kapanis maddeleri

Bu maddeler Faz 1 kapanisi icin blokerdir.

### 4.1 Landing demo talep akisi

Kapasite:

- Ziyaretci landing uzerinden demo talebi gonderebilir.
- Talep API Gateway uzerinden `POST /api/demo-requests` ile backend'e gider.
- Talep platform admin panelindeki `Demo Talepleri` ekraninda gorunur.

Kabul kriterleri:

- Landing formu basarili gonderimde kullaniciya net mesaj verir.
- Bos/zorunlu alanlarda frontend ve backend dogrulamasi vardir.
- Backend raw exception veya HTML hata dondurmez.
- 429 durumunda kullaniciya anlasilir "biraz sonra tekrar deneyin" mesaji verilir.
- Honeypot alani bot isteklerini sessizce yakalar.
- Ayni telefonla kisa surede tekrar kayit engellenir.
- CORS ve gateway route canli ortamda calisir.

Test:

- Local landing formu `http://127.0.0.1` uzerinden gateway'e kayit atar.
- Canli `https://notioedu.com` formu `https://apigw.notioedu.com/api/demo-requests` uzerinden kayit atar.
- Platform admin `Demo Talepleri` ekraninda yeni kaydi gorur.
- Tekrarlanan isteklerde rate limit davranisi dogrulanir.

### 4.2 Okul yoneticisi sifre ve ilk giris akisi

Kapasite:

- Platform admin okul eklerken veya okula yonetici atarken gecici sifre otomatik uretilir.
- Gecici sifre bir kez platform admin'e gosterilir.
- Kullanici ilk giriste sifresini degistirmeye yonlendirilir.

Mevcut teknik durum:

- Backend `MustChangePassword` alanini destekliyor.
- Backend `POST /api/auth/change-password` endpoint'ine sahip.
- UI tarafinda ilk giriste zorunlu sifre degistirme ekrani tamamlanmali.

Kabul kriterleri:

- Yeni okul yoneticisi icin gecici sifre platform admin ekraninda okunur sekilde gosterilir.
- Eski sifre, yonetici yeniden atandiginda gecersiz olur.
- Login response icindeki `mustChangePassword` web admin tarafinda yakalanir.
- Sifre degistirilmeden admin panel fonksiyonlarina gecilmez.
- Sifre degisince `MustChangePassword=false` olur ve normal panele yonlenir.
- SMS/e-posta basarisiz olsa bile platform admin gecici sifreyi gorebildigi icin akisi tamamlayabilir.

Test:

- Platform admin yeni okul ve okul yoneticisi olusturur.
- Uretilen gecici sifre ile okul yoneticisi login olur.
- Zorunlu sifre degistirme ekrani acilir.
- Yeni sifre ile tekrar login basarili olur.

### 4.3 Okul yoneticisi web panel smoke testi

Kapasite:

- Okul yoneticisi sadece kendi okul verisini gorur.
- Menu ve ekranlar backend verisiyle calisir.

Kabul kriterleri:

- Login basarili: `SchoolAdmin` rolu dogru route'a gider.
- Dashboard backend verisiyle dolar.
- Sinif ekle, duzenle, sil akisi calisir.
- Ogretmen ekle, duzenle, sil akisi calisir.
- Ogrenci ekle, duzenle, sil akisi calisir.
- Ogrenci fotografi opsiyonel olarak eklenebilir.
- Ogrenci alanlari net: cinsiyet, alerji, ilac bilgisi, saglik notu.
- Veli ekle ve ogrenciye bagla akisi calisir.
- Raporlarda saglik ve eksik kayit bloklari backend verisine gore guncellenir.
- Backend'e erisilemediginde uygulama bos gezdirmek yerine login'e yonlendirir.

Test:

- En az bir okul, bir okul yoneticisi, bir sinif, bir ogretmen, bir ogrenci ve bir veli ile tam smoke test.
- Desktop 1440px, laptop 1280px, tablet 768px, mobil 390px responsive kontrol.

### 4.4 Platform admin web panel smoke testi

Kapasite:

- Platform admin tum okul operasyonunu yonetebilir.
- Demo talepleri ve okul onboarding tek panelde izlenebilir.

Kabul kriterleri:

- Platform admin login basarili.
- Okul listeleme backend verisiyle calisir.
- Okul ekleme, duzenleme, silme calisir.
- Okul yoneticisi atama ve sifre gosterimi calisir.
- Demo talepleri listelenir ve durum guncellenir.
- Platform raporlari dummy olmadan backend verisiyle calisir.
- Platform admin ile okul yoneticisi menuleri rol bazli ayrisir.

Test:

- Yeni okul acilir.
- Okula yonetici atanir.
- O yonetici ile okul paneline girilir.
- Landing demo formundan gelen talep platform admin ekraninda gorulur.

### 4.5 API Gateway ve public servis guvenligi

Kapasite:

- Frontendler API'ye gateway uzerinden ulasir.
- Public endpointlerde temel saldiri azaltma katmani vardir.

Kabul kriterleri:

- `apigw.notioedu.com/healthz` 200 doner.
- `platform.notioedu.com` frontend API base olarak gateway kullanir.
- `notioedu-api` Kubernetes icinde service olarak kalir; frontend tarafinda direkt backend host kullanilmaz.
- Demo request endpointinde gateway rate limit aktiftir.
- Backend tarafinda ikinci katman rate limit aktiftir.
- Login ve auth endpointleri icin ham HTML hata UI'a tasinmaz.

Test:

- `curl https://apigw.notioedu.com/healthz`
- `curl https://apigw.notioedu.com/api/auth/login`
- `curl https://platform.notioedu.com/healthz`
- Browser login ve demo form testleri.

### 4.6 GitHub Actions ve Kubernetes rollout

Kapasite:

- Build, image push ve deploy manuel makineden degil GitHub Actions uzerinden calisir.

Kabul kriterleri:

- Landing workflow sadece `github-k8s-runner` runner label'i ile calisir.
- Web admin workflow sadece `github-k8s-runner` runner label'i ile calisir.
- Platform services workflow API ve gateway image'larini build edip registry'ye pushlar.
- `qa-faz1-web` workflow'u `QA_PLATFORM_ADMIN_EMAIL` ve `QA_PLATFORM_ADMIN_PASSWORD` secret'lari olmadan baslamaz.
- Kubernetes rollout action icinde yapilir.
- Action sonunda rollout status veya health check basarisizsa job fail olur.
- Registry credential ve kubeconfig secret olarak kullanilir.

Test:

- Landing workflow basarili.
- Web admin workflow basarili.
- Platform services workflow basarili.
- Certificate workflow basarili.
- `QA Faz 1 Web Screens` workflow basarili.
- Canli domainlerde TLS ve health check dogrulanir.

## 5. P1 Faz 1 guclendirme maddeleri

Bu maddeler Faz 1 kalitesini artirir. P0 kapanmadan once kritik kisimlari tamamlanmali, kalani Faz 1.1'e tasinabilir.

### 5.1 Responsive web admin duzeni

- Web admin mobil app gibi yayvan durmamali; desktop'ta panel mantiginda calismali.
- Header, sidebar/topbar, content ve footer/panel butunlugu korunmali.
- Modal veya drawer acildiginda kullanici onceki menuye donebilmeli.
- Formlar desktop'ta iki kolon, mobilde tek kolon dengeli calismali.

### 5.2 Raporlar

- Saglik raporu: alerji, ilac bilgisi, saglik notu olan ogrenciler.
- Eksik kayit raporu: fotograf, veli baglantisi, cinsiyet, saglik bilgisi eksik kayitlar.
- Devamsizlik raporu: backend veri modeli hazirsa okul ve sinif bazli ozet.
- Veli iletisim raporu: bagli veli sayisi, birincil iletisim, eksik telefon/e-posta.
- Durum (2026-05-17): tamamlandi. `admin-panel` rapor ekrani backend `attendance/summary` ve mevcut veli/ogrenci verileriyle bu bloklari canli hesapliyor.

### 5.3 Toplu ogrenci import

- Excel sablonu yeni kolonlarla guncel olmali.
- Kolonlar: ad, soyad, sinif, cinsiyet, dogum tarihi, alerji, ilac bilgisi, saglik notu, veli bilgileri.
- Fotograf zorunlu olmamali.
- Import sonucu basarili ve hatali satirlari net gostermeli.

### 5.4 Aylik yemek takvimi

- Okul yoneticisi ay secerek gun gun yemek girisi yapabilmeli.
- Kahvalti, ogle yemegi, ara ogun alanlari kolay girilebilir olmali.
- Bos gunler desteklenmeli.
- Mobil tarafta veliye okunabilir aylik takvim olarak servis edilecek veri kontrati net olmali.
- Durum (2026-05-17): `admin-panel` icinde `Yemek Takvimi` menusu eklendi ve `/api/meal-plans` + `/api/meal-plans/monthly` endpointleriyle canli baglanti kuruldu.

### 5.5 Aylik program ve etkinlik takvimi

- Okul yoneticisi etkinlik, gereken malzeme, kiyafet, hedef sinif ve tarih bilgisi girebilmeli.
- Mobil tarafta veliye "yarin etkinlik var" push'u atilabilecek veri yapisi hazirlanmali.
- Tekrarlayan etkinlik ve sinif bazli etkinlik ayrimi netlesmeli.
- Durum (2026-05-17): tamamlandi. `calendar-events` CRUD endpointleri ve school admin panel formu aktif.

### 5.6 Panel duyurulari

- MEB duyurulari panelde okul yoneticisine yardimci bir akis olarak gosterilebilir.
- Ilk adimda DB'ye kaydetmeden gateway/backend uzerinden okunabilir.
- Scrape/curl tabanli cozumde timeout, cache ve hata durumlari net olmali.
- Kaynak erisilemezse panel bozulmamali.
- Durum (2026-05-17): tamamlandi. `panel/external-announcements` endpointi timeout + cache + graceful fallback ile eklendi; school dashboard widget bu endpointi kullaniyor.

## 6. Faz 1 disinda kalacaklar

Bu maddeler Faz 1 kapandiktan sonra ele alinacak:

- Mobile uygulama rol ve endpoint uyarlamalari.
- Parent mobil deneyim ekranlari.
- Teacher mobil deneyim ekranlari.
- Push notification worker ve schedule otomasyonlarinin tamamlanmasi.
- Odeme / sanal POS modulu.
- Gelismis analitik, faturalama ve abonelik yonetimi.

## 7. Faz 1 kapanis kontrol listesi

Faz 1 kapandi demek icin su maddeler isaretlenmis olmali:

- [x] Landing demo formu API Gateway uzerinden kayit olusturuyor.
- [x] Demo talepleri platform admin panelinde gorunuyor.
- [x] Demo endpoint rate limit, honeypot ve tekrar telefon kontrolu ile korunuyor.
- [x] Platform admin okul CRUD ve yonetici atama akisini tamamliyor.
- [x] Okul yoneticisi gecici sifre ile girip sifre degistirebiliyor.
- [x] Okul yoneticisi sinif, ogretmen, ogrenci ve veli akisini tamamliyor.
- [x] Ogrenci saglik alanlari raporlara yansiyor.
- [x] Web admin desktop ve mobil kirilimlarda kullanilabilir durumda.
- [x] API Gateway canli ve frontend tarafindan kullaniliyor.
- [x] Tum public domainlerde TLS dogru.
- [ ] Landing workflow basarili.
- [ ] Web admin workflow basarili.
- [ ] Platform services workflow basarili.
- [ ] Son Faz 1 commit'i `master` uzerinde ve production ortaminda dogrulanmis.

Not: Bu listedeki son 4 madde GitHub Actions pipeline sonucu gerektirir. Kod ve lokal build tarafi tamamlandiktan sonra workflow kosumu ile isaretlenecektir.

## 8. Sonraki uygulama sirasi

Onerilen siralama:

1. Devam eden demo form + rate limit + okul yoneticisi sifre netlestirme is paketini tamamla.
2. Lokal Docker ortaminda backend, gateway, admin ve landing smoke testlerini yap.
3. Okul yoneticisi ilk giris ve sifre degistirme UI'ini tamamla.
4. Platform admin smoke testini bitir.
5. Okul yoneticisi sinif/ogretmen/ogrenci/veli smoke testini bitir.
6. Web admin responsive sorunlarini toparla.
7. GitHub Actions ile platform services ve web admin deploy'unu tekrar tetikle.
8. Canli ortamda domain, TLS, login, demo form ve okul yoneticisi akisini dogrula.
