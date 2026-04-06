# Current Feature Inventory

Bu dokuman, kod tabaninda su an mevcut olan urun ozelliklerini ve bunlarin entegrasyon durumunu ozetlemek icin hazirlandi.

Durum tanimlari:

- `Mevcut`: Backend ve/veya UI tarafinda somut olarak uygulanmis, akisin ana omurgasi kodda var.
- `Kismi`: Kod var ama client-backend kontrati eski, mock fallback var ya da akisin bir parcasi eksik.
- `Planli`: Kod tabaninda izleri var ama urun akisinda tamamlanmis degil.

## 1. Genel ozet

Kod tabaninda su anda en guclu alanlar:

- Telefon + OTP ile giris
- Rol bazli uygulama yapisi
- Okul / sinif / ogrenci cekirdegi
- Foto / post paylasimi
- Mesajlasma ve SignalR altyapisi
- Rozetler
- Formlar
- Ogrenci gozlemleri
- SaaS icin platform okul yonetimi temeli

En fazla entegrasyon acigi olan alanlar:

- Mobile admin paneli ile yeni backend rol/endpoint yapisi
- Parent tarafindaki bazi endpoint beklentileri
- Notifications API
- Mobile tarafindaki eski `Admin` rol kabulu

## 2. Auth ve tenant yapisi

### Telefon + OTP giris

Durum: `Mevcut`

Kod referanslari:

- [AuthController.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Controllers/AuthController.cs)
- [AuthService.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Application/Services/AuthService.cs)
- [LoginScreen.tsx](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/screens/auth/LoginScreen.tsx)
- [authStore.ts](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/store/authStore.ts)

Ozellikler:

- Telefon numarasi ile okul lookup
- OTP gonderme
- OTP dogrulama
- Refresh token
- `auth/me`
- JWT icinde rol ve `schoolId`

### Rol modeli

Durum: `Mevcut`

Kod referanslari:

- [UserRole.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Domain/Enums/UserRole.cs)
- [Program.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Program.cs)

Roller:

- `PlatformAdmin`
- `SchoolAdmin`
- `Teacher`
- `Parent`

Not:

Mobile tarafinda halen eski `Admin` stringini bekleyen yerler var. Bu nedenle yeni rol yapisi backend'de hazir, mobile route tarafinda ise uyarlama gerekiyor.

## 3. SaaS / platform yonetimi

### Platform seviyesinde okul yonetimi

Durum: `Mevcut`

Kod referanslari:

- [PlatformSchoolsController.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Controllers/PlatformSchoolsController.cs)
- [School.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Domain/Entities/School.cs)

Ozellikler:

- Okul listeleme
- Okul detayi
- Okul olusturma
- Okul guncelleme
- Okul yoneticisi atama
- Plan / kota / aktiflik bilgileri

Alanlar:

- `isActive`
- `plan`
- `maxStudents`
- `maxTeachers`
- `subscriptionEndsAt`
- `primaryAdminUserId`

## 4. Okul yonetimi

### Okul profili

Durum: `Mevcut`

Kod referansi:

- [SchoolsController.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Controllers/SchoolsController.cs)

Ozellikler:

- Kendi okul bilgilerini gorme
- Okul adini/adresini/telefonunu guncelleme
- Paket ve kota bilgisini alma

### Ogretmen yonetimi

Durum: `Mevcut`

Kod referanslari:

- [TeachersController.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Controllers/TeachersController.cs)
- [ManageTeachersScreen.tsx](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/screens/admin/ManageTeachersScreen.tsx)

Backend ozellikleri:

- Ogretmen listeleme
- Ogretmen detayi
- Ogretmen olusturma
- Ogretmen guncelleme

UI durumu:

- Mobil admin ekraninda ogretmen listesi ve ekleme ekrani var
- Ancak mobile halen eski `/admin/teachers` endpointlerini kullaniyor
- Bu nedenle ekran `kismi` durumda

### Sinif yonetimi

Durum: `Kismi`

Kod referanslari:

- [ClassesController.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Controllers/ClassesController.cs)
- [ManageClassesScreen.tsx](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/screens/admin/ManageClassesScreen.tsx)

Backend ozellikleri:

- Sinif listeleme
- Sinif detayi
- Sinif olusturma
- Sinif guncelleme
- Sinif silme

Not:

- Mobil ekran ogretmen atama endpointi bekliyor: `/classes/{id}/teacher`
- Backend'de ayri bir "assign teacher" endpointi yok; atama `PUT /api/classes/{id}` ile yapiliyor
- Bu yuzden UI entegrasyonu guncellenmeli

### Ogrenci yonetimi

Durum: `Mevcut`

Kod referanslari:

- [StudentsController.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Controllers/StudentsController.cs)
- [ManageStudentsScreen.tsx](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/screens/admin/ManageStudentsScreen.tsx)

Ozellikler:

- Ogrenci listeleme
- Sinifa gore filtreleme
- Ogrenci olusturma
- Ogrenci detayi
- Ogrenci guncelleme
- Soft delete
- Veli baglama
- Yuz egitimi icin face enrollment

Ek alanlar:

- `birthDate`
- `notes`
- veli iliski metadata'si

### Veli yonetimi

Durum: `Mevcut`

Kod referanslari:

- [ParentsController.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Controllers/ParentsController.cs)
- [ManageParentsScreen.tsx](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/screens/admin/ManageParentsScreen.tsx)

Backend ozellikleri:

- Veli listeleme
- Veli detayi
- Veli olusturma
- Veli guncelleme
- Ogrenci baglama / bagi guncelleme

Iliski metadata'si:

- `relationship`
- `isPrimaryContact`
- `canPickup`

UI durumu:

- Mobil admin ekraninda veli listesi var
- Ogrenci baglama butonu halen "yakinda aktif olacak" placeholder

## 5. Ogretmen akisleri

### Ogretmen dashboard

Durum: `Kismi`

Kod referansi:

- [TeacherDashboard.tsx](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/screens/teacher/TeacherDashboard.tsx)

Gorunen moduller:

- Sinif ozet karti
- Son aktiviteler
- Foto paylas
- Olumlu gozlem
- Rozet ver
- Mesajlar

Not:

- API basarisizsa mock aktivite listesine dusuyor

### Post / galeri paylasimi

Durum: `Mevcut`

Kod referanslari:

- [PostsController.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Controllers/PostsController.cs)
- [PostCreateScreen.tsx](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/screens/teacher/PostCreateScreen.tsx)
- [postStore.ts](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/store/postStore.ts)

Ozellikler:

- Ogretmen post olusturur
- Medya ekler
- Ogrenci etiketler
- Tag onayi yapar
- Post publish eder
- Parent sadece kendi cocuguna bagli published postlari gorur

Not:

- Mobile client `confirmTags` icin eski `/tags` endpointini bekliyor
- Backend'de dogru endpoint `/confirm-tags`

### Rozet verme

Durum: `Mevcut`

Kod referanslari:

- [BadgesController.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Controllers/BadgesController.cs)
- [BadgeAwardScreen.tsx](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/screens/teacher/BadgeAwardScreen.tsx)

Ozellikler:

- Rozet listesi
- Rozet olusturma
- Ogrenciye rozet verme
- Ogrenciye ait rozet gecmisi

### Olumlu gozlem / gelisim notu

Durum: `Kismi`

Kod referanslari:

- [ObservationsController.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Controllers/ObservationsController.cs)
- [ObservationAddScreen.tsx](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/screens/teacher/ObservationAddScreen.tsx)
- [observationStore.ts](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/store/observationStore.ts)

Backend ozellikleri:

- Ogrenci bazli gozlem listeleme
- Ogretmenin yeni gozlem eklemesi

UI durumu:

- Ekran ve store var
- Client sadece `note` gonderiyor
- Backend `title` ve `note` bekliyor
- Bu nedenle kontrat guncellemesi gerekiyor

### Sinif listesi ve ogrenci profili

Durum: `Kismi`

Kod referanslari:

- [ClassListScreen.tsx](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/screens/teacher/ClassListScreen.tsx)
- [StudentDetailScreen.tsx](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/screens/teacher/StudentDetailScreen.tsx)

Ozellikler:

- Ogrenci arama
- Ogrenci detay karti
- Rozet gecmisi
- Veli listesi
- Gozlem listesi

Not:

- Ekranlar API yoksa mock dataya dusebiliyor
- `StudentDto` tipleri mobile tarafta backend cevabindan geride

### Yoklama

Durum: `Mevcut ama ana scope disi`

Kod referanslari:

- [AttendanceController.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Controllers/AttendanceController.cs)
- [AttendanceScreen.tsx](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/screens/teacher/AttendanceScreen.tsx)

Ozellikler:

- Toplu yoklama kaydetme
- Sinif + tarih bazli yoklama gorme
- Ogrenci bazli ozet

### Gunluk rapor

Durum: `Mevcut ama ana scope disi`

Kod referanslari:

- [DailyReportsController.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Controllers/DailyReportsController.cs)
- [DailyReportScreen.tsx](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/screens/teacher/DailyReportScreen.tsx)

Ozellikler:

- Ogretmenin gunluk rapor olusturmasi
- Ogrenci bazli rapor listeleme
- Rapor detayi

### Odev

Durum: `Mevcut ama ana scope disi`

Kod referanslari:

- [AssignmentsController.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Controllers/AssignmentsController.cs)
- [AssignmentScreen.tsx](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/screens/parent/AssignmentScreen.tsx)

Ozellikler:

- Odev listeleme
- Odev olusturma
- Guncelleme
- Silme
- Parent tarafinda submission
- Teacher tarafinda grade

## 6. Veli akisleri

### Parent dashboard

Durum: `Kismi`

Kod referansi:

- [ParentDashboard.tsx](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/screens/parent/ParentDashboard.tsx)

Gorunen moduller:

- Cocuk karti
- Son fotograflar
- Son rozetler
- Duyurular
- Bekleyen formlar

Not:

- Bu ekran `myChildren`, `childPosts`, `notifications` gibi endpointler bekliyor
- Bu endpointlerin bir kismi backend'de yok veya farkli tasarlanmis

### Form doldurma ve form gecmisi

Durum: `Kismi`

Kod referanslari:

- [FormsController.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Controllers/FormsController.cs)
- [FormListScreen.tsx](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/screens/parent/FormListScreen.tsx)
- [FormDetailScreen.tsx](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/screens/parent/FormDetailScreen.tsx)
- [formStore.ts](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/store/formStore.ts)

Backend ozellikleri:

- Form sablonu listeleme
- Form sablonu detayi
- Submission listeleme
- Submission detayi
- Submission olusturma

Not:

- Mobile client hala `answers` tabanli eski payload bekliyor
- Backend `values` tabanli alan bazli yapi kullaniyor
- Bu nedenle ekranlar concept olarak var, kontrat uyarlamasi gerekiyor

### Foto galeri

Durum: `Kismi`

Kod referanslari:

- [ChildGalleryScreen.tsx](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/screens/parent/ChildGalleryScreen.tsx)
- [PostsController.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Controllers/PostsController.cs)

Ozellikler:

- Cocuk odakli galeri ekrani
- Parent feed mantigi

Not:

- Mobile `/posts/student/{id}` bekliyor
- Backend parent feed'i `GET /api/posts` icinde parent claim uzerinden sunuyor

### Rozet goruntuleme

Durum: `Kismi`

Kod referanslari:

- [BadgeViewScreen.tsx](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/screens/parent/BadgeViewScreen.tsx)
- [BadgesController.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Controllers/BadgesController.cs)

Not:

- Rozet backend'i var
- Mobile akisi `myChildren` endpointi bekledigi icin uyarlama gerekiyor

### Duyurular

Durum: `Mevcut`

Kod referansi:

- [AnnouncementsController.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Controllers/AnnouncementsController.cs)

Ozellikler:

- Okul geneli duyurular
- Sinif odakli duyurular
- Parent'e hedefli duyurular

## 7. Mesajlasma ve gercek zamanli haberlesme

### Konusma ve mesajlar

Durum: `Mevcut`

Kod referanslari:

- [MessagesController.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Controllers/MessagesController.cs)
- [ChatHub.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Hubs/ChatHub.cs)
- [useSignalR.ts](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/hooks/useSignalR.ts)
- [messageStore.ts](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/store/messageStore.ts)
- [MessagesScreen.tsx](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/screens/shared/MessagesScreen.tsx)
- [ChatScreen.tsx](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/screens/shared/ChatScreen.tsx)

Ozellikler:

- Konusma listesi
- Direkt konusma baslatma
- Mesaj listeleme
- Mesaj gonderme
- Okundu bilgisi
- SignalR ile gercek zamanli teslim

Not:

- Mobile API client halen `/messages/conversations` seklinde eski path kullaniyor
- Backend path'i `/api/conversations`
- Chat ekraninda bu nedenle fallback/mock mantigi da var

## 8. Bildirimler

### Push notification altyapisi

Durum: `Kismi`

Kod referanslari:

- [PostsController.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Controllers/PostsController.cs)
- [BadgesController.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Controllers/BadgesController.cs)
- [AnnouncementsController.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Controllers/AnnouncementsController.cs)

Ozellikler:

- FCM token alanlari var
- Post publish, badge ve duyuru akislari icin bildirim niyeti var

Not:

- Gercek FCM gonderimi TODO olarak duruyor; su an log seviyesinde

### In-app notifications

Durum: `Planli / UI stub`

Kod referanslari:

- [NotificationsScreen.tsx](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/screens/shared/NotificationsScreen.tsx)
- [client.ts](/Users/sezerdarendeli/Documents/GitHub/EduConnect/mobile/src/api/client.ts)

Not:

- Mobile notification ekrani ve mock data var
- Backend'de `notifications` controller yok

## 9. AI ve yuz tanima

### Face enrollment ve recognition

Durum: `Kismi`

Kod referanslari:

- [main.py](/Users/sezerdarendeli/Documents/GitHub/EduConnect/ai-service/main.py)
- [face_service.py](/Users/sezerdarendeli/Documents/GitHub/EduConnect/ai-service/services/face_service.py)
- [StudentsController.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Controllers/StudentsController.cs)
- [PostsController.cs](/Users/sezerdarendeli/Documents/GitHub/EduConnect/backend/EduLink.Api/Controllers/PostsController.cs)

Ozellikler:

- AI servisi ayri mikroservis
- API key korumasi
- Yuz encoding uretimi
- Grup fotografi icinde eslesme
- Ogrenci icin face enrollment endpointi

Not:

- Post publish akisinda Hangfire job var
- `FaceRecognitionJobRunner` halen AI cagiracak TODO noktasinda

## 10. QA, regression ve deploy

### Regression test projesi

Durum: `Mevcut`

Kod referanslari:

- [qa-regression.yml](/Users/sezerdarendeli/Documents/GitHub/EduConnect/.github/workflows/qa-regression.yml)
- [qa-suite](/Users/sezerdarendeli/Documents/GitHub/EduConnect/qa-suite)

Ozellikler:

- Newman ile API smoke
- Playwright ile mobile/web smoke
- Seed fixture scripti
- Docker compose ile QA stack

### Web admin deploy

Durum: `Mevcut`

Kod referanslari:

- [deploy-notio-web.yml](/Users/sezerdarendeli/Documents/GitHub/EduConnect/.github/workflows/deploy-notio-web.yml)
- [notio-web.yaml](/Users/sezerdarendeli/Documents/GitHub/EduConnect/k8s/notio-web.yaml)

Ozellikler:

- Web admin image build
- Registry push
- `vault` namespace deploy
- `notio.bidynod.com` hedefi

## 11. En guclu mevcut urun paketi

Bugun kod tabanina bakinca en gercekci ve en hazir urun paketi su:

- Telefon + OTP giris
- Rol / tenant yapisi
- Okul / sinif / ogrenci / veli / ogretmen cekirdegi
- Foto/post paylasimi
- Mesajlasma
- Rozetler
- Formlar
- Ogrenci gozlemleri

## 12. Entegrasyon acigi olan kritik noktalar

Asagidaki alanlar urun ozelligi olarak var ama kontrat guncellemesi gerektiriyor:

- Mobile login route'lari halen `Admin` bekliyor, `SchoolAdmin` ve `PlatformAdmin` beklemiyor
- Mobile admin ekranlari `/admin/*` endpointlerini kullaniyor, backend artik `teachers`, `parents`, `platform/schools` gibi yeni endpointler sunuyor
- Mobile `messageApi` path'leri backend ile uyumsuz
- Mobile `formApi` payload'i backend ile uyumsuz
- Mobile `observationApi` payload'i backend ile uyumsuz
- Mobile parent akislari `myChildren`, `notifications`, `posts/student/{id}` gibi eski endpoint beklentileri tasiyor

## 13. Sonuc

Kod tabaninda bugun itibariyla uygulama sadece "okul iletisim uygulamasi" degil; su an:

- preschool odakli aile-okul iletisim urunu
- cok kiracili SaaS temeli olan okul yonetim platformu
- media + messaging + form + observation merkezli bir cekirdek urun

En buyuk sonraki is, yeni backend kontratini mobile ve web admin tarafina tam oturtmak.
