Project: AR Sales Companion PWA (MVP)
1. Vision & Core Use Case
Eine leichtgewichtige Web-App für den Außendienst (B2E), um 3D-Modelle (z. B. Red Bull Kühlschränke) direkt aus dem Digital Asset Management (Bynder) via Augmented Reality in realen Räumen zu platzieren. Fokus auf flüssige Interaktion (Verschieben/Skalieren) und Offline-Fähigkeit für Verkaufsgespräche in Gebieten mit schlechtem Empfang.

2. Tech Stack Recommendation
Frontend: React (Vite als Build-Tool für Schnelligkeit).

AR-Engine: Google <model-viewer> – Standard für Web-AR.

PWA-Support: Vite PWA Plugin mit Workbox für Service Worker Management.

Storage (Caching): IndexedDB (via idb-keyval) für große 3D-Files (GLB/USDZ), da LocalStorage für Megabyte-große Dateien nicht ausreicht.

Backend (Asset-Broker): FastAPI (Python). Aufgabe: Bynder API-Abfrage, Caching-Logik und GLB-zu-USDZ Konvertierung für iOS-Nutzer.

3. Asset Pipeline & Formate
Quelle: Bynder API (Format: GLB).

Android/Web: Nutzt nativ das GLB-File.

iOS: Benötigt USDZ.

Vibe-Constraint: Das Backend muss bei der ersten Anfrage eines Assets ein USDZ generieren (z.B. via usd-core oder blender-cli) und dieses für nachfolgende Anfragen cachen.

Thumbnails: Nutze die von Bynder bereitgestellten statischen JPG/WebP-Vorschauen für den Katalog.

4. Offline-Strategie & Caching (Smart Sync)
App-Shell: Der Service Worker cached alle UI-Elemente (JS, CSS, Icons) via CacheStorage.

Favoriten-System: * User können Assets im Katalog als "Favorit" markieren.

Beim Markieren lädt die App das vollständige GLB (und ggf. USDZ) herunter und speichert es in der IndexedDB.

<model-viewer> greift im Offline-Modus prioritär auf die Blob-URLs aus der IndexedDB zu.

Background Sync: Wenn wieder Netz vorhanden ist, werden Metadaten (Preise, Namen) im Hintergrund aktualisiert.

5. UI/UX Workflow (The "Catalog-to-AR" Flow)
Grid-Ansicht: Schlanke Liste mit WebP-Vorschaubildern (Lazy Loading).

Detail-Ansicht: Einbetten des <model-viewer> mit dem poster-Attribut (zeigt Bild, während das 3D-Modell im Hintergrund lädt).

AR-Trigger: Ein prominenter Button aktiviert den nativen AR-Modus:

iOS: Startet AR Quick Look.

Android: Startet Scene Viewer oder WebXR Device API.

Interaktion: Native Unterstützung für "Pinch-to-zoom" und "Drag-to-reposition".

6. Best Practices (Web-AR)
Dateigrößen: Assets sollten für mobile Netze optimiert sein (Ziel: < 5MB pro Modell). Nutze Draco-Kompression für GLBs.

Lighting: Nutze HDR-Umgebungskarten (Environment Maps), damit die Kühlschränke realistische Reflexionen der Umgebung zeigen.

Permissions: Sauberes Handling der Kamera-Berechtigungen inkl. Fallback-Anweisungen für den User.

7. Bekannte Implementierungs-Hürden (Tips for Vibe Coding)
"The iOS USDZ Problem": Stelle sicher, dass der Link zum USDZ-File für <model-viewer> über das Attribut ios-src bereitgestellt wird.

"CORS Settings": Die Bynder API und dein Python-Backend müssen korrekte CORS-Header setzen, damit die PWA die Binärdaten laden kann.

"Memory Management": Beim Schließen der AR-Ansicht müssen Ressourcen freigegeben werden, um Abstürze des mobilen Browsers zu verhindern.

8. Es soll github genutzt werden und der gesamte build process in github actions verfügbar sein

9. Erstelle konfigurationen wie beispielsweise die 'callback URL', 'bynder url' und secrets in einer .env datei.

10. die authentication zu bynder soll via OAuth erfolgen