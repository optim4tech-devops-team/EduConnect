# QA Suite

Bu klasor, backend ve mobile degisikliklerinden sonra hizli regresyon kontrolu yapabilmek icin ayri bir dogrulama projesidir.

Kapsam:

- Backend smoke testleri: Newman ile rol bazli API akislari
- Mobile smoke testleri: Expo web build + Playwright route kontrolleri
- Fixture/seed: test kullanicilari, okul, sinif ve ogrenci seed'i

## Ne Test Ediyor

- OTP giris akisi
- Admin okul ve sinif islemleri
- Teacher assignment, badge ve attendance akisi
- Parent assignment, attendance, badge ve announcement gorunumleri
- Mobile login, admin, teacher ve parent kritik ekran route'lari

Varsayilan dummy kayitlar:

- Okul: Küçük Sıralar Ana Okulları
- Ogretmen: Elif Toksoy
- Veli: Sezer Darendeli (`05337102007`)
- Ogrenci: Rana

## Kurulum

```bash
cd /Users/sezerdarendeli/Documents/GitHub/EduConnect/qa-suite
npm install
npx playwright install chromium
```

Mobile bagimliliklari da kurulu olmali:

```bash
cd /Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile
npm install --legacy-peer-deps
```

## Kullanim

Servisleri ayaga kaldir:

```bash
cd /Users/sezerdarendeli/Documents/GitHub/EduConnect/qa-suite
npm run services:up
```

Sadece API smoke:

```bash
npm run api
```

Sadece mobile smoke:

```bash
npm run mobile
```

Faz 1 web ekran QA:

```bash
QA_LANDING_URL=https://notioedu.com \
QA_WEB_ADMIN_URL=https://platform.notioedu.com \
QA_API_BASE_URL=https://apigw.notioedu.com/api \
QA_PLATFORM_ADMIN_EMAIL=admin@notioedu.com \
QA_PLATFORM_ADMIN_PASSWORD=<github-secret-ile-ayni-sifre> \
npm run faz1:web
```

GitHub Actions uzerinden manuel kosmak icin:

```bash
gh workflow run "QA Faz 1 Web Screens"
```

Not: Action icin `QA_PLATFORM_ADMIN_EMAIL` ve `QA_PLATFORM_ADMIN_PASSWORD` secret'lari tanimli olmalidir.

Tum suiti tek komutta kos:

```bash
npm run all
```

Varsayilan olarak `npm run all` bittiginde Docker servislerini kapatir. Acik kalmasini istersen:

```bash
QA_KEEP_SERVICES=1 npm run all
```

## Ortam Degiskenleri

Ornek degerler [qa-suite/.env.example](/Users/sezerdarendeli/Documents/GitHub/EduConnect/qa-suite/.env.example) icinde var.

En onemlileri:

- `QA_API_BASE_URL`
- `QA_DATABASE_URL`
- `QA_MOBILE_WEB_URL`
- `QA_MOBILE_WEB_PORT`
- `QA_ADMIN_PHONE`
- `QA_TEACHER_PHONE`
- `QA_PARENT_PHONE`
- `QA_LANDING_URL`
- `QA_WEB_ADMIN_URL`
- `QA_PLATFORM_ADMIN_EMAIL`
- `QA_PLATFORM_ADMIN_PASSWORD`

## Notlar

- API suiti mock SMS modunda calisir ve OTP kodlarini dogrudan veritabanindan okur.
- Mobile suiti native simulator degil, Expo web build uzerinden smoke test yapar.
- Bu suite mevcut eksikleri de fail olarak gosterebilir; amaci tam olarak bunu gorunur kilmaktir.
