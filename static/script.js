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
        if (window.map) window.map.invalidateSize();
    }
    setTimeout(forceResize, 100);
    setTimeout(forceResize, 500);
    setTimeout(forceResize, 2000);

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

        var date = document.getElementById('date-select').value;
        if (!date) {
            alert("Lütfen bir tarih seçiniz.");
            return;
        }
        
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

        // Client-side KMZ Generation
        var kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
    <kml xmlns="http://www.opengis.net/kml/2.2">
      <Document>
        <name>Uydu Avcısı - ${date}</name>
        <Style id="polyStyle">
          <LineStyle>
            <color>ff0000ff</color>
            <width>3</width>
          </LineStyle>
          <PolyStyle>
            <color>320000ff</color>
          </PolyStyle>
        </Style>
        <Placemark>
          <name>Target Area - ${date}</name>
          <description>Target Date: ${date}\nArea: ${currentAreaText}\nGenerated: ${new Date().toISOString()}</description>
          <styleUrl>#polyStyle</styleUrl>
          <Polygon>
            <outerBoundaryIs>
              <LinearRing>
                <coordinates>
                  ${coordinates.map(c => `${c[0]},${c[1]},0`).join(' ')}
                </coordinates>
              </LinearRing>
            </outerBoundaryIs>
          </Polygon>
        </Placemark>
      </Document>
    </kml>`;

        var zip = new JSZip();
        zip.file("doc.kml", kmlContent);
        
        zip.generateAsync({type:"blob"})
        .then(function(content) {
            var filename = `uydu_avcisi_${date.replace(/-/g, '')}_${new Date().getTime()}.kmz`;
            saveAs(content, filename);

            // Show download link (optional, since we auto-saved)
            var resultArea = document.getElementById('result-area');
            var downloadLink = document.getElementById('download-link');
            
            // Create a blob URL for the link
            var url = URL.createObjectURL(content);
            downloadLink.href = url;
            downloadLink.download = filename;
            downloadLink.innerText = "KMZ İndirildi (Tekrar İndir)";
            resultArea.style.display = 'block';

            // JotForm Entegrasyonu: Veriyi form alanına kaydet
            // Not: Client-side olduğu için kalıcı bir URL veremiyoruz, ancak koordinatları verebiliriz.
            var widgetData = {
                filename: filename,
                coordinates: coordinates,
                date: date,
                area: currentAreaText
            };

            // Veriyi JSON string olarak gönder (JotForm tek bir değer bekler)
            JFCustomWidget.sendData({ value: JSON.stringify(widgetData) });

            // Ayrıca postMessage ile de gönderelim (alternatif kullanım için)
            window.parent.postMessage({
                message: 'kmz_generated',
                ...widgetData
            }, '*');
        });
    });

    // JotForm Widget Başlatma
    if (window.JFCustomWidget) {
        JFCustomWidget.subscribe("ready", function(){
            console.log("JotForm Widget Ready");
        });
    }
});
