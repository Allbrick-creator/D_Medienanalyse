# Übergabe-Dokument – Medienanalyse App

## Projektübersicht
Schulprojekt Deutschunterricht: Web-App zum Erfassen und Auswerten von Social-Media-Beiträgen.
- **Technik:** React + Vite, Supabase (Postgres + Auth), Chart.js, GitHub Pages (HashRouter)
- **Projektordner:** `/Users/matthiaspicard/Desktop/D_Medienanalyse`
- **Supabase:** Konto und Projekt vorhanden, Schema bereits ausgeführt
- **Lokale App starten:** Terminal öffnen → `cd ~/Desktop/D_Medienanalyse` → `npm run dev` → öffnet unter `http://localhost:5173/medienanalyse/`

---

## Aktueller Stand – ALLE PHASEN ABGESCHLOSSEN ✓

### Phase 1 + 2 (Grundgerüst)
- Login-Seite mit Supabase Auth
- Layout mit Sidebar-Navigation, Light/Dark Mode
- Dashboard mit Statistik-Karten
- Pakete-Seite mit Tabelle, Verteilplan-Algorithmus, manueller Zuteilung
- Vollständiges Erfassen-Formular (Abschnitte A–G mit allen Skalen und Ankerbeschreibungen)
- Duplikat-Hilfe im Erfassen-Formular
- Einstellungen-Seite (Erhebungstage)
- Supabase-Schema mit RLS, allen Tabellen und Startdaten
- GitHub Actions Workflow für Deployment

### Phase 3 (Daten, Kalibrierung) ✓
- Daten-Seite: Tabelle mit Filter (Anbieter, Tag, Bewerter, Plattform), Sortierung, Bearbeiten/Löschen
- CSV-Export (UTF-8 BOM für Excel, ISO-Zeitformat für Re-Import)
- CSV-Import mit Vorschau
- Kalibrierung: Referenzbeiträge erfassen + Bewertung + Übereinstimmungsanzeige

### Phase 4 (Auswertung H1–H6) ✓
- Auswertungsseiten für alle 6 Hypothesen mit Chart.js-Diagrammen
- Interpretationsfelder pro Hypothese (in DB gespeichert, admin-only)
- Spearman-Korrelation für H4
- `expandBoth()`-Funktion: Posts mit `platform='beide'` werden für plattformbasierte Analysen dupliziert
- Admin sieht «Jetzt festlegen»-Link im Dashboard

### Phase 5 (Präsentation, Feinschliff) ✓
- Präsentationsmodus: Vollbild-Overlay mit Tab-Bar, Pfeiltasten-Navigation (← →), Escape zum Beenden
- Alle H1–H6 als Folien direkt in der App
- Scroll-Reset beim Folienwechsel (`key={idx}`)
- Zeitzone-Bug behoben: `posted_at` wird korrekt als UTC gespeichert, Anzeige in Lokalzeit

---

## Bekannte Fixes (bereits erledigt)
- **GRANT-Rechte** für `authenticated`-Rolle auf alle Tabellen
- **RLS-Policies** mit `is_admin_or_bewerter()`-Funktion (Migration `migration_admin_and_posted_at.sql`)
- **Zeitzone-Bug:** Eingabe in Lokalzeit wird mit `new Date(...).toISOString()` als UTC gespeichert; beim Laden im Edit-Modus `getHours()`/`getMinutes()` statt `toISOString().slice()` für korrekte Lokalzeit-Anzeige
- **Räder-Zeitwahl (WheelPicker):** Kreisförmig scrollbar (REPEATS=5, MID=2), separater `postedAtTime`-State damit 00:00 nach Zeitänderung nicht bold bleibt
- **CSV-Export:** `posted_at` als ISO 8601 exportiert (PostgreSQL-kompatibel)
- **Toter Code entfernt:** `p.link`-Referenzen in Capture.jsx und Calibration.jsx (Spalte wurde durch Migration entfernt)

