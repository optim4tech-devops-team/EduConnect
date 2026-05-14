# Notio Landing

Bu klasor, uygulamadan bagimsiz pazarlama ve tanitim sayfasini icerir.

Icerik:

- `index.html`: ana landing page
- `styles.css`: tum stil yapisi
- `app.js`: mobil navigation ve ufak arayuz davranislari
- `assets/notio-logo.png`: Notio ana marka ikonu
- `assets/notio-mark.svg`: onceki alternatif marka isareti
- `Dockerfile`: landing sayfasini container olarak yayinlamak icin
- `nginx.conf`: static publish ve `healthz` endpoint ayari

Bu sayfa static olarak yayinlanabilir. Ayrica ayrik bir Docker image veya ayri bir domain altinda deploy edilmeye uygundur.

Lokal Docker testi:

```bash
docker build -t notio-landing-local ./landing
docker run --rm -p 4185:80 notio-landing-local
```

Sonrasinda:

- `http://127.0.0.1:4185`
- `http://127.0.0.1:4185/healthz`
