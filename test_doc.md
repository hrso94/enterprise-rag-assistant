# API Dokumentacija - Primjer

## Što je API?
API (Application Programming Interface) je skup pravila koja omogućava komunikaciju između različitih softverskih aplikacija.

## Vrste API-ja
1. REST API - koristi HTTP protokol
2. GraphQL API - fleksibilan format upita
3. SOAP API - baziran na XML-u
4. WebSocket API - za real-time komunikaciju

## REST API Endpoints

### GET /users
Vraća listu svih korisnika.
Parametri: page, limit
Odgovor: JSON niz objekata korisnika

### POST /users
Kreira novog korisnika.
Parametri: name, email, password
Odgovor: Kreirani korisnik s ID-om

### GET /users/:id
Vraća specifičnog korisnika po ID-u.
Parametri: id
Odgovor: JSON objekat korisnika

### PUT /users/:id
Ažurira specifičnog korisnika.
Parametri: id, name, email
Odgovor: Ažurirani korisnik

### DELETE /users/:id
Briše specifičnog korisnika.
Parametri: id
Odgovor: Potvrda brisanja

## Autentifikacija
API koristi JWT tokene za autentifikaciju.
1. Korisnik se prijavi sa userna
93 x 15
1 Hidden Terminal
Savršeno! 10MB je odličan limit. Kreiram RAG sistem s CLI interfejsom gdje korisnik može učitati dokument i odmah pitati agenta.

Kreiram RAG sistem s potrebnim bibliotekama. Trebam razmotriti verzije - koristim stabilne verzije LangChain-a:

npm install
Sada ću testirati aplikaciju i stvoriti test dokument:

node test.js
✅ Sistem radi perfektno! Sada pokrenimo glavni CLI:

timeout 5 npm start || true
cd /Users/medakhrv/Projects/ai_agent && npm start &
sleep 2
kill %1 2>/dev/null || true
Savršeno! ✅ Sistem je sada gotov! Evo što sam napravio:

🎯 Što je Kreirano
me i password
2. Sustav vraća JWT token
3. Token se koristi u Authorization header-u za sve sljedeće zahtjeve

## Error Handling
- 400: Bad Request - greške u parametrima
- 401: Unauthorized - korisnik nije autentificiran
- 403: Forbidden - korisnik nema pristupa resursu
- 404: Not Found - resurs ne postoji
- 500: Server Error - greška na serveru

## Rate Limiting
API ima limitaciju od 1000 zahtjeva po satu.
Brojač se resetira svakog punog sata.
