import base64
import json
import os

def save_kmz():
    print("-" * 50)
    print("KMZ DÖNÜŞTÜRÜCÜ")
    print("-" * 50)
    print("Lütfen JotForm'dan gelen veriyi (JSON formatında veya sadece kmzBase64 kodunu) aşağıya yapıştırın ve Enter'a basın:")
    
    try:
        user_input = input().strip()
        
        # Boş giriş kontrolü
        if not user_input:
            print("Hata: Veri girmediniz.")
            return

        b64_string = ""

        # 1. Durum: Kullanıcı tüm JSON verisini yapıştırdıysa
        if "{" in user_input:
            try:
                data = json.loads(user_input)
                
                # Yeni Yapı (Gruplandırılmış)
                if "4. DOSYA VERİSİ" in data:
                    b64_string = data["4. DOSYA VERİSİ"].get("KMZ Dosyası (Base64)", "")
                
                # Eski Yapı (Düz)
                elif 'kmzBase64' in data:
                    b64_string = data['kmzBase64']
                
                # JotForm Value İçinde String Olarak
                elif 'value' in data: 
                    try:
                        inner_data = json.loads(data['value'])
                        if "4. DOSYA VERİSİ" in inner_data:
                            b64_string = inner_data["4. DOSYA VERİSİ"].get("KMZ Dosyası (Base64)", "")
                        else:
                            b64_string = inner_data.get('kmzBase64', '')
                    except:
                        pass
            except:
                # JSON parse edilemediyse belki string içinde geçiyordur
                pass
        
        # 2. Durum: Kullanıcı sadece Base64 kodunu yapıştırdıysa
        if not b64_string:
            # Temizlik yapalım (tırnak işaretleri vs varsa)
            b64_string = user_input.strip('"').strip("'")

        # Base64 başlığı varsa temizle (data:application/vnd.google-earth.kmz;base64,...)
        if "," in b64_string:
            b64_string = b64_string.split(",")[1]

        # Dönüştürme İşlemi
        decoded_data = base64.b64decode(b64_string)
        
        # Dosya ismi oluştur (Tarih saat ekleyerek)
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"uydu_avcisi_{timestamp}.kmz"
        
        with open(filename, "wb") as f:
            f.write(decoded_data)
            
        print("\n" + "=" * 50)
        print(f"✅ BAŞARILI! Dosya oluşturuldu: {filename}")
        print(f"📂 Konum: {os.getcwd()}/{filename}")
        print("=" * 50)
        print("Bu dosyaya çift tıklayarak Google Earth'te açabilirsiniz.")

    except Exception as e:
        print("\n❌ HATA OLUŞTU:")
        print(str(e))
        print("Lütfen kopyaladığınız verinin eksiksiz olduğundan emin olun.")

if __name__ == "__main__":
    save_kmz()
