# Medienanalyse-App – Setup-Anleitung

Schulprojekt Deutschunterricht: Web-App zur Erfassung und Auswertung von Social-Media-Beiträgen.

---

## Voraussetzungen

Installiere diese Programme, bevor du beginnst:

| Programm | Wozu | Download |
|---|---|---|
| **Node.js** (Version 20 oder neuer) | Führt das Entwickler-Werkzeug aus | https://nodejs.org → «LTS» herunterladen |
| **Git** | Versionskontrolle + GitHub Pages | https://git-scm.com |
| **VS Code** (empfohlen) | Code-Editor | https://code.visualstudio.com |

Nach der Installation kannst du im Terminal prüfen, ob alles funktioniert:

```bash
node --version    # sollte v20.x.x oder höher zeigen
npm --version     # sollte 10.x.x oder höher zeigen
git --version     # sollte git version 2.x.x zeigen
```

---

## 1. Supabase einrichten

Supabase ist die Datenbank im Internet. Die Nutzung ist kostenlos.

### 1.1 Konto erstellen

1. Gehe zu [supabase.com](https://supabase.com) und klicke auf **Start your project**.
2. Registriere dich mit deiner E-Mail-Adresse oder mit GitHub.

### 1.2 Neues Projekt anlegen

1. Klicke auf **New project**.
2. Wähle als Organisation deinen Namen (wird automatisch erstellt).
3. Fülle das Formular aus:
   - **Project name:** `medienanalyse` (oder ähnlich)
   - **Database Password:** Wähle ein sicheres Passwort und notiere es – du brauchst es eventuell später.
   - **Region:** `West EU (Frankfurt)` ist für die Schweiz am schnellsten.
4. Klicke auf **Create new project**. Das Anlegen dauert ca. 1–2 Minuten.

### 1.3 Datenbankschema ausführen

1. Klicke im linken Menü auf **SQL Editor**.
2. Klicke oben rechts auf **New query**.
3. Öffne die Datei `supabase/schema.sql` aus diesem Projekt (liegt im Projektordner).
4. Kopiere den gesamten Inhalt und füge ihn in den SQL Editor ein.
5. Klicke auf **Run** (grüner Knopf). Du siehst unten «Success» wenn alles geklappt hat.

### 1.4 API-Schlüssel kopieren

1. Klicke im linken Menü auf **Project Settings** (Zahnrad-Symbol).
2. Klicke auf **API**.
3. Notiere (oder kopiere) diese zwei Werte – du brauchst sie im nächsten Schritt:
   - **Project URL** (z.B. `https://abcdefgh.supabase.co`)
   - **anon public** Key (langer Text unter «Project API keys»)

---

## 2. Benutzerkonten anlegen

Die App hat keine öffentliche Registrierung. Du legst die vier Schülerkonten und das Lehrerkonto direkt in Supabase an.

### Schritt für Schritt

1. Klicke im linken Menü auf **Authentication**.
2. Klicke auf **Users** → **Add user** → **Create new user**.
3. Trage E-Mail und Passwort ein, klicke auf **Create user**.
4. Wiederhole das für alle Personen (4 Bewerter + 1 Lehrperson).

**Wichtig:** Nach dem Anlegen musst du in der Datenbank das Profil mit dem richtigen Namen und der Rolle eintragen. Das geht einfach so:

1. Klicke im linken Menü auf **Table Editor**.
2. Wähle die Tabelle **profiles**.
3. Für jede neu angelegte Person erscheint dort automatisch eine Zeile (dank eines Triggers in der SQL-Datei). Trage dort:
   - **name:** Vorname der Person (z.B. `Anna`)
   - **role:** `bewerter` (für Schüler) oder `lehrperson` (für die Lehrperson)

---

## 3. Projekt lokal aufsetzen

Öffne ein Terminal (auf dem Mac: **Terminal.app** oder in VS Code «Terminal → Neues Terminal»).

### 3.1 Projektordner öffnen

```bash
cd ~/Desktop/D_Medienanalyse
```

### 3.2 Abhängigkeiten installieren

```bash
npm install
```

Das lädt alle Programmbibliotheken herunter (dauert 1–2 Minuten, erstellt den Ordner `node_modules`).

### 3.3 Umgebungsvariablen eintragen

Erstelle im Projektordner eine Datei namens `.env` (mit Punkt am Anfang):

```bash
cp .env.example .env
```

Öffne `.env` in VS Code und ersetze die Platzhalter mit deinen Supabase-Werten aus Schritt 1.4:

```
VITE_SUPABASE_URL=https://deine-projekt-url.supabase.co
VITE_SUPABASE_ANON_KEY=dein-anon-key
```

**Wichtig:** Die `.env`-Datei darf **nie** in Git hochgeladen werden (sie steht bereits in `.gitignore`).

### 3.4 App lokal starten

```bash
npm run dev
```

Die App öffnet sich unter [http://localhost:5173](http://localhost:5173). Du kannst dich jetzt mit einem der angelegten Konten einloggen.

Zum Stoppen: Im Terminal `Ctrl + C` drücken.

---

## 4. GitHub-Repository und Deployment

### 4.1 GitHub-Konto

Falls du noch kein Konto hast: Gehe zu [github.com](https://github.com) und registriere dich kostenlos.

### 4.2 Repository anlegen

1. Klicke auf GitHub oben rechts auf **+** → **New repository**.
2. Name: `medienanalyse` (oder ähnlich).
3. Wähle **Public** (wichtig für kostenlose GitHub Pages).
4. **Kein** Häkchen bei «Add a README file» – das Projekt hat schon eins.
5. Klicke auf **Create repository**.

### 4.3 Projekt hochladen (erstes Mal)

Kopiere die Befehle, die GitHub nach dem Erstellen anzeigt. Sie sehen ungefähr so aus (mit deinem Benutzernamen):

```bash
git init
git add .
git commit -m "Erster Commit"
git branch -M main
git remote add origin https://github.com/DEIN-NAME/medienanalyse.git
git push -u origin main
```

### 4.4 GitHub Pages aktivieren

1. Gehe auf GitHub zu deinem Repository.
2. Klicke auf **Settings** → **Pages** (linkes Menü).
3. Unter **Source**: wähle **GitHub Actions**.
4. Die App wird automatisch nach jedem `git push` neu gebaut und unter `https://DEIN-NAME.github.io/medienanalyse/` veröffentlicht.

### 4.5 Supabase-Keys in GitHub hinterlegen

Damit der automatische Build die Supabase-URL kennt, musst du die Keys einmal in GitHub hinterlegen:

1. Gehe auf GitHub zu deinem Repository → **Settings** → **Secrets and variables** → **Actions**.
2. Klicke auf **New repository secret** und trage ein:
   - Name: `VITE_SUPABASE_URL`, Wert: deine Supabase-URL
   - Name: `VITE_SUPABASE_ANON_KEY`, Wert: dein anon key
3. Wiederhole das für den zweiten Key.

### 4.6 Änderungen hochladen (später)

Immer wenn du etwas geändert hast und es live stellen willst:

```bash
git add .
git commit -m "Kurze Beschreibung der Änderung"
git push
```

GitHub Pages baut die Seite automatisch neu (dauert ca. 1–2 Minuten).

---

## 5. Lokale Entwicklung – tägliche Nutzung

```bash
cd ~/Desktop/D_Medienanalyse
npm run dev          # App starten
# → Ctrl + C zum Stoppen
```

---

## Projektstruktur (Übersicht)

```
D_Medienanalyse/
├── supabase/schema.sql     ← Datenbank-Schema (einmal ausführen)
├── src/
│   ├── pages/              ← eine Datei pro Seite
│   ├── components/         ← wiederverwendbare Bausteine
│   ├── lib/supabase.js     ← Datenbankverbindung
│   └── utils/              ← Hilfsfunktionen
├── .env                    ← NICHT in Git! (Supabase-Keys)
└── README.md               ← diese Datei
```

---

## Häufige Probleme

| Problem | Lösung |
|---|---|
| «Cannot find module» nach `git pull` | `npm install` ausführen |
| Leere Seite auf GitHub Pages | Prüfe, ob `base` in `vite.config.js` auf `/medienanalyse/` gesetzt ist |
| Login funktioniert nicht | Prüfe `.env` – sind URL und Key korrekt? |
| Umlaute falsch in Excel | CSV mit «Datei öffnen» und UTF-8 BOM wählen, nicht doppelklicken |
