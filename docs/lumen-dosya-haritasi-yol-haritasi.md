# Lumen Dosya Haritasi Tabanli Yol Haritasi

Son guncelleme: 2026-05-17

## 1) Lumen durum ozeti

- Lumen `health_check` sonucu:
  - Backend: `ollama`
  - Host: `http://localhost:11434`
  - Model: `ordis/jina-embeddings-v2-base-code`
  - Status: `OK`
- Lumen `index_status` sonucu:
  - Index root: `/Users/sezerdarendeli/Documents/GitHub/EduConnect`
  - Indexed: `307`
  - Chunks: `1502`
  - Last indexed: `never`
  - Stale: `yes` (arka planda guncelleme suruyor)

Not: Semantic arama aktif calisiyor. Index stale uyarisi devam ettigi surece ilk sonuclarda gecici eksiklik olabilir; birkac arama turu sonra tazelenir.

## 2) Dosya haritasi (modul bazli)

### A) Landing ve pazarlama katmani

- Klasor: `landing/`
- Ana dosyalar:
  - `landing/index.html`
  - `landing/styles.css`
  - `landing/app.js`
  - `landing/Dockerfile`
- Yayin:
  - Workflow: `.github/workflows/deploy-landing.yml`
  - K8s: `k8s/notio-landing.yaml`

### B) Web admin katmani (platform + school)

- Klasor: `admin-panel/`
- Ana dosyalar:
  - `admin-panel/src/App.tsx`
  - `admin-panel/src/components/layout/AdminLayout.tsx`
  - `admin-panel/src/pages/*`
  - `admin-panel/src/lib/api.ts`
- Yayin:
  - Workflow: `.github/workflows/deploy-notio-web.yml`
  - K8s: `k8s/notio-web.yaml`

### C) API Gateway katmani

- Klasor: `api-gateway/`
- Ana dosyalar:
  - `api-gateway/Program.cs`
  - `api-gateway/appsettings.json`
  - `api-gateway/Dockerfile`
- Yayin:
  - Workflow: `.github/workflows/deploy-platform-services.yml`
  - K8s: `k8s/notio-platform-services.yaml` (apigw)

### D) Backend servis katmani

- Klasor: `backend/`
- Katmanlar:
  - `EduLink.Api`
  - `EduLink.Application`
  - `EduLink.Domain`
  - `EduLink.Infrastructure`
- Kritik controller alanlari:
  - Auth, PlatformSchools, DemoRequests, Students, Parents, Classes, Teachers
  - MealPlans, Announcements, Reports ile iliskili API yuzeyleri
- Yayin:
  - Workflow: `.github/workflows/deploy-platform-services.yml`
  - K8s: `k8s/notio-platform-services.yaml`

### E) QA ve kalite katmani

- Klasor: `qa-suite/`
- Ana dosyalar:
  - `qa-suite/tests/faz1-web.spec.js`
  - `qa-suite/tests/mobile-smoke.spec.js`
  - `qa-suite/playwright.config.mjs`
- Yayin/otomasyon:
  - Workflow: `.github/workflows/qa-faz1-web.yml`

### F) Altyapi ve yayin katmani

- Klasorler: `k8s/`, `.github/workflows/`, `helm/`
- Sertifika/TLS:
  - `k8s/notio-certificate.yaml`
  - `k8s/notio-external-tls.yaml`
- Ek workflow:
  - `.github/workflows/deploy-certificates.yml`

## 3) Uygulanacak yol haritasi (dosya haritasina gore)

### Faz A - Index ve gozlemlenebilirlik zemini

Hedef: Lumen aramasi ve kod kesif akisinin stabil hale gelmesi.

- Ollama embedding servisini calisir duruma getir.
- Lumen index refresh:
  - `index_status` -> `semantic_search` ile seed -> tekrar `index_status`
- CI tarafinda "Lumen health check" adimi dokumante et (zorunlu degil, tavsiye).

Tamamlanma olcutu:
- `health_check` green
- `Files > 0` ve `Chunks > 0`

### Faz B - Faz 1 P0 stabilizasyonu (web + gateway + deploy)

