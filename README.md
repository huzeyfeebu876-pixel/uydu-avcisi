# Uydu Avcısı (Satellite Hunter)

Bu proje, OSINT Turk için geliştirilmiş, harita üzerinden alan seçimi ve uydu görüntüsü tarihi sorgulama aracıdır. Tamamen **istemci taraflı (client-side)** çalışır, yani sunucu gerektirmez.

## Özellikler
- **Alan Seçimi:** Harita üzerinde poligon çizerek alan belirleme.
- **Uydu/Harita Modu:** Sokak haritası ve uydu görüntüleri arasında geçiş.
- **Tarih Sorgulama:** Uydu modunda haritaya tıklayarak o bölgenin görüntü tarihini öğrenme.
- **KMZ Oluşturma:** Seçilen alan ve tarih bilgisiyle Google Earth (KMZ) dosyası oluşturma.
- **JotForm Entegrasyonu:** Seçilen verileri JotForm widget'ı olarak forma aktarma.

## Kurulum ve Yayınlama (Deployment)

Bu proje statik bir web sitesidir (`HTML`, `CSS`, `JS`). Çalıştırmak için herhangi bir Python veya PHP sunucusuna ihtiyaç duymaz.

### Seçenek 1: GitHub Pages (Önerilen)
1. Bu klasörü bir GitHub deposuna (repository) yükleyin.
2. Depo ayarlarından (Settings) -> **Pages** sekmesine gidin.
3. **Source** olarak `main` branch'ini seçin ve kaydedin.
4. Size verilen `https://kullaniciadi.github.io/repo-adi` linkini kullanın.

### Seçenek 2: Netlify
1. [Netlify Drop](https://app.netlify.com/drop) adresine gidin.
2. `uydu_avcisi` klasörünü sürükleyip sayfaya bırakın.
3. Saniyeler içinde size `https://random-name.netlify.app` gibi bir link verecektir.

## Yerel Çalıştırma
Bilgisayarınızda test etmek için `index.html` dosyasını bir tarayıcıda açmanız yeterlidir. Ancak bazı tarayıcı güvenlik kısıtlamaları nedeniyle, bir yerel sunucu kullanmanız daha sağlıklı olur:

```bash
python3 -m http.server 8000
```
Ardından tarayıcıda `http://localhost:8000` adresine gidin.
