# PoliGo

**Găsește universitatea parteneră unde ți se recunosc materiile.**

PoliGo e o aplicație web pentru studenții UPT care vor să plece cu Erasmus. Merge pe laptop și pe telefon, din același link.

- **Live:** https://pavelcsako.github.io/PoliGo/ (după ce activezi GitHub Pages, vezi mai jos)
- Proiect făcut la AI Prototyping Bootcamp, UPT, noiembrie 2026.

> ⚠️ Universitățile, cursurile, locurile și termenele din aplicație sunt **date demo**. Înlocuiește-le cu partenerii reali ai facultății înainte să le prezinți drept reale (vezi [Cum schimbi datele](#cum-schimbi-datele)).

---

## Ce face aplicația

Aplicația are două moduri, iar interfața se schimbă când treci dintr-unul în altul.

| | **Explorare** (cyan) | **Călătorie** (auriu) |
|---|---|---|
| Când | până la acceptare | după ce Biroul Erasmus confirmă acceptarea |
| Te ajută cu | să alegi universitatea unde ți se echivalează cele mai multe materii | ce ai de făcut, și până când, de la acceptare până la întoarcere |
| Ecrane | Hartă, Căutare, Shortlist, Profil | Today, Calendar, Hartă, Profil |

Partea principală e **Explorarea**: îți bifezi materiile de la UPT, iar aplicația îți arată pe un glob, pentru fiecare universitate parteneră, câte dintre ele se potrivesc cu cursurile de acolo.

---

## Cum o folosești, pas cu pas

### 1. Logarea
- Intră pe link și apasă **Sign in with @student.upt.ro**.
- Scrie adresa ta de student, de exemplu `ana.popescu@student.upt.ro`. Orice altă adresă e refuzată.
- În prototip nu se trimite niciun email. Pe ecranul „Check your inbox” apeși **Open the sign-in link** și ești logat.
- Personalul Biroului Erasmus se loghează cu o adresă `@upt.ro`, de exemplu `erasmus.office@upt.ro`, și ajunge direct în panoul de admin.

### 2. Materiile tale
- Alegi semestrul în care vrei să pleci (Fall 2027 sau Spring 2028).
- Bifezi materiile pe care vrei să le echivalezi. Implicit sunt bifate toate.
- Apeși **Find my matches**. Le poți schimba oricând din Profil → Edit.

### 3. Harta (globul)
- **Trage globul** cu mouse-ul sau cu degetul ca să-l rotești. Dacă îi dai drumul în mișcare, continuă să se rotească puțin.
- **Zoom:** rotița mouse-ului pe laptop, ciupit cu două degete pe telefon.
- **Culorile punctelor:** verde înseamnă potrivire bună (cel puțin 60% din materii), portocaliu parțială, gri slabă.
- **Treci cu mouse-ul** peste un punct ca să vezi scorul. **Dă click** pe el ca să deschizi universitatea.
- Lista de dedesubt (pe laptop, în dreapta) e sortată după potrivire. Poți filtra după țară sau schimba semestrul.

### 4. Pagina universității
- Scorul mare (de exemplu **5/6**) și câte ECTS acoperă.
- Pentru fiecare materie de la UPT vezi cursul de la partener, eticheta **Good / Partial / No match** și de ce s-a făcut potrivirea (ce teme au în comun și ce lipsește).
- Jos ai lista cu toate cursurile partenerului din semestrul ales.
- Butoanele: **Add to shortlist** și **Compare**.

### 5. Compară, Caută, Shortlist
- **Compare:** 2–3 universități una lângă alta (scor, ECTS, limbă, locuri, grupa de cost Erasmus+, materii neacoperite).
- **Search:** cauți un curs după nume sau temă în toate cataloagele, de exemplu „android” sau „machine learning”.
- **Shortlist:** cel mult 3 universități, ordonate cu săgețile, în ordinea în care le treci pe formularul de candidatură.

### 6. „I got accepted to Erasmus”
- Din **Profil** apeși **I got accepted to Erasmus**.
- Alegi universitatea, datele de început și de sfârșit și încarci scrisoarea de acceptare. În prototip fișierul nu pleacă de pe dispozitiv, se păstrează doar numele lui.
- Cererea ajunge la Biroul Erasmus cu starea **Waiting**.

### 7. Panoul de admin (Biroul Erasmus)
- Te loghezi cu o adresă `@upt.ro`.
- Vezi cererile, cu filtre (Waiting / Confirmed / Rejected / All), și le aprobi sau le respingi. La respingere e obligatoriu un motiv, pe care îl vede studentul.
- Scrisorile se marchează ca șterse după decizie.
- Cererile cu eticheta **Example** sunt date demo, ca panoul să nu fie gol.

### 8. Modul Călătorie
- După confirmare, la următoarea deschidere apare animația: globul zboară, se desenează arcul Timișoara → destinație și apare salutul în limba țării („Boa viagem!”). Interfața devine aurie.
- **Today:** câte zile mai sunt până la plecare, confirmarea și următoarele 3 sarcini.
- **Timeline:** etapele (Before departure, Arrival, During, Before return, After return), cu termene calculate din datele tale. Bifezi ce ai făcut și poți adăuga sarcini proprii.

### Confidențialitate
- Din Profil → **Privacy & my data** vezi ce se păstrează. Tot de acolo îți poți **șterge datele** sau **reseta tot demo-ul**.
- Aplicația nu cere niciodată CNP, serie de buletin sau număr de pașaport.

---

## Demo de 3 minute (pentru pitch)

1. Deschide linkul pe laptop. Arată pagina de prezentare și trage globul.
2. **Sign in** cu `ana.popescu@student.upt.ro` → Open the sign-in link.
3. Lasă bifate cele 6 materii → **Find my matches**.
4. Pe hartă: Setúbal iese pe primul loc cu **5/6**. Trage globul, fă zoom, dă click pe Setúbal.
5. Arată o potrivire **Good** cu explicația și una **No match** („Take it at UPT”). Apasă **Add to shortlist**, apoi **Compare** și alege Saxion și St. Pölten.
6. **Profile → I got accepted to Erasmus** → alege IPS Setúbal, încarcă un PDF oarecare → **Send to Erasmus Office**.
7. Ca să arăți și partea de admin: Sign out → logare cu `erasmus.office@upt.ro` → **Approve** → Sign out → logare din nou ca Ana. *Varianta rapidă:* butonul **Demo: approve as Erasmus Office** din Profil.
8. Animația „Boa viagem!” → **Start my journey** → Today și Timeline.

Înainte de pitch: Profile → Privacy & my data → **Reset the whole demo**, ca să pornești de la zero.

---

## Cum funcționează potrivirea

Fiecare curs, de la UPT și de la parteneri, are o listă de **teme** (de exemplu „SQL”, „Transactions”). Pentru fiecare materie de la UPT, aplicația caută cel mai bun curs al partenerului din semestrul ales. Scorul se calculează așa:

- **75% conținut:** câte dintre temele materiei UPT apar și la cursul partenerului;
- **25% ECTS:** 100 dacă diferența e de cel mult 1 ECTS, 70 dacă e de cel mult 2, altfel 40.

Pragurile sunt: **Good** de la 75 în sus, **Partial** între 60 și 74, **No match** sub 60. Scorul universității e numărul de materii Good din total (de exemplu 5/6). La egalitate câștigă universitatea care acoperă mai multe ECTS.

Codul e în `js/match.js`. Pasul următor e ca un model AI să extragă temele direct din planul de învățământ și din cataloagele partenerilor (PDF sau site). Formula de scor rămâne aceeași.

---

## Ce e demo și ce ar trebui făcut real

| În prototip | În versiunea reală |
|---|---|
| Datele sunt salvate în browser (`localStorage`), deci fiecare dispozitiv are datele lui | O bază de date (de exemplu Supabase) |
| Logarea e simulată, fără email | Link de logare pe email sau „Sign in with Microsoft”, doar pentru `@student.upt.ro` |
| Scrisoarea de acceptare nu se încarcă nicăieri | Upload securizat, vizibil doar Biroului Erasmus, șters după decizie |
| Universități, cursuri și termene inventate | Partenerii reali ai facultății, cataloagele lor și termenele Biroului Erasmus |
| Temele sunt scrise de mână | Extrase cu AI din planuri de învățământ și cataloage |

---

## Cum rulezi aplicația local

Aplicația nu are nevoie de build, nici de `npm install`. E doar HTML, CSS și JavaScript.

```bash
git clone https://github.com/PavelCsako/PoliGo.git
cd PoliGo
python3 -m http.server 8000
# deschide http://localhost:8000
```

Merge și cu extensia **Live Server** din VS Code. Dacă deschizi direct `index.html` din folder (`file://`), aplicația **nu merge**: browserul blochează încărcarea modulelor și a hărții.

Ca să intri pe aplicație de pe telefon când rulează local: telefonul și laptopul în același Wi-Fi, apoi `http://IP-ul-laptopului:8000`.

---

## Cum o publici pe GitHub Pages (link pentru laptop și telefon)

1. Pe GitHub, în repo: **Settings → Pages**.
2. La **Build and deployment → Source** alege **Deploy from a branch**.
3. Alege branch-ul **main** și folderul **/ (root)**, apoi **Save**.
4. După 1–2 minute, aplicația e pe **https://pavelcsako.github.io/PoliGo/**. Orice push nou pe `main` o actualizează automat.

Pe telefon poți folosi **Add to Home Screen**: aplicația se deschide ca o aplicație normală, cu iconița PoliGo.

---

## Structura proiectului

```
index.html              pagina de start; încarcă CSS, d3 și js/main.js
manifest.webmanifest    iconița și numele pentru „Add to Home Screen”
css/app.css             tot designul (tema dark, culori, layout pentru telefon și laptop)
js/main.js              router (#/map, #/uni/…, #/admin …) și bara de navigare
js/state.js             starea aplicației, salvată în browser
js/data.js              DATELE DEMO: materii UPT, universități, cursuri, teme, termene
js/match.js             potrivirea materiilor și căutarea
js/globe.js             globul pe canvas: tras, zoom, click, arcul animat
js/ui.js                iconițe, logo, formatare date
js/views/*.js           ecranele: landing, auth, explore, profile, journey, admin
data/countries.geo.json granițele țărilor (domeniu public)
vendor/                 d3-geo și d3-array (desenarea globului)
assets/                 logo și iconițe
```

---

## Cum schimbi datele

Toate datele sunt în **`js/data.js`**.

- **O universitate nouă:** adaugă un obiect în `UNIVERSITIES` cu `id`, `name`, `short`, `city`, `country`, `cc` (codul din 2 litere), `iso3` (codul din 3 litere, pentru conturul țării pe glob), `lon`, `lat`, `language`, `places`, `costGroup`, `greeting` (salutul în limba țării) și `courses`.
- **Un curs:** `c('Nume curs', ECTS, 'fall' | 'spring' | 'both', ['tema1', 'tema2'])`. Temele trebuie să existe în `TOPICS`.
- **Materiile UPT:** în `PROGRAMS.cti.courses.fall` și `.spring`.
- **Termenele din calendar:** în `TIMELINE`. `from` poate fi `S` (început), `A` (sosire) sau `E` (sfârșit), iar `days` e decalajul în zile.
- **Etichetele de pe glob se suprapun?** Ajustează `LABEL_POS` în `js/views/explore.js`.

---

## Pași următori

1. Partenerii reali ai facultății AC și cataloagele lor.
2. Logare reală cu Supabase (link pe email, doar `@student.upt.ro`) și o bază de date comună, ca adminul să vadă cererile tuturor.
3. Extragerea temelor cu AI din PDF-urile cu planuri de învățământ și cataloage.
4. Scannerul de documente din modul Călătorie și chatul cu birourile Erasmus.

---

## Credite

- Hărți: [world.geo.json](https://github.com/johan/world.geo.json), date Natural Earth, domeniu public (`data/COUNTRIES-UNLICENSE.txt`).
- [d3-geo și d3-array](https://d3js.org), licența ISC (`vendor/LICENSE-d3.txt`).
- Font: [Inter](https://rsms.me/inter/), prin Google Fonts, licența SIL Open Font License.
- PoliGo nu e un serviciu oficial al UPT.