Hedef: landing + platform admin + school admin akisinin canli ve test edilebilir hale gelmesi.

- `admin-panel/src/App.tsx` ve `admin-panel/src/lib/api.ts`:
  - `mustChangePassword` zorunlu akisini finalize et.
- `backend/EduLink.Api/Controllers/AuthController.cs` ve `backend/EduLink.Application/Services/AuthService.cs`:
  - `mustChangePassword` me/refresh/login tutarliligi.
- `landing/app.js` + `backend/EduLink.Api/Controllers/DemoRequestsController.cs` + `api-gateway/Program.cs`:
  - demo talep, rate limit, honeypot ve hata mesaj tutarliligi.
- `qa-suite/tests/faz1-web.spec.js`:
  - yeni zorunlu sifre degistirme senaryosunu kapsa.

Tamamlanma olcutu:
- Build green (`admin-panel`, `backend`, `api-gateway`)
- `qa-faz1-web` workflow green
- Canli smoke: `notioedu.com`, `platform.notioedu.com`, `apigw.notioedu.com/healthz`

### Faz C - School admin islev derinlestirme (P1)

Hedef: school admin panelini operasyonel veri giris merkezi haline getirmek.

- Ogrenci/veli/sinif/ogretmen akislari:
  - CRUD + rapora yansima
  - ogrenci profil alanlari (cinsiyet, alerji, ilac, saglik notu)
- Raporlar:
  - saglik bloklari
  - eksik kayit bloklari
  - devamsizlik/iletisim ozetleri
- Toplu import:
  - Excel sablon uyumu ve hata raporlama

Tamamlanma olcutu:
- School admin tam smoke green
- Rapor ekranlarinda dummy yerine backend verisi

### Faz D - Takvim modulleri (P1 kritik genisleme)

Hedef: mobilin tukecegi yapida panel uzerinden planlama verisi toplamak.

- Aylik yemek takvimi UI:
  - endpoint: `/api/meal-plans`, `/api/meal-plans/monthly`
  - gunluk satir tabanli giris (kahvalti/ogle/ara ogun/alerjen/not)
- Etkinlik/program modulu:
  - `calendar-events` CRUD API
  - web form + liste + filtre
  - veliye gidecek bilgilendirme metni alanlari

Tamamlanma olcutu:
- Kaydet/listele/guncelle/sil akislari green
- Mobil tuketim kontrati net

### Faz E - Duyuru ve karar destek paneli

Hedef: okul yoneticisi icin dashboard degerini arttirmak.

- MEB duyuru aggregator endpoint:
  - DB yazmadan fetch + timeout + cache + graceful fallback
- Dashboard widget:
  - kaynak acik/kapali iki durumda da panel stabil

Tamamlanma olcutu:
- Duyurular blokta gorunur
- Kaynak erisilemese bile panel bozulmaz

### Faz F - Yayin guvencesi ve kapanis

Hedef: tum public yollarin release kalitesinde kapanmasi.

- Workflow zinciri:
  - deploy-landing
  - deploy-notio-web
  - deploy-platform-services
  - deploy-certificates
  - qa-faz1-web
- TLS ve domain dogrulama:
  - `notioedu.com`
  - `platform.notioedu.com`
  - `apigw.notioedu.com`
- `docs/faz-1-web-admin-kapanis-plani.md` checklist tamamlanir.

Tamamlanma olcutu:
- Tum workflowlar green
- Son commit master uzerinde canli dogrulanmis

## 4) Hemen sonraki 5 adim (kisa icra sirasi)

1. Lumen embedding servisinin ayaga kaldirilmasi.
2. Mevcut WIP paketinin (mustChangePassword) test/commit/push kapanisi.
3. `qa-faz1-web` icin eksik repo secrets (`QA_PLATFORM_ADMIN_EMAIL`, `QA_PLATFORM_ADMIN_PASSWORD`) set edilip action tekrar kosulmasi.
4. School + platform smoke test gaplerinin kapatilmasi.
5. Takvim (yemek + etkinlik) modullerinin backend/UI tamamlanmasi.
