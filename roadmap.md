# Automatisk mejlavisering
## Integritet och cookie-banner
- [x] Lägg till gemensam bottenbanner, sparade analysval och återöppningsbara inställningar.
- [x] Lägg till integritetssida med faktisk lagring och leverantörer.
- [x] Verifiera banner och val i webbläsaren; acceptera, neka och återöppna fungerar efter omladdning på dator och mobil.

## Mejlavisering
- [x] Skicka adminnotis när kunden skapar ett ärende.
- [x] Skicka färdigmeddelande endast till kunder som valt det, utan dubbla utskick.
- [x] Kontrollera Resend-avsändare och tester; 20 tester passerar och offentlig portal/inloggning är kontrollerad.
- [ ] Verifiera projekt.frilansnorr.se i Resend (väntar på användarens DNS-poster).
- [ ] Testa verkligt kundärende och färdigmejl efter domänverifiering (utskick stoppas av Resend; autentiserade kontroller saknas för extern Supabase).