import { Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { useI18n, type Lang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { Moon, Sun, Globe } from "lucide-react";

export function Navbar() {
  const { t, lang, setLang } = useI18n();
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("ndahari.theme");
    const isDark = stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("ndahari.theme", next ? "dark" : "light");
  };

  const dashHref = roles.includes("admin") ? "/admin" : roles.includes("employer") ? "/employer" : "/employee";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="hover:opacity-80 transition">
          <Logo />
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/" className="hover:text-primary transition">{t("nav.home")}</Link>
          <Link to="/browse" className="hover:text-primary transition">{t("nav.browse")}</Link>
          {user && (
            <Link to={dashHref} className="hover:text-primary transition">{t("nav.dashboard")}</Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Globe className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="pl-7 pr-2 py-1.5 text-sm rounded-md bg-secondary text-secondary-foreground border border-border cursor-pointer"
            >
              <option value="en">EN</option>
              <option value="fr">FR</option>
              <option value="rw">RW</option>
            </select>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md bg-secondary hover:bg-accent transition"
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {user ? (
            <button
              onClick={async () => { await signOut(); navigate({ to: "/" }); }}
              className="px-3 py-1.5 text-sm rounded-md bg-secondary hover:bg-accent transition"
            >{t("nav.signout")}</button>
          ) : (
            <Link
              to="/auth"
              className="px-4 py-1.5 text-sm font-medium rounded-md gradient-hero text-primary-foreground shadow-elegant hover:opacity-90 transition"
            >{t("nav.getstarted")}</Link>
          )}
        </div>
      </div>
    </header>
  );
}
