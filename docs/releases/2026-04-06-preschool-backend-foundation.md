# Preschool Backend Foundation Release Note

Bu not, `feature/backend` altinda anaokulu odakli backend genislemesinin UI ve mobile ekipleri tarafindan nasil tuketilecegini netlestirmek icin hazirlandi.

## Bu teslimatta gelen ana degisiklikler

- Rol modeli `PlatformAdmin`, `SchoolAdmin`, `Teacher`, `Parent` olarak netlestirildi.
- SaaS ust yonetim icin platform okul yonetimi endpointleri eklendi.
- Okul icin veli yonetimi endpointleri eklendi.
- Okul icin ogretmen yonetimi endpointleri eklendi.
- Ogrenci-veli iliskisine `relationship`, `isPrimaryContact`, `canPickup` alanlari eklendi.
- Dinamik form sabloni ve form submission backend katmani eklendi.
- Ogrenci bazli olumlu gozlem / gelisim notu endpointleri eklendi.
- Mevcut okul, sinif, ogrenci, rozet, duyuru ve post endpointleri yeni rol adlariyla uyumlu hale getirildi.

## UI ve Mobile ekiplerini etkileyen kontrat degisiklikleri

### 1. Auth role degeri degisti

`GET /api/auth/me` ve login cevaplarinda artik rol stringleri:

- `PlatformAdmin`
- `SchoolAdmin`
- `Teacher`
- `Parent`

Eski `Admin` degeri artik donmeyecek.

### 2. Ogrenci detayinda veli iliski metadata'si var

`GET /api/students`
`GET /api/students/{id}`

Veli objesi artik su alanlari da donuyor:

- `relationship`
- `isPrimaryContact`
- `canPickup`

UI notu:
Veli kartlarinda "anne / baba / vasi" etiketi, birincil iletisim rozeti ve teslim alabilir bilgisi gosterilebilir.

### 3. Okul objesi genisledi

`GET /api/schools/my` cevabinda artik:

- `isActive`
- `plan`
- `maxStudents`
- `maxTeachers`
- `subscriptionEndsAt`
- `primaryAdminUserId`

Platform paneli ve school admin paneli ayri dusunulmeli.

## Yeni endpoint gruplari

### Platform admin

- `GET /api/platform/schools`
- `POST /api/platform/schools`
- `GET /api/platform/schools/{id}`
- `PUT /api/platform/schools/{id}`
- `POST /api/platform/schools/{id}/assign-admin`

Beklenen web kullanim:

- Platform paneli okul listesi
- Okul olusturma
- Paket / kota goruntuleme
- Okul yoneticisi atama

### School admin - ogretmen yonetimi

- `GET /api/teachers`
- `GET /api/teachers/{id}`
- `POST /api/teachers`
- `PUT /api/teachers/{id}`

Beklenen kullanim:

- Ogretmen listesi
- Yeni ogretmen olusturma
- Telefon bazli OTP girisine uygun ogretmen kaydi

### School admin / teacher - veli yonetimi

- `GET /api/parents`
- `GET /api/parents/{id}`
- `POST /api/parents`
- `PUT /api/parents/{id}`

Beklenen kullanim:

- School admin tam CRUD yapar
- Teacher sadece kendi ogrencilerine bagli velileri gorur

`POST` ve `PUT` icinde veliye ogrenci baglama ayni request ile yapilabilir.

### Formlar

- `GET /api/forms/templates`
- `GET /api/forms/templates/{id}`
- `POST /api/forms/templates`
- `PUT /api/forms/templates/{id}`
- `GET /api/forms/submissions`
- `GET /api/forms/submissions/{id}`
- `POST /api/forms/submissions`

Beklenen kullanim:

- School admin form sablonu olusturur
- Parent aktif formlari listeler ve doldurur
- Teacher ve school admin gelen basvurulari gorur

Onemli not:

Bir form sablonu icin submission olustuktan sonra alan yapisi degistirilemez. UI tarafinda bunu "Yeni versiyon olustur" akisi olarak ele almak gerekir.

### Ogrenci gozlemleri

- `GET /api/students/{studentId}/observations`
- `POST /api/students/{studentId}/observations`

Beklenen kullanim:

- Teacher kendi sinif ogrencileri icin olumlu gozlem / gelisim notu ekler
- Parent sadece kendi cocugunun gozlemlerini gorur
- School admin denetim ve listeleme yapar

## Ornek UI davranis kurallari

### Web admin

- `PlatformAdmin` gorurse platform paneline yonlendir.
- `SchoolAdmin` gorurse okul paneline yonlendir.
- `Teacher` ve `Parent` web admin ana akislarinda yonetim paneline alinmamali.

### Mobile

- `Teacher` mevcut akislarini kullanmaya devam eder.
- `Parent` artik form listesi ve form submission gecmisi icin yeni alan kullanabilir.
- `SchoolAdmin` mobilde desteklenecekse okul ozet ve temel yonetim ekranlari ayrik ele alinmali.

## Gecici teknik not

- Kod tarafi build edilip binary uretildi.
- Ancak bu makinede kurulu `dotnet-ef` design-time ortami ile proje paketleri arasinda surum uyumsuzlugu oldugu icin migration bu oturumda otomatik uretilmedi.
- Bu nedenle DB schema degisiklikleri icin bir sonraki adimda uyumlu `dotnet-ef` ile migration alinmasi gerekiyor.

## UI / Mobile icin sonraki entegrasyon adimi

1. Rol bazli route ayrimini `PlatformAdmin` ve `SchoolAdmin` ile guncelleyin.
2. Ogrenci detayinda veli iliski alanlarini gostermeye hazir olun.
3. Parent uygulamasina form listeleme ve form doldurma akislarini ekleyin.
4. Teacher uygulamasina ogrenci gozlem ekleme akislarini ekleyin.
5. Web platform panelinde okul CRUD ve okul yoneticisi atama ekranlarini consume edin.
