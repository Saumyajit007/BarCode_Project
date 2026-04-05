import { Switch, Route, Router as WouterRouter, Link, useLocation, Redirect } from "wouter";
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Generate from "@/pages/generate";
import Scan from "@/pages/scan";

/* ─── Icons ──────────────────────────────────────────────── */

function BarcodeIcon({ filled }: { filled?: boolean }) {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5v14M7 5v14M11 5v14M15 5v14M19 5v14" />
      <path d="M1 3h22M1 21h22" opacity={filled ? 0.7 : 0.4} />
    </svg>
  );
}

function ScanIcon({ filled }: { filled?: boolean }) {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

/* ─── Bottom Tab Bar ─────────────────────────────────────── */

function TabBar() {
  const [location] = useLocation();
  const isGenerate = location === "/generate" || location === "/";
  const isScan = location === "/scan";

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-card/90 backdrop-blur-md border-t border-border safe-bottom">
      <div className="max-w-lg mx-auto flex">
        <Link
          href="/generate"
          className={`
            relative flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors duration-150
            ${isGenerate ? "text-primary" : "text-muted-foreground hover:text-foreground"}
          `}
        >
          <BarcodeIcon filled={isGenerate} />
          <span className="text-[10px] font-semibold tracking-wide">Generate</span>
          {isGenerate && (
            <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-primary" />
          )}
        </Link>

        <div className="w-px bg-border/50 my-2" />

        <Link
          href="/scan"
          className={`
            relative flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors duration-150
            ${isScan ? "text-accent" : "text-muted-foreground hover:text-foreground"}
          `}
        >
          <ScanIcon filled={isScan} />
          <span className="text-[10px] font-semibold tracking-wide">Scan</span>
          {isScan && (
            <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-accent" />
          )}
        </Link>
      </div>
    </nav>
  );
}

/* ─── Header ─────────────────────────────────────────────── */

function Header({ darkMode, onToggle }: { darkMode: boolean; onToggle: () => void }) {
  const [location] = useLocation();
  const isGenerate = location === "/generate" || location === "/";

  return (
    <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border shadow-xs">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            {isGenerate
              ? <BarcodeIcon filled />
              : <ScanIcon filled />
            }
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight leading-none text-foreground">Barcode Studio</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {isGenerate ? "Generate barcodes instantly" : "Scan barcodes with your camera"}
            </p>
          </div>
        </div>
        <button
          onClick={onToggle}
          aria-label="Toggle dark mode"
          className="w-9 h-9 rounded-xl border border-border hover:bg-muted flex items-center justify-center
            text-muted-foreground hover:text-foreground transition-colors"
        >
          {darkMode ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  );
}

/* ─── App ────────────────────────────────────────────────── */

function AppInner() {
  const [darkMode, setDarkMode] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header darkMode={darkMode} onToggle={() => setDarkMode((d) => !d)} />

      {/* Page content — padded at bottom for tab bar */}
      <main className="pb-24">
        <Switch>
          <Route path="/">
            <Redirect to="/generate" />
          </Route>
          <Route path="/generate">
            <Generate darkMode={darkMode} />
          </Route>
          <Route path="/scan">
            <Scan />
          </Route>
        </Switch>
      </main>

      <TabBar />
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AppInner />
      </WouterRouter>
    </TooltipProvider>
  );
}
