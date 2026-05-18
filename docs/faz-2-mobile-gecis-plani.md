# Faz 2 Mobile Gecis Plani

Son guncelleme: 2026-05-17

## Amaç

Faz 2 ile hedef, Faz 1'de tamamlanan platform + school admin veri girislerinin mobil tarafta dogrudan tuketilmesi ve veli/ogretmen deneyiminin canli veriye alinmasidir.

## Dalga 1 (Baslatildi)

- Mobil `calendar` yuzeyi backend kontratlariyla hizalandi:
  - `meal-plans`
  - `calendar-events`
  - `routine-rules`
- Parent tarafinda takvim akisi tab menusuyle erisilebilir hale getirildi.
- School admin mobil tarafinda takvim yonetimi tab menusuyle erisilebilir hale getirildi.

## Dalga 2 (Sıradaki)

- `routine-rules` icin push planlama metadata'si netlestirilecek.
- Parent takvim ekraninda:
  - gun bazli filtre
  - etkinlik tipi filtre
  - alerjen vurgusu
  eklenecek.

## Dalga 3

- Mobil `student profile` ekraninda:
  - cinsiyet
  - alerji
  - ilac bilgisi
  - saglik notu
  alanlari canli veriden gosterilecek.

## Dalga 4

- Mobile QA smoke genisletilecek:
  - School admin: takvim kaydet/guncelle/sil
  - Parent: yemek + etkinlik + rutin gorunurluk
  - Login + mustChangePassword redirection kontrolu

## Kabul Kriterleri

- Mobilde takvim sayfalari mock'a dusmeden backend verisi okuyabilmeli.
- `apigw.notioedu.com` uzerinden tum mobile API cagri zinciri calismali.
- Faz 2 Dalga 1-2 tamamlandiginda min. bir veli ve bir school admin kullanicisi ile smoke senaryosu yeşil olmali.
