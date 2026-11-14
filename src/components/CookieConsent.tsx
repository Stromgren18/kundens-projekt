import { Link } from "@tanstack/react-router";

export function CookieConsent() {
  return (
      <footer className="border-t border-border bg-background px-6 py-4 text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
          <Link to="/integritet" className="underline underline-offset-4 hover:text-foreground">Integritet & kakor</Link>
        </div>
      </footer>
  );
}