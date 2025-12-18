// Global variable to store area text
var currentAreaText = '';

// Debug helper
function logScript(msg) {
    var d = document.getElementById('debug-info');
    if(d) d.innerHTML += "[Script.js] " + msg + "<br>";
    console.log("[Script.js] " + msg);
}

logScript("Dosya yüklendi ve çalışıyor.");

// Remove loading text first
document.addEventListener('DOMContentLoaded', function() {
    logScript("DOMContentLoaded tetiklendi.");
    
    var mapContainer = document.getElementById('map');
    if (mapContainer) {
        logScript("Map container bulundu.");
        mapContainer.innerHTML = ''; // Clear loading message
        
        // Fallback: If container has no height, force it
        if (mapContainer.clientHeight === 0) {
            mapContainer.style.height = '100vh'; // Force vh instead of %
            logScript("Yükseklik 0 tespit edildi, 100vh zorlandı.");
        }
    } else {
        logScript("HATA: Map container bulunamadı!");
        console.error("Map container not found!");
        return;
    }

    // Check Leaflet
    if (typeof L === 'undefined') {
        logScript("HATA: Leaflet (L) tanımlı değil! Kütüphane yüklenmemiş.");
        return;
    }

    // Initialize map
    try {
        logScript("Harita başlatılıyor...");
        var map = L.map('map', {
            zoomControl: true,
            attributionControl: true
        }).setView([39.9334, 32.8597], 6); // Default center: Turkey
        
        logScript("Harita nesnesi oluşturuldu.");
        
        // Make map global so other functions can use it if needed
        window.map = map; 
    } catch (e) {
        logScript("HATA: Harita başlatılamadı: " + e.message);
        console.error("Map initialization failed:", e);
        alert("Harita yüklenirken hata oluştu: " + e.message);
        return;
    }

    // Force resize multiple times to ensure rendering in iframe
    function forceResize() {
        if (window.map) {
            window.map.invalidateSize();
            logScript("Harita boyutu güncellendi (invalidateSize).");
        }
    }
    setTimeout(forceResize, 100);
    setTimeout(forceResize, 500);
    setTimeout(forceResize, 1000);
    setTimeout(forceResize, 3000);

    // Mouse over fix: When user hovers map, fix it once
    var fixedOnce = false;
    document.getElementById('map').addEventListener('mousemove', function() {
        if (!fixedOnce && window.map) {
            window.map.invalidateSize();
            fixedOnce = true;
        }
    });

    // Extra fix for iframe resizing
    window.addEventListener("resize", function() {
        if (window.map) window.map.invalidateSize();
    });
    // JotForm specific fix
    if (window.JFCustomWidget) {
        JFCustomWidget.subscribe("ready", function(){
            setTimeout(function(){ if (window.map) window.map.invalidateSize();}, 1000);
        });
    }

    // Base Layers
    var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    var satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    // Add default layer
    osmLayer.addTo(map);

    // Tile Debugging
    map.on('tileloadstart', function(e) {
        // logScript("Tile yükleniyor: " + e.tile.src); // Çok fazla log oluşturabilir, sadece gerekirse açın
    });
    
    map.on('tileload', function(e) {
        console.log("Tile yüklendi");
    });
    
    map.on('tileerror', function(e) {
        logScript("<span style='color:red'>Tile Yükleme Hatası:</span> " + e.error.message);
        console.error("Tile error:", e);
    });

    // Layer Control
    var baseMaps = {
        "Harita": osmLayer,
        "Uydu": satelliteLayer
    };

    L.control.layers(baseMaps).addTo(map);

    // Metadata Click Handler (Uydu Görüntüsü Tarihi)
    map.on('click', function(e) {
        // Sadece Uydu katmanı aktifse çalışsın
        if (map.hasLayer(satelliteLayer)) {
            // Çizim yaparken veya bir alan seçiliyken popup açılmasını engelle
            if (currentLayer || isDrawing) return; 

            L.esri.identifyFeatures({
                url: 'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer'
            })
            .on(map)
            .at(e.latlng)
            .run(function(error, featureCollection) {
                if (error) {
                    console.log(error);
                    return;
                }
                if (featureCollection.features.length > 0) {
                    // En iyi çözünürlüğe sahip veya tarihi olan katmanı bulmaya çalışalım
                    var feature = featureCollection.features[0];
                    for (var i = 0; i < featureCollection.features.length; i++) {
                        var f = featureCollection.features[i];
                        // Eğer geçerli bir tarihi varsa bunu tercih et
                        if (f.properties.SRC_DATE && f.properties.SRC_DATE !== 'Null') {
                            feature = f;
                            break;
                        }
                    }

                    var props = feature.properties;
                    
                    // Tarih formatını düzeltelim (YYYYMMDD -> DD.MM.YYYY)
                    var dateStr = props.SRC_DATE;
                    var formattedDate = "Bilinmiyor"; // Varsayılan

                    if (dateStr && dateStr !== 'Null') {
                        if (dateStr.length === 8) {
                            formattedDate = `${dateStr.substring(6,8)}.${dateStr.substring(4,6)}.${dateStr.substring(0,4)}`;
                        } else {
                            formattedDate = dateStr;
                        }
                    }

                    var content = `<div style="text-align:center;">
                                    <strong>Uydu Görüntüsü Bilgisi</strong><hr style="margin:5px 0;">
                                    <b>Tarih:</b> ${formattedDate}<br>
                                    <b>Kaynak:</b> ${props.NICE_NAME}<br>
                                    <b>Çözünürlük:</b> ${props.NICE_DESC}
                                   </div>`;
                                   
                    L.popup()
                        .setLatLng(e.latlng)
                        .setContent(content)
                        .openOn(map);
                }
            });
        }
    });

    // Add Geocoder Control (Search Bar)
    L.Control.geocoder({
        defaultMarkGeocode: false
    })
    .on('markgeocode', function(e) {
        var bbox = e.geocode.bbox;
        var poly = L.polygon([
            bbox.getSouthEast(),
            bbox.getNorthEast(),
            bbox.getNorthWest(),
            bbox.getSouthWest()
        ]);
        map.fitBounds(poly.getBounds());
    })
    .addTo(map);

    // Initialize FeatureGroup to store editable layers
    var drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // Initialize draw control
    var drawControl = new L.Control.Draw({
        draw: {
            polygon: true,
            marker: false,
            circle: false,
            circlemarker: false,
            polyline: false,
            rectangle: true // Rectangle is also a polygon effectively
        },
        edit: {
            featureGroup: drawnItems,
            remove: true
        }
    });
    map.addControl(drawControl);

    var currentLayer = null;
    var isDrawing = false; // Çizim modunda olup olmadığımızı takip edelim

    // Handle draw events to toggle drawing state
    map.on('draw:drawstart', function(e) {
        isDrawing = true;
    });

    map.on('draw:drawstop', function(e) {
        isDrawing = false;
    });

    // Handle draw:created event
    map.on(L.Draw.Event.CREATED, function (e) {
        var type = e.layerType,
            layer = e.layer;

        // Remove existing layers to ensure only one polygon is selected
        drawnItems.clearLayers();
        drawnItems.addLayer(layer);
        currentLayer = layer;

        updateCoordinatesInfo(layer);
        // Button state is handled in updateCoordinatesInfo
    });

    // Handle draw:deleted event
    map.on(L.Draw.Event.DELETED, function (e) {
        if (drawnItems.getLayers().length === 0) {
            currentLayer = null;
            document.getElementById('coordinates-info').innerHTML = '<p>Henüz bir alan seçilmedi.</p>';
            document.getElementById('generate-btn').disabled = true;
            document.getElementById('result-area').style.display = 'none';
            currentAreaText = '';
        }
    });

    // Handle draw:edited event
    map.on(L.Draw.Event.EDITED, function (e) {
        var layers = e.layers;
        layers.eachLayer(function (layer) {
            updateCoordinatesInfo(layer);
        });
    });

    function updateCoordinatesInfo(layer) {
        var latlngs = layer.getLatLngs()[0]; // Assuming simple polygon
        var html = '<strong>Seçilen Alan Koordinatları:</strong><br><ul>';
        
        latlngs.forEach(function(latlng) {
            html += `<li>${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}</li>`;
        });
        html += '</ul>';
        
        // Calculate area (approximate)
        var area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
        currentAreaText = L.GeometryUtil.readableArea(area, true);
        html += `<br><strong>Tahmini Alan:</strong> ${currentAreaText}`;

        // Max area check (e.g., 25 km^2)
        var maxArea = 25 * 1000 * 1000; // 25 km^2 in sq meters
        var generateBtn = document.getElementById('generate-btn');

        if (area > maxArea) {
            html += `<br><br><strong style="color:red;">UYARI: Seçilen alan çok büyük! (${(area/1000000).toFixed(2)} km²)<br>Maksimum izin verilen alan: 25 km²</strong>`;
            generateBtn.disabled = true;
            layer.setStyle({color: 'red', fillColor: '#f03'});
        } else {
            generateBtn.disabled = false;
            layer.setStyle({color: '#3388ff', fillColor: '#3388ff'});
        }

        document.getElementById('coordinates-info').innerHTML = html;
    }

    document.getElementById('generate-btn').addEventListener('click', function() {
        if (!currentLayer) return;

        var startDate = document.getElementById('start-date').value;
        var endDate = document.getElementById('end-date').value;

        if (!startDate || !endDate) {
            alert("Lütfen başlangıç ve bitiş tarihlerini seçiniz.");
            return;
        }

        if (startDate > endDate) {
            alert("Başlangıç tarihi bitiş tarihinden sonra olamaz.");
            return;
        }

        var dateRange = startDate + " - " + endDate;
        
        // Extract coordinates in [lng, lat] format for KML
        // Leaflet uses [lat, lng]
        var latlngs = currentLayer.getLatLngs()[0];
        var coordinates = latlngs.map(function(ll) {
            return [ll.lng, ll.lat];
        });
        
        // Close the polygon loop for KML if not already closed
        if (coordinates.length > 0) {
            var first = coordinates[0];
            var last = coordinates[coordinates.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) {
                coordinates.push(first);
            }
        }

        // JotForm Entegrasyonu: Veriyi form alanına kaydet
        var widgetData = {
            coordinates: coordinates,
            date: dateRange,
            startDate: startDate,
            endDate: endDate,
            area: currentAreaText,
            info: "Kullanıcı tarafından seçilen alan ve tarih aralığı."
        };

        // Veriyi JSON string olarak gönder (JotForm tek bir değer bekler)
        var finalData = JSON.stringify(widgetData);
        
        if (window.JFCustomWidget) {
            JFCustomWidget.sendData({ value: finalData });
            console.log("JotForm'a veri gönderildi:", finalData);
        }

        // Ayrıca postMessage ile de gönderelim (alternatif kullanım için)
        window.parent.postMessage({
            message: 'data_generated',
            ...widgetData
        }, '*');

        // Kullanıcıya bilgi ver
        var resultArea = document.getElementById('result-area');
        resultArea.innerHTML = '<strong>✓ Başarılı:</strong> Seçilen alan ve tarih bilgisi forma aktarıldı.<br>Formu gönderebilirsiniz.';
        resultArea.style.display = 'block';
    });

    // JotForm Widget Başlatma ve Olay Dinleyicileri
    if (window.JFCustomWidget) {
        JFCustomWidget.subscribe("ready", function(msg){
            console.log("JotForm Widget Hazır:", msg);
            // Eğer widget ayarları varsa buradan okuyabiliriz
            // var settings = msg.settings;
        });

        JFCustomWidget.subscribe("submit", function(){
            var msg = {
                valid: true,
                value: ""
            };
            
            // Tarih verilerini al (Hem yeni hem eski yapıyı destekle)
            var startDateInput = document.getElementById('start-date');
            var endDateInput = document.getElementById('end-date');
            var oldDateInput = document.getElementById('date-select');

            var startDate = startDateInput ? startDateInput.value : "";
            var endDate = endDateInput ? endDateInput.value : "";
            var oldDate = oldDateInput ? oldDateInput.value : "";

            // Eğer eski yapı varsa ve doluysa, onu kullan
            if (!startDate && oldDate) {
                startDate = oldDate;
                endDate = oldDate; // Bitiş de aynı olsun
            }

            // Kontrol: Alan seçili mi ve en az bir tarih var mı?
            if (currentAreaText && startDate && currentLayer) {
                var dateRange = (startDate === endDate) ? startDate : (startDate + " - " + endDate);
                
                // Koordinatları tekrar alalım
                var latlngs = currentLayer.getLatLngs()[0];
                var coordinates = latlngs.map(function(ll) {
                    return [ll.lat, ll.lng]; // Google Maps formatı (Lat, Lng)
                });

                // KML için koordinatları hazırla (Lng, Lat formatında ve döngü kapalı)
                var kmlCoordinates = "";
                latlngs.forEach(function(ll) {
                    kmlCoordinates += `${ll.lng},${ll.lat},0 `;
                });
                // Poligonu kapat
                if (latlngs.length > 0) {
                    kmlCoordinates += `${latlngs[0].lng},${latlngs[0].lat},0`;
                }

                // KML İçeriğini Oluştur
                var kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Placemark>
    <name>Uydu Avcısı Alanı</name>
    <description>Tarih: ${dateRange}, Alan: ${currentAreaText}</description>
    <Polygon>
      <outerBoundaryIs>
        <LinearRing>
          <coordinates>
            ${kmlCoordinates}
          </coordinates>
        </LinearRing>
      </outerBoundaryIs>
    </Polygon>
  </Placemark>
</kml>`;

                // KMZ Oluştur (JSZip ile)
                var zip = new JSZip();
                zip.file("doc.kml", kmlContent);

                zip.generateAsync({type:"base64"}).then(function(base64) {
                    // Daha okunaklı bir yapı oluştur
                    var readableOutput = {
                        "1. GENEL BİLGİLER": {
                            "Bilgi": "Bu veri Uydu Avcısı tarafından oluşturulmuştur.",
                            "Oluşturulma Zamanı": new Date().toISOString()
                        },
                        "2. SEÇİM DETAYLARI": {
                            "Tarih Aralığı": dateRange,
                            "Başlangıç": startDate,
                            "Bitiş": endDate || startDate,
                            "Alan Büyüklüğü": currentAreaText
                        },
                        "3. KONUM VERİLERİ": {
                            "Google Maps Linki": `https://www.google.com/maps?q=${coordinates[0][0]},${coordinates[0][1]}`,
                            "Koordinat Listesi": coordinates
                        },
                        "4. DOSYA VERİSİ": {
                            "KMZ Dosyası (Base64)": base64
                        }
                    };
                    
                    msg.value = JSON.stringify(readableOutput, null, 4);
                    logScript("SUBMIT Olayı: Veri gönderiliyor (Okunaklı Format).");
                    JFCustomWidget.sendSubmit(msg);
                }).catch(function(err) {
                    console.error("KMZ oluşturma hatası:", err);
                    // Hata olsa bile en azından metin verilerini gönderelim
                    var fallbackOutput = {
                        "HATA": "KMZ dosyası oluşturulamadı.",
                        "Detay": err.message,
                        "Tarih": dateRange,
                        "Alan": currentAreaText,
                        "Koordinatlar": coordinates
                    };
                    msg.value = JSON.stringify(fallbackOutput, null, 4);
                    JFCustomWidget.sendSubmit(msg);
                });

            } else {
                logScript("SUBMIT Olayı: Veri yok veya eksik (Alan/Tarih seçilmedi).");
                // Kullanıcıya uyarı verip gönderimi engelleyelim mi? 
                // JotForm'da valid: false dönersek form gönderilmez.
                msg.valid = false;
                msg.message = "Lütfen harita üzerinde bir alan seçin ve tarih girin.";
                JFCustomWidget.sendSubmit(msg);
            }
        });
    }
});
