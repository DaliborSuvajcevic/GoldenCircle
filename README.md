# The Golden Circle · aplikacija

Mobilna veb aplikacija koja na jednom mestu spaja alate The Golden Circle:
disciplinu (Process), trading (kalkulator rizika, sesije, dnevnik) i proizvode brenda.

Adresa: https://daliborsuvajcevic.github.io/GoldenCircle/

## Podaci
- Sopstvena podešavanja: `localStorage["gc:v1"]` (tema, beta mesta, kalkulator).
- Process: čita i piše `process:day:YYYY-MM-DD` u istom formatu kao repo Process.
- Golden Trading Journal: samo čita `gtj:v2`.
- Sve ostaje u pretraživaču korisnika. Nema servera.

Povezivanje sa Process i Journal radi jer su svi alati na istoj adresi (daliborsuvajcevic.github.io).

## Fajlovi
- `index.html`, `styles.css`, `app.js`: aplikacija
- `legal.html`: uslovi korišćenja i politika privatnosti (nacrt, čeka pravnu proveru)
- `crown.png`: originalni logo