---

## Ausgeführte SQL-Migrationen (alle erledigt)
| Datei | Inhalt |
|---|---|
| `supabase/schema.sql` | Komplettes Datenbankschema |
| `supabase/migration_admin_and_posted_at.sql` | `posted_at timestamptz` statt `link`, RLS für Admin-Vollzugriff |

---

## Wichtige Dateien

| Datei | Zweck |
|---|---|
| `supabase/schema.sql` | Komplettes Datenbankschema (bereits ausgeführt) |
| `supabase/migration_admin_and_posted_at.sql` | Migration: posted_at + Admin-RLS (bereits ausgeführt) |
| `src/hooks/useAuth.jsx` | Auth-Kontext mit Profil-Laden |
| `src/hooks/useTheme.jsx` | Light/Dark Mode |
| `src/lib/supabase.js` | Supabase-Client |
| `src/App.jsx` | Router (HashRouter) |
| `src/components/Layout.jsx` | Sidebar-Navigation |
| `src/pages/Packages.jsx` | Pakete mit Verteilplan |
| `src/pages/Capture.jsx` | Erfassen-Formular A–G + WheelPicker Zeitwahl |
| `src/pages/Dashboard.jsx` | Übersicht/Statistik |
| `src/pages/Settings.jsx` | Erhebungstage |
| `src/pages/Data.jsx` | Datentabelle, CSV-Export/-Import |
| `src/pages/Calibration.jsx` | Kalibrierungserfassung + Übereinstimmung |
| `src/pages/Analysis.jsx` | Übersicht Auswertung |
| `src/pages/AnalysisH1.jsx` | H1: Clickbait-Analyse |
| `src/pages/AnalysisH2.jsx` | H2: Sachlichkeit |
| `src/pages/AnalysisH3.jsx` | H3: Themenwahl |
| `src/pages/AnalysisH4.jsx` | H4: Emotion vs. Information (Spearman) |
| `src/pages/AnalysisH5.jsx` | H5: Plattform TikTok |
| `src/pages/AnalysisH6.jsx` | H6: Angleichung |
| `src/pages/Presentation.jsx` | Präsentationsmodus (Vollbild, Folien) |
| `src/utils/distributionUtils.js` | Verteilplan-Algorithmus |
| `.env` | Supabase-Keys (nicht in Git) |
| `.github/workflows/deploy.yml` | GitHub Actions Deployment |

---

## Datenbankschema (Übersicht)

| Tabelle | Inhalt |
|---|---|
| `providers` | 7 Anbieter mit Typ (boulevard/oeffentlich/qualitaet) |
| `profiles` | Benutzerprofile (id = auth.users.id, name, role) |
| `survey_settings` | Erhebungstage day1/day2/day3 |
| `packages` | 21 Pakete (7 × 3 Tage), Zuteilung, Status |
| `posts` | Erfasste Beiträge mit allen Bewertungsfeldern A–G + `posted_at timestamptz` |
| `calibration_items` | ~10 Kalibrierungs-Referenzbeiträge |
| `calibration_posts` | Kalibrierungsbewertungen pro Person |
| `hypothesis_interpretations` | Interpretationen H1–H6 |

---

## Rollen
- `admin`: alles (inkl. Verteilplan, Pakete zuteilen, Interpretationen bearbeiten)
- `bewerter`: lesen, erfassen, eigene Einträge bearbeiten, Einstellungen ändern
- `beobachter` / `lehrperson`: nur lesen, keine Änderungen

---

## Kontext für neue KI

Du arbeitest mit einem Schüler ohne viel Programmiererfahrung. Erkläre alle Schritte einfach und Schritt für Schritt. Die App-Oberfläche ist auf Deutsch in Schweizer Rechtschreibung (immer «ss», nie «ß»). Warte nach jeder Phase, bis der Benutzer testet und bestätigt.
