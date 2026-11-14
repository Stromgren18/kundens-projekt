import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { needsAnswer, onConsentChange, readChoice, saveChoices, type Choice } from "@/lib/consent";

export function CookieConsent() {
  const [banner, setBanner] = useState(false);
  const [settings, setSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [gpc, setGpc] = useState(false);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    const sync = () => {
      setAnalytics(readChoice("analytics") === "granted");
      setGpc((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true);
      void needsAnswer(["analytics"]).then((needed) => { if (active) setBanner(needed); });
    };
    sync();
    const unsubscribe = onConsentChange(sync);
    return () => { active = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    if (banner || settings) panel.current?.focus({ preventScroll: true });
  }, [banner, settings]);

  const save = (choice: Choice) => {
    saveChoices({ analytics: choice });
    setBanner(false);
    setSettings(false);
  };
  const openSettings = () => {
    setAnalytics(readChoice("analytics") === "granted");
    setSettings(true);
  };

  return (
    <>
      <footer className="border-t border-border bg-background px-6 py-4 text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
          <Link to="/integritet" className="underline underline-offset-4 hover:text-foreground">Integritet & kakor</Link>
          <Button variant="link" className="h-auto p-0 text-muted-foreground" onClick={openSettings}>Cookieinställningar</Button>
        </div>
      </footer>
      {(banner || settings) && (
        <section ref={panel} tabIndex={-1} role="region" aria-label={settings ? "Cookieinställningar" : "Dina integritetsval"}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto border-t-4 border-primary bg-card text-card-foreground shadow-lg outline-none">
          <div className="mx-auto max-w-5xl px-6 py-5 sm:py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-6 shrink-0 text-primary" aria-hidden="true" />
                <h2 className="text-lg sm:text-xl">{settings ? "Cookieinställningar" : "Din integritet"}</h2>
              </div>
              {settings && <Button variant="ghost" size="icon" aria-label="Stäng cookieinställningar" title="Stäng" onClick={() => setSettings(false)}><X /></Button>}
            </div>
            {settings ? (
              <>
                <div className="mt-4 flex items-center justify-between gap-4 border-b border-border py-3">
                  <div><p className="font-semibold">Nödvändiga</p><p className="text-sm text-muted-foreground">Sparar ditt integritetsval och håller administratören inloggad.</p></div>
                  <span className="shrink-0 text-sm font-semibold">Alltid på</span>
                </div>
                <div className="flex items-center justify-between gap-4 py-4">
                  <div><label htmlFor="consent-analytics" className="font-semibold">Analys, tillhandahålls av Lovable</label><p className="text-sm text-muted-foreground">Mäter klick utan kakor. Besök räknas även om du nekar.</p></div>
                  <Switch id="consent-analytics" checked={analytics && !gpc} disabled={gpc} onCheckedChange={setAnalytics} />
                </div>
                {gpc && <p className="mb-4 text-sm text-muted-foreground">Din webbläsares integritetssignal gäller. Frivillig analys är avstängd.</p>}
                <Button onClick={() => save(analytics && !gpc ? "granted" : "denied")}>Spara inställningar</Button>
              </>
            ) : (
              <>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed">Vi räknar besök utan kakor. Om du accepterar mäter vi också klick. Nödvändig lagring håller administratören inloggad och sparar ditt val.</p>
                <Link to="/integritet" className="mt-2 inline-block text-sm text-primary underline underline-offset-4">Läs om integritet & kakor</Link>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
                    <Button variant="outline" className="h-11 min-w-0 px-4 sm:min-w-40" onClick={() => save("granted")}>Acceptera alla</Button>
                    <Button variant="outline" className="h-11 min-w-0 px-4 sm:min-w-40" onClick={() => save("denied")}>Neka alla</Button>
                  </div>
                  <Button variant="link" className="px-0 sm:px-4" onClick={openSettings}>Cookieinställningar</Button>
                </div>
              </>
            )}
          </div>
        </section>
      )}
    </>
  );
}