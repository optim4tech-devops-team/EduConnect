# Preschool Backend Release and Integration Note

Bu dokuman, anaokulu odakli ilk urun fazi icin backend kapsam kararlarini ve UI/mobile ekiplerinin bu backend'i nasil tuketecegini netlestirmek icin hazirlandi.

Hedef kitle:

- Web admin panel ekibi
- Mobile ekip
- QA / product ekipleri

Bu dokuman bugunden itibaren `feature/backend` branch'i altinda yapilacak backend gelistirmeleri icin referans not olarak kullanilacak. Backend tarafinda her anlamli teslimattan sonra bu formatta kisa release note gecilecek.

## 1. Urun Scope Karari

Anaokulu ilk faz icin urunde olacak ana moduller:

- Mesajlasma
- Push / SMS / e-posta bildirimleri
- Kayit, basvuru ve form toplama
- Ogrenci / veli / ogretmen / sinif yonetimi
- Fotograf ve post paylasimi
- Rozetler, olumlu gozlemler ve gelisim notlari

Bu fazda urunde olmayacak moduller:

- Yoklama
- Devamsizlik / gec gelis / izin takibi
- Gunluk veya haftalik okul raporu
- Exam / marksheet / resmi not sistemi
- Cashless catering
- Seating plan
- Room booking

Ilk faz sonrasi dusunulebilecek moduller:

- Veli gorusme randevusu ve video gorusme
- Ev etkinligi / homework benzeri hafif akis
- Kulup / ek aktivite yonetimi

## 2. Backend Uygulama Hedefi

Backend tarafinda ana hedef, UI ekiplerinin farkli yorumlamasina gerek birakmayacak kadar net bir contract sunmak.

Temel prensipler:

- Tum kayitlar `Guid` tabanli id ile donecek
- Tum list endpoint'leri filtre + pagination destekleyecek
- Tum tarih alanlari UTC ISO-8601 donecek
- Tum enum alanlari string donecek
- Tum response modellerinde `createdAt` ve gerekli yerlerde `updatedAt` olacak
- Tum dosya/fotograf akislarinda tek tip upload modeli kullanilacak
- Auth telefon + OTP uzerinden calisacak

Onerilen rol modeli:

- `PlatformAdmin`
- `SchoolAdmin`
- `Teacher`
- `Parent`

Not:

Su an projede mevcut `Admin` rolu okul yoneticisine daha yakin. Backend gelistirmelerinde bu alan school admin olarak netlestirilecek, SaaS ust yonetim icin ayrica `PlatformAdmin` katmani acilacak.

## 3. Backend Modulleri

### 3.1 Tenant ve Kimlik Katmani

Backend sorumluluklari:

- Platform seviyesinde okul olusturma
- Okul aktif/pasif durumu
- Okul yoneticisi atama
- Telefon bazli OTP giris
- Rol ve `schoolId` claim uretimi
- School-scope veri erisimi

Planlanan ana endpoint gruplari:

- `POST /api/auth/lookup`
- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `GET /api/auth/me`
- `GET /api/platform/schools`
- `POST /api/platform/schools`
- `GET /api/platform/schools/{id}`
- `PUT /api/platform/schools/{id}`
- `POST /api/platform/schools/{id}/assign-admin`

Web admin tuketimi:

- Platform admin panelinde okul listesi, okul detayi, okul yoneticisi atama
- School admin panelinde sadece kendi okulunun verilerini gorebilme

Mobile tuketimi:

- Login ekrani sadece telefon/OTP akisi kullanacak
- `me` endpoint'i ile rol bazli route secilecek

### 3.2 Ogrenci / Veli / Ogretmen / Sinif Yonetimi

Backend sorumluluklari:

- Sinif olusturma ve ogretmene baglama
- Ogrenci olusturma
- Veli olusturma veya mevcut veliye baglama
- Ogrenci-veli iliskisi
- Yetkili teslim alacak kisi bilgileri
- Alerji, saglik, not alanlari

Planlanan endpoint gruplari:

- `GET /api/classes`
- `POST /api/classes`
- `GET /api/classes/{id}`
- `PUT /api/classes/{id}`
- `GET /api/students`
- `POST /api/students`
- `GET /api/students/{id}`
- `PUT /api/students/{id}`
- `GET /api/parents`
- `POST /api/parents`
- `POST /api/students/{id}/assign-parent`

Web admin tuketimi:

- School admin panelinde sinif, ogretmen, ogrenci ve veli yonetimi
- Tek ekrandan ogrenci karti icinde veli, alerji, saglik ve not alanlari

Mobile tuketimi:

- Teacher tarafinda kendi sinif ogrencilerini listeleme
- Parent tarafinda sadece kendi cocuklarini gorebilme

### 3.3 Formlar, Basvuru ve Veri Toplama

Backend sorumluluklari:

- Dinamik form tanimi
- Form alan tipi yonetimi
- Form submission toplama
- Veli onay/form gecmisi
- Kayit formu, izin formu, saglik formu, teslim alacak kisi formu

Planlanan endpoint gruplari:

- `GET /api/forms/templates`
- `POST /api/forms/templates`
- `GET /api/forms/templates/{id}`
- `PUT /api/forms/templates/{id}`
- `GET /api/forms/submissions`
- `POST /api/forms/submissions`
- `GET /api/forms/submissions/{id}`

Web admin tuketimi:

- School admin paneli form template olusturur
- Basvuru / onay / eksik belge ekranlari buradan yonetilir

Mobile tuketimi:

- Parent uygulamasi form doldurur, onay verir, gecmis formlarini gorur

### 3.4 Fotograf ve Post Paylasimi

Backend sorumluluklari:

- Ogretmenin post olusturmasi
- Medya ekleme
- Ogrenci etiketleme
- Veliye sadece ilgili cocukla baglantili iceriklerin gosterilmesi
- Taslak / yayinlandi ayrimi

Planlanan endpoint gruplari:

- `GET /api/posts`
- `POST /api/posts`
- `GET /api/posts/{id}`
- `PUT /api/posts/{id}`
- `POST /api/posts/{id}/publish`
- `POST /api/posts/{id}/tags`

Web admin tuketimi:

- School admin icerik denetimi, moderasyon, gerekirse post pasifleme

Mobile tuketimi:

- Teacher: post olusturma, etiketleme, yayinlama
- Parent: kendi cocuguna ait galeri / feed

### 3.5 Rozet, Olumlu Gozlem ve Gelisim Notu

Bu alan klasik "davranis takibi" gibi konumlanmayacak.

Urun dili:

- Rozet
- Olumlu gozlem
- Gelisim notu
- Kutlama / basari paylasimi

Backend sorumluluklari:

- Rozet tanimi
- Ogrenciye rozet verme
- Ogretmen notu ekleme
- Zaman cizgisi mantiginda gecmis gosterimi

Planlanan endpoint gruplari:

- `GET /api/badges`
- `POST /api/badges`
- `POST /api/badges/award`
- `GET /api/students/{id}/observations`
- `POST /api/students/{id}/observations`

Web admin tuketimi:

- Rozet katalogu yonetimi
- Gozlem kayitlarini denetleme

Mobile tuketimi:

- Teacher uygulamasinda rozet verme ve olumlu not ekleme
- Parent uygulamasinda cocuk gelisim akisinda gosterme

### 3.6 Mesajlasma ve Bildirim

Backend sorumluluklari:

- Ogretmen-veli birebir mesajlasma
- Konusma listesi
- Okunmadi sayisi
- Push notification
- SMS / e-posta fallback veya kampanya tipi bildirim

Planlanan endpoint gruplari:

- `GET /api/conversations`
- `POST /api/conversations`
- `GET /api/conversations/{id}/messages`
- `POST /api/conversations/{id}/messages`
- `GET /api/notifications`
- `POST /api/notifications/send`

Realtime:

- SignalR / websocket katmani korunacak
- Mesaj ve bildirim event'leri tek standarda baglanacak

Web admin tuketimi:

- Duyuru veya toplu bildirim ekranlari
- Gonderim gecmisi

Mobile tuketimi:

- Teacher ve parent tarafinda chat kutusu
- Push geldikten sonra ilgili conversation'a derin link

## 4. Admin Paneli Icin UI Etkisi

Web tarafinda iki panel mantigi korunmali:

- Platform Admin
- School Admin

### Platform Admin Paneli

Gerekli ana ekranlar:

- Okul listesi
- Okul olusturma / guncelleme
- Okul detay
- Okul yoneticisi atama
- Paket / aktif-pasif / limit ekranlari

Bu panel mobile mantigi tasimaz, tamamen SaaS operasyon panelidir.

### School Admin Paneli

Gerekli ana ekranlar:

- Siniflar
- Ogretmenler
- Ogrenciler
- Veliler
- Formlar
- Post moderasyonu
- Rozet / gozlem katalogu
- Bildirim ve duyuru

UI ekibinin dikkat etmesi gerekenler:

- Tum listeler filtreli ve sayfalamali dusunulmeli
- Tum formlar taslak + kaydet mantigina uygun olmali
- School admin sadece kendi okulunun datasini gorecek varsayimi ile tasarlanmalı
- Platform admin ve school admin tasarimlari ayni component sistemini kullanabilir ama route ve yetki ayrimi net olmali

## 5. Mobile Icin UI Etkisi

Mobile urun iki temel role gore okunmali:

- Teacher app experience
- Parent app experience

### Teacher Mobile

Gerekli akıslar:

- Telefon/OTP login
- Kendi sinif ogrencilerini gorme
- Fotograf/post olusturma
- Rozet verme
- Olumlu gozlem ekleme
- Veli ile mesajlasma
- Form veya onay eksigi olan ogrenciyi gorebilme

### Parent Mobile

Gerekli akislar:

- Telefon/OTP login
- Kendi cocuklari
- Galeri / post akisi
- Rozet ve gelisim notlari
- Ogretmen mesajlari
- Form doldurma / onay verme
- Bildirim gecmisi

Mobile ekibin dikkat etmesi gerekenler:

- Auth sadece telefon/OTP varsayimi ile kurulacak
- `me` endpoint'i sonrası rol bazli routing yapilacak
- Tum liste response'lari cache'lenebilir tasarlanmalı
- Fotograf akislarinda upload sureci UI tarafinda asenkron dusunulmeli
- Realtime mesajlasma ile REST listeleme birlikte kullanilmali

## 6. API Tuketim Standarti

UI ve mobile ekipleri icin ortak kurallar:

- Token refresh merkezi interceptor ile yapilacak
- Tum enum alanlari string beklenmeli
- `null` alanlar normalize edilmeli
- Liste endpoint'lerinde bos state tasarimi mutlaka olmali
- Dosya yukleme icin backend'in verecegi resmi akis disina cikilmamali
- Endpoint adlari veya response shape degisirse release note'ta "breaking" olarak gecilecek

Onerilen response sekli:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalCount": 0
}
```

Tek kayit response'lari:

```json
{
  "id": "guid",
  "createdAt": "2026-04-06T10:00:00Z",
  "updatedAt": "2026-04-06T10:00:00Z"
}
```

## 7. Release Note Formati

Backend tarafinda her anlamli teslimattan sonra UI ve mobile ekibe asagidaki formatta not gecilecek:

### Backend Release Note

- Surum / tarih
- Bu release'in amaci
- Eklenen endpoint'ler
- Degisen endpoint'ler
- Silinen veya deprecated alanlar
- Yeni enum / status degerleri
- UI ekibi icin gerekli ekran degisiklikleri
- Mobile ekip icin gerekli ekran/flow degisiklikleri
- Breaking change var mi
- QA'nin test etmesi gereken ana senaryolar

Onerilen kisa ornek:

```md
## Backend Release - Forms v1

- Added:
  - GET /api/forms/templates
  - POST /api/forms/submissions
- Updated:
  - GET /api/auth/me artik parent icin children summary donuyor
- UI Impact:
  - School admin paneline form listesi ve form detay ekrani gerekli
- Mobile Impact:
  - Parent app icin form detail + submit ekranlari gerekli
- Breaking:
  - Yok
- QA:
  - Parent form gonderebiliyor mu
  - School admin submission gorebiliyor mu
```

## 8. Karar Ozeti

Bu asamada backend gelistirmeleri anaokulu odakli sade bir urun etrafinda toplanacak:

- iletişim
- kayit ve formlar
- paylasim
- rozet / olumlu gozlem
- teacher-parent etkilesimi

Bu dokumanin amaci UI ve mobile ekiplerinin backend teslimlerini beklerken dogru ekran mimarisini kurabilmesi. Bundan sonra backend tarafinda yapilan her ana is parcasi icin bu not guncellenecek veya ayni formatta yeni release note eklenecek.
