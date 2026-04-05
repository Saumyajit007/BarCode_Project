import { useRef, useState, useEffect, useCallback } from "react";
import JsBarcode from "jsbarcode";

/* ─── Types ──────────────────────────────────────────────── */

type BarcodeFormat = "CODE128" | "EAN13" | "EAN8";

interface FormatOption {
  value: BarcodeFormat;
  label: string;
  example: string;
  hint: string;
  numericOnly: boolean;
  fixedLength?: number;
}

/* ─── Format config ──────────────────────────────────────── */

const FORMATS: FormatOption[] = [
  {
    value: "CODE128",
    label: "CODE 128",
    example: "HELLO-123",
    hint: "Any text or numbers",
    numericOnly: false,
  },
  {
    value: "EAN13",
    label: "EAN-13",
    example: "9780201379624",
    hint: "Exactly 13 digits",
    numericOnly: true,
    fixedLength: 13,
  },
  {
    value: "EAN8",
    label: "EAN-8",
    example: "96385074",
    hint: "Exactly 8 digits",
    numericOnly: true,
    fixedLength: 8,
  },
];

/* ─── Icons ──────────────────────────────────────────────── */

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

/* ─── Helpers ────────────────────────────────────────────── */

function validate(value: string, format: BarcodeFormat): string | null {
  if (!value.trim()) return "Enter a value to generate a barcode.";
  const opt = FORMATS.find((f) => f.value === format)!;
  if (opt.numericOnly && !/^\d+$/.test(value))
    return `${opt.label} only accepts digits (0–9).`;
  if (opt.fixedLength && value.length !== opt.fixedLength)
    return `${opt.label} needs exactly ${opt.fixedLength} digits (got ${value.length}).`;
  return null;
}

/* ─── Component ──────────────────────────────────────────── */

export default function Generate({ darkMode }: { darkMode: boolean }) {
  const [inputValue, setInputValue] = useState("");
  const [format, setFormat] = useState<BarcodeFormat>("CODE128");
  const [showText, setShowText] = useState(true);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedValue, setSavedValue] = useState("");
  const [copied, setCopied] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const currentOpt = FORMATS.find((f) => f.value === format)!;

  /* Core JsBarcode call — extracted so it can be reused */
  const renderBarcode = useCallback(
    (value: string, fmt: BarcodeFormat, displayValue: boolean, dark: boolean) => {
      if (!svgRef.current) return false;
      try {
        JsBarcode(svgRef.current, value, {
          format: fmt,
          lineColor: dark ? "#e2e8f0" : "#1e1b4b",
          background: "transparent",
          width: 2.2,
          height: 88,
          displayValue,
          fontOptions: "500",
          font: "Inter, system-ui, sans-serif",
          fontSize: 14,
          textMargin: 6,
          margin: 16,
        });
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  /* Generate on button click */
  const handleGenerate = useCallback(() => {
    const err = validate(inputValue, format);
    if (err) {
      setError(err);
      setGenerated(false);
      return;
    }
    setError(null);
    const ok = renderBarcode(inputValue, format, showText, darkMode);
    if (ok) {
      setGenerated(true);
      setSavedValue(inputValue);
    } else {
      setError("Failed to generate — check your input matches the format.");
      setGenerated(false);
    }
  }, [inputValue, format, showText, darkMode, renderBarcode]);

  /* Re-render live when toggles change */
  useEffect(() => {
    if (generated && savedValue) {
      renderBarcode(savedValue, format, showText, darkMode);
    }
  }, [darkMode, showText]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Download SVG */
  const downloadSVG = () => {
    if (!svgRef.current) return;
    const data = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${data}`], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `barcode-${savedValue}-${format}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* Copy value */
  const copyValue = async () => {
    if (!savedValue) return;
    await navigator.clipboard.writeText(savedValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-5 px-4 py-5 max-w-lg mx-auto w-full">

      {/* Format picker */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Format</p>
        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setFormat(opt.value); setError(null); setGenerated(false); }}
              className={`
                px-3 py-3 rounded-2xl border text-left transition-all duration-150 active:scale-[0.97]
                ${format === opt.value
                  ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                  : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
                }
              `}
            >
              <span className="block text-xs font-semibold">{opt.label}</span>
              <span className={`block text-[10px] mt-0.5 leading-tight ${format === opt.value ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {opt.hint}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Value</p>
        <input
          type={currentOpt.numericOnly ? "number" : "text"}
          inputMode={currentOpt.numericOnly ? "numeric" : "text"}
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setError(null); }}
          onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          placeholder={`e.g. ${currentOpt.example}`}
          className={`
            w-full px-4 py-3.5 rounded-2xl border text-sm bg-card
            placeholder:text-muted-foreground/50
            focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
            transition-all duration-150 appearance-none
            ${error ? "border-destructive/60 focus:ring-destructive/30" : "border-input"}
          `}
        />
        {error && (
          <div className="flex items-start gap-2 text-destructive text-xs bg-destructive/8 border border-destructive/20 rounded-xl px-3 py-2.5">
            <AlertIcon />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Show text toggle */}
      <label className="flex items-center gap-3 cursor-pointer select-none bg-card border border-border rounded-2xl px-4 py-3">
        <div className="relative shrink-0">
          <input
            type="checkbox"
            checked={showText}
            onChange={(e) => setShowText(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 rounded-full border-2 border-border bg-muted transition-colors duration-200
            peer-checked:bg-primary peer-checked:border-primary" />
          <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200
            peer-checked:translate-x-5" />
        </div>
        <div className="flex-1">
          <span className="text-sm font-medium">Show text below barcode</span>
          <p className="text-xs text-muted-foreground mt-0.5">
            {showText ? "Value is printed under the bars" : "Bars only, no text label"}
          </p>
        </div>
      </label>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-semibold text-sm
          shadow-sm active:scale-[0.98] transition-all duration-150
          focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
      >
        Generate Barcode
      </button>

      {/* Barcode preview — SVG always in DOM */}
      <div className={`
        bg-card border rounded-2xl overflow-hidden transition-all duration-300
        ${generated ? "border-card-border shadow-sm" : "border-border/40 opacity-60"}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-0">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {generated ? `${currentOpt.label} Barcode` : "Preview"}
          </span>
          {generated && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Ready
            </span>
          )}
        </div>

        {/* Barcode area */}
        <div className="relative min-h-[160px] flex items-center justify-center p-4">
          {/* Placeholder */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 transition-opacity duration-200 ${generated ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
            <div className="flex gap-px items-end h-12">
              {[3,6,4,8,5,7,3,9,4,6,5,8,4,7,3,6,5].map((h, i) => (
                <div key={i} className="w-1 bg-muted-foreground/20 rounded-full" style={{ height: `${h * 5}px` }} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground/50">Your barcode appears here</p>
          </div>

          {/* Always-mounted SVG */}
          <div className={`w-full transition-opacity duration-200 ${generated ? "opacity-100" : "opacity-0"}`}>
            <svg ref={svgRef} className="w-full" />
          </div>
        </div>

        {/* Action buttons */}
        {generated && (
          <div className="flex gap-2 px-4 pb-4">
            <button
              onClick={downloadSVG}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border
                bg-background hover:bg-muted text-sm font-medium transition-all active:scale-[0.98]"
            >
              <DownloadIcon />
              Download SVG
            </button>
            <button
              onClick={copyValue}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-border
                bg-background hover:bg-muted text-sm font-medium transition-all active:scale-[0.98]"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
