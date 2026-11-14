import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/integritet")({
  head: () => ({ meta: [
    { title: "Integritet & kakor – Frilans Norr Projektportal" },
    { name: "description", content: "Information om personuppgifter, bilagor och nödvändig lagring i Frilans Norrs projektportal." },
    { property: "og:title", content: "Integritet & kakor – Frilans Norr Projektportal" },
    { property: "og:description", content: "Så hanteras ärenden, bilagor och e-postadresser i projektportalen." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Privacy,
});

function Privacy() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12 text-foreground">
      <Button asChild variant="link" className="mb-8 px-0"><Link to="/"><ArrowLeft /> Till projektportalen</Link></Button>
      <h1 className="text-3xl sm:text-4xl">Integritet & kakor</h1>
      <p className="mt-4 text-muted-foreground">Frilans Norrs projektportal · Uppdaterad 14 november 2026</p>
      <div className="mt-10 space-y-8 leading-relaxed">
        <section><h2 className="mb-3 text-xl">Dina projekt och ärenden</h2><p>Frilans Norr hanterar uppgifterna du lämnar för att administrera ditt projekt och utföra uppdraget. Det kan vara namn, ärendetext, bilder och PDF-dokument. Om du ber om ett färdigmeddelande används din e-postadress för den aviseringen. Lägg inte in känsliga personuppgifter i ärenden eller bilagor.</p></section>
        <section><h2 className="mb-3 text-xl">Lagring och leverantörer</h2><p>Projekt, ärenden och bilagor lagras i Supabase. E-postaviseringar skickas genom Resend. Bilagornas direktlänkar kan öppnas av den som har länken; dela därför inte sådana länkar med obehöriga. Vi använder inte dina ärendeuppgifter för marknadsföring.</p><p className="mt-3">Typsnitt hämtas från Google Fonts. När de hämtas får Google tekniska anslutningsuppgifter, exempelvis IP-adressen.</p></section>
        <section><h2 className="mb-3 text-xl">Nödvändig lagring</h2><p>Administratörens webbläsare sparar en inloggningsuppgift lokalt för att behålla inloggningen vid omladdning. Den tas bort vid utloggning. Kundens projektkod hålls i minnet under besöket och sparas inte lokalt.</p><p className="mt-3">Tidigare sparade analysval kan finnas kvar i din webbläsare och respekteras fortfarande. Portalen visar inte längre någon samtyckesbanner och sparar inga nya analysval.</p></section>
        <section><h2 className="mb-3 text-xl">Kontakt och dina rättigheter</h2><p>Kontakta Frilans Norr på <a href="mailto:sten@frilansnorr.se" className="text-primary underline">sten@frilansnorr.se</a> för frågor om behandlingen, lagringstid för dina projektuppgifter eller för att begära tillgång, rättelse, radering eller begränsning. Vilka rättigheter som gäller beror på behandlingen och eventuella skyldigheter att behålla uppgifter. Du kan också lämna klagomål till Integritetsskyddsmyndigheten (IMY).</p></section>
      </div>
    </main>
  );
}