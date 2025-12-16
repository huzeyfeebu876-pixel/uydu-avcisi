# Uydu Avcısı

Bu proje, OpenStreetMap üzerinde bir alan seçerek, seçilen alan için belirtilen uydu tipine göre KMZ dosyası oluşturan web tabanlı bir araçtır.

## Kurulum

1. Gerekli Python kütüphanelerini yükleyin:
   ```bash
   pip install -r requirements.txt
   ```

## Çalıştırma

1. Uygulamayı başlatın:
   ```bash
   python app.py
   ```

2. Tarayıcınızda `http://127.0.0.1:5000` adresine gidin.

## Kullanım

1. Harita üzerindeki çizim araçlarını (çokgen veya dikdörtgen) kullanarak bir alan belirleyin.
2. Sol panelden uydu tipini seçin (Maxar 50cm, Maxar 30cm, Airbus Pleiades 50cm).
3. "KMZ Oluştur" butonuna tıklayın.
4. Oluşturulan KMZ dosyasını indirin.
