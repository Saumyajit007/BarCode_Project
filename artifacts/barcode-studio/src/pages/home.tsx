import { useRef, useState, useEffect, useCallback } from "react";
import JsBarcode from "jsbarcode";
import { Html5Qrcode } from "html5-qrcode";

/* ─── Types ─────────────────────────────────────────────── */

type BarcodeFormat =
  | "CODE128"
  | "EAN13"
  | "EAN8"
  | "UPC"
  | "CODE39"
  | "ITF14"
  | "MSI"
  | "pharmacode";

interface FormatOption {
  value: BarcodeFormat;
  label: string;
  example: string;
  description: string;
  numericOnly: boolean;
  fixedLength?: number;
}

/* ─── Format Options ─────────────────────────────────────── */

const FORMAT_OPTIONS: FormatOption[] = [
  {
    value: "CODE128",
    label: "CODE 128",
    example: "HELLO-123",
    description: "Alphanumeric, any length",
    numericOnly: false,
  },
  {
    value: "EAN13",
    label: "EAN-13",
    example: "9780201379624",
    description: "13 digits (international products)",
    numericOnly: true,
    fixedLength: 13,
  },
  {
    value: "EAN8",
    label: "EAN-8",
    example: "96385074",
    description: "8 digits (small products)",
    numericOnly: true,
    fixedLength: 8,
  },
  {
    value: "UPC",
    label: "UPC-A",
    example: "012345678905",
    description: "12 digits (North America)",
    numericOnly: true,
    fixedLength: 12,
  },
  {
    value: "CODE39",
    label: "CODE 39",
    example: "CODE-39",
    description: "Alphanumeric + special chars",
    numericOnly: false,
  },
  {
    value: "ITF14",
    label: "ITF-14",
    example: "12345678901231",
    description: "14 digits (shipping containers)",
    numericOnly: true,
    fixedLength: 14,
  },
  {
    value: "MSI",
    label: "MSI",
    example: "123456789",
    description: "Numeric (inventory tracking)",
    numericOnly: true,
  },
  {
    value: "pharmacode",
    label: "Pharmacode",
    example: "1234",
    description: "Numeric, 3-131072 range",
    numericOnly: true,
  },
];

/* ─── Icons (inline SVG) ─────────────────────────────────── */

function BarCodeIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5v14M7 5v14M11 5v14M15 5v14M19 5v14" />
      <path d="M1 3h22M1 21h22" opacity="0.4" />
    </svg>
  );
}

function ScanIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}

function DownloadIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function CopyIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function StopIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}

function MoonIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

/* ─── Helpers ────────────────────────────────────────────── */

function formatLabel(fmt: BarcodeFormat): string {
  return FORMAT_OPTIONS.find((f) => f.value === fmt)?.label ?? fmt;
}

function validateInput(value: string, format: BarcodeFormat): string | null {
  if (!value.trim()) return "Please enter a value to generate a barcode.";
  const opt = FORMAT_OPTIONS.find((f) => f.value === format);
  if (!opt) return null;
  if (opt.numericOnly && !/^\d+$/.test(value)) {
    return `${opt.label} only accepts numeric digits.`;
  }
  if (opt.fixedLength && value.length !== opt.fixedLength) {
    return `${opt.label} requires exactly ${opt.fixedLength} digits (got ${value.length}).`;
  }
  return null;
}

/* ─── Component ──────────────────────────────────────────── */

export default function Home() {
  /* ── Generator state ── */
  const [inputValue, setInputValue] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<BarcodeFormat>("CODE128");
  const [barcodeGenerated, setBarcodeGenerated] = useState(false);
  const [generatorError, setGeneratorError] = useState<string | null>(null);
  const [generatedValue, setGeneratedValue] = useState("");
  const [copiedGenerated, setCopiedGenerated] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  /* ── Scanner state ── */
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scannedResults, setScannedResults] = useState<Array<{ value: string; time: string }>>([]);
  const [copiedScanned, setCopiedScanned] = useState<number | null>(null);
  const [scannerReady, setScannerReady] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = "qr-reader";

  /* ── Dark mode ── */
  const [darkMode, setDarkMode] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  /* ── Format option ── */
  const currentFormatOption = FORMAT_OPTIONS.find((f) => f.value === selectedFormat)!;

  /* ────────────────────────────────────────────
     BARCODE GENERATION
  ──────────────────────────────────────────── */

  const generateBarcode = useCallback(() => {
    const err = validateInput(inputValue, selectedFormat);
    if (err) {
      setGeneratorError(err);
      setBarcodeGenerated(false);
      return;
    }
    setGeneratorError(null);

    try {
      if (!svgRef.current) return;
      JsBarcode(svgRef.current, inputValue, {
        format: selectedFormat,
        lineColor: darkMode ? "#e2e8f0" : "#1e1b4b",
        background: "transparent",
        width: 2.2,
        height: 90,
        displayValue: true,
        fontOptions: "500",
        font: "Inter, system-ui, sans-serif",
        fontSize: 14,
        textMargin: 6,
        margin: 16,
        valid: (valid) => {
          if (!valid) {
            setGeneratorError("The input is not valid for this barcode format.");
            setBarcodeGenerated(false);
          }
        },
      });
      setBarcodeGenerated(true);
      setGeneratedValue(inputValue);
    } catch (e: unknown) {
      setGeneratorError(
        e instanceof Error ? e.message : "Failed to generate barcode. Check your input."
      );
      setBarcodeGenerated(false);
    }
  }, [inputValue, selectedFormat, darkMode]);

  /* Regenerate on dark-mode toggle if a barcode is already showing */
  useEffect(() => {
    if (barcodeGenerated && svgRef.current) {
      try {
        JsBarcode(svgRef.current, generatedValue, {
          format: selectedFormat,
          lineColor: darkMode ? "#e2e8f0" : "#1e1b4b",
          background: "transparent",
          width: 2.2,
          height: 90,
          displayValue: true,
          fontOptions: "500",
          font: "Inter, system-ui, sans-serif",
          fontSize: 14,
          textMargin: 6,
          margin: 16,
        });
      } catch (_) { /* ignore */ }
    }
  }, [darkMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const downloadSVG = useCallback(() => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob(
      [`<?xml version="1.0" encoding="UTF-8"?>\n${svgData}`],
      { type: "image/svg+xml;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `barcode-${generatedValue}-${selectedFormat}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generatedValue, selectedFormat]);

  const copyGenerated = useCallback(async () => {
    if (!generatedValue) return;
    await navigator.clipboard.writeText(generatedValue);
    setCopiedGenerated(true);
    setTimeout(() => setCopiedGenerated(false), 2000);
  }, [generatedValue]);

  /* ────────────────────────────────────────────
     BARCODE SCANNER
  ──────────────────────────────────────────── */

  const startScanner = useCallback(async () => {
    setScannerError(null);
    setScannerReady(false);

    /* Check camera permission */
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
    } catch {
      setScannerError(
        "Camera access was denied. Please allow camera permissions in your browser and try again."
      );
      return;
    }

    setScannerActive(true);

    /* Short delay so the DOM renders the scanner div first */
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode(scannerDivId);
        scannerRef.current = html5QrCode;

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          setScannerError("No cameras found on this device.");
          setScannerActive(false);
          return;
        }

        /* Prefer back camera on mobile */
        const camera =
          cameras.find((c) =>
            c.label.toLowerCase().includes("back") ||
            c.label.toLowerCase().includes("rear") ||
            c.label.toLowerCase().includes("environment")
          ) ?? cameras[0];

        await html5QrCode.start(
          camera.id,
          {
            fps: 12,
            qrbox: { width: 280, height: 120 },
            aspectRatio: 1.6,
          },
          (decodedText) => {
            const time = new Date().toLocaleTimeString();
            setScannedResults((prev) => {
              /* Deduplicate consecutive duplicates */
              if (prev.length > 0 && prev[0].value === decodedText) return prev;
              return [{ value: decodedText, time }, ...prev.slice(0, 9)];
            });
          },
          undefined /* error callback — suppress console noise */
        );

        setScannerReady(true);
      } catch (err: unknown) {
        setScannerError(
          err instanceof Error
            ? err.message
            : "Failed to start camera. Check your permissions."
        );
        setScannerActive(false);
        scannerRef.current = null;
      }
    }, 200);
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (_) { /* ignore */ }
      scannerRef.current = null;
    }
    setScannerActive(false);
    setScannerReady(false);
  }, []);

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const copyScanned = useCallback(async (value: string, idx: number) => {
    await navigator.clipboard.writeText(value);
    setCopiedScanned(idx);
    setTimeout(() => setCopiedScanned(null), 2000);
  }, []);

  const clearScannedResults = useCallback(() => {
    setScannedResults([]);
  }, []);

  /* ── Keyboard: Enter to generate ── */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") generateBarcode();
    },
    [generateBarcode]
  );

  /* ────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <BarCodeIcon className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight leading-none">Barcode Studio</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Generate &amp; Scan barcodes instantly</p>
            </div>
          </div>
          <button
            onClick={() => setDarkMode((d) => !d)}
            className="w-9 h-9 rounded-lg border border-border hover:bg-muted transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ═══════════════════════════════════════
              LEFT: GENERATOR
          ════════════════════════════════════════ */}
          <section className="flex flex-col gap-4">
            <div className="bg-card border border-card-border rounded-2xl shadow-sm p-6 flex flex-col gap-5">

              {/* Section title */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarCodeIcon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Generate Barcode</h2>
                  <p className="text-xs text-muted-foreground">Enter text or numbers to create a barcode</p>
                </div>
              </div>

              {/* Format selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Barcode Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FORMAT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSelectedFormat(opt.value);
                        setGeneratorError(null);
                        setBarcodeGenerated(false);
                      }}
                      className={`
                        relative text-left px-3 py-2.5 rounded-xl border text-xs transition-all duration-150
                        ${selectedFormat === opt.value
                          ? "bg-primary text-primary-foreground border-transparent shadow-sm font-medium"
                          : "border-border bg-background hover:border-primary/40 hover:bg-primary/5 text-foreground"
                        }
                      `}
                    >
                      <span className="font-medium block">{opt.label}</span>
                      <span className={`block mt-0.5 ${selectedFormat === opt.value ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {opt.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div className="space-y-1.5">
                <label htmlFor="barcode-input" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Barcode Value
                </label>
                <div className="relative">
                  <input
                    id="barcode-input"
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      setGeneratorError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={`e.g. ${currentFormatOption.example}`}
                    className={`
                      w-full px-4 py-3 rounded-xl border text-sm bg-background
                      placeholder:text-muted-foreground/60
                      focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                      transition-all duration-150
                      ${generatorError ? "border-destructive/60 focus:ring-destructive/30 focus:border-destructive" : "border-input"}
                    `}
                  />
                  {currentFormatOption.numericOnly && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                      {currentFormatOption.fixedLength ? `${currentFormatOption.fixedLength} digits` : "numeric"}
                    </span>
                  )}
                </div>
                {generatorError && (
                  <div className="flex items-start gap-2 text-destructive text-xs mt-1.5 bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2">
                    <AlertIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{generatorError}</span>
                  </div>
                )}
              </div>

              {/* Generate button */}
              <button
                onClick={generateBarcode}
                className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium text-sm
                  shadow-sm hover:opacity-90 active:scale-[0.99] transition-all duration-150
                  focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
              >
                Generate Barcode
              </button>
            </div>

            {/* Barcode output card */}
            <div className={`
              bg-card border rounded-2xl shadow-sm transition-all duration-300
              ${barcodeGenerated ? "border-card-border opacity-100" : "border-border/40 opacity-60"}
            `}>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {barcodeGenerated ? `${formatLabel(selectedFormat)} barcode` : "Barcode Preview"}
                  </span>
                  {barcodeGenerated && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                      Ready
                    </span>
                  )}
                </div>

                {/* SVG container — SVG is always mounted so svgRef is always valid */}
                <div className={`
                  relative min-h-[140px] rounded-xl border-2 border-dashed transition-colors overflow-hidden
                  ${barcodeGenerated ? "border-border bg-background/60" : "border-border/30 bg-muted/20"}
                `}>
                  {/* Placeholder overlay — visible only before generation */}
                  <div className={`
                    absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-200
                    ${barcodeGenerated ? "opacity-0" : "opacity-100"}
                  `}>
                    <div className="text-center py-6">
                      <BarCodeIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground/60">Your barcode will appear here</p>
                    </div>
                  </div>

                  {/* SVG is always in DOM — ref never detaches */}
                  <div className={`w-full px-4 py-2 transition-opacity duration-200 ${barcodeGenerated ? "opacity-100" : "opacity-0"}`}>
                    <svg ref={svgRef} className="w-full" />
                  </div>
                </div>

                {/* Action buttons */}
                {barcodeGenerated && (
                  <div className="flex gap-2">
                    <button
                      onClick={downloadSVG}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border
                        bg-background hover:bg-muted text-sm font-medium transition-all duration-150
                        hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <DownloadIcon className="w-4 h-4" />
                      Download SVG
                    </button>
                    <button
                      onClick={copyGenerated}
                      className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border
                        bg-background hover:bg-muted text-sm font-medium transition-all duration-150
                        hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      title="Copy barcode value"
                    >
                      {copiedGenerated ? (
                        <CheckIcon className="w-4 h-4 text-accent" />
                      ) : (
                        <CopyIcon className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">
                        {copiedGenerated ? "Copied!" : "Copy"}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════
              RIGHT: SCANNER
          ════════════════════════════════════════ */}
          <section className="flex flex-col gap-4">
            <div className="bg-card border border-card-border rounded-2xl shadow-sm p-6 flex flex-col gap-5">

              {/* Section title */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <ScanIcon className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Scan Barcode</h2>
                  <p className="text-xs text-muted-foreground">Use your camera to read barcodes live</p>
                </div>
              </div>

              {/* Camera viewport */}
              <div className={`
                relative overflow-hidden rounded-xl border-2 transition-all duration-300 bg-black/90
                ${scannerActive ? "border-accent/60 shadow-md" : "border-border/40"}
              `}
                style={{ minHeight: 220 }}
              >
                {/* Scanner target div (always rendered when active) */}
                <div
                  id={scannerDivId}
                  className={scannerActive ? "w-full" : "hidden"}
                />

                {/* Overlay scan-line effect when active */}
                {scannerActive && scannerReady && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Corner brackets */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative w-64 h-20">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-accent rounded-tl-sm" />
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-accent rounded-tr-sm" />
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-accent rounded-bl-sm" />
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-accent rounded-br-sm" />
                        {/* Scanning line */}
                        <div className="absolute left-1 right-1 h-0.5 bg-accent/70 blur-[0.5px] scan-line" style={{ top: 0 }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Placeholder when scanner is inactive */}
                {!scannerActive && (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center">
                      <ScanIcon className="w-7 h-7 text-muted-foreground/40" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground/60">Camera is off</p>
                      <p className="text-xs text-muted-foreground/40 mt-0.5">Click "Start Scanner" to begin</p>
                    </div>
                  </div>
                )}

                {/* Loading indicator */}
                {scannerActive && !scannerReady && !scannerError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10 rounded-xl">
                    <div className="text-center text-white space-y-2">
                      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                      <p className="text-xs text-white/70">Starting camera…</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Scanner error */}
              {scannerError && (
                <div className="flex items-start gap-2 text-destructive text-xs bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2.5">
                  <AlertIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{scannerError}</span>
                </div>
              )}

              {/* Start / Stop button */}
              {!scannerActive ? (
                <button
                  onClick={startScanner}
                  className="w-full py-3 px-4 bg-accent text-accent-foreground rounded-xl font-medium text-sm
                    shadow-sm hover:opacity-90 active:scale-[0.99] transition-all duration-150
                    focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2
                    flex items-center justify-center gap-2"
                >
                  <ScanIcon className="w-4 h-4" />
                  Start Scanner
                </button>
              ) : (
                <button
                  onClick={stopScanner}
                  className="w-full py-3 px-4 bg-destructive text-destructive-foreground rounded-xl font-medium text-sm
                    shadow-sm hover:opacity-90 active:scale-[0.99] transition-all duration-150
                    focus:outline-none focus:ring-2 focus:ring-destructive/50 focus:ring-offset-2
                    flex items-center justify-center gap-2"
                >
                  <StopIcon className="w-4 h-4" />
                  Stop Scanner
                </button>
              )}
            </div>

            {/* Scanned results card */}
            <div className="bg-card border border-card-border rounded-2xl shadow-sm flex flex-col overflow-hidden" style={{ minHeight: 160 }}>
              <div className="px-5 py-4 flex items-center justify-between border-b border-border/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Scan Results</span>
                  {scannedResults.length > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {scannedResults.length}
                    </span>
                  )}
                </div>
                {scannedResults.length > 0 && (
                  <button
                    onClick={clearScannedResults}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {scannedResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center gap-2 px-4">
                    <div className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center">
                      <ScanIcon className="w-5 h-5 text-muted-foreground/30" />
                    </div>
                    <p className="text-xs text-muted-foreground/50">No barcodes scanned yet</p>
                    <p className="text-[11px] text-muted-foreground/35">Results will appear here live</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border/40">
                    {scannedResults.map((result, idx) => (
                      <li
                        key={`${result.value}-${result.time}`}
                        className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors ${idx === 0 ? "result-pulse" : ""}`}
                      >
                        {/* Index badge */}
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>

                        {/* Value & time */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{result.value}</p>
                          <p className="text-[10px] text-muted-foreground">{result.time}</p>
                        </div>

                        {/* Copy button */}
                        <button
                          onClick={() => copyScanned(result.value, idx)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted border border-transparent
                            hover:border-border transition-all shrink-0 text-muted-foreground hover:text-foreground"
                          title="Copy to clipboard"
                        >
                          {copiedScanned === idx ? (
                            <CheckIcon className="w-3.5 h-3.5 text-accent" />
                          ) : (
                            <CopyIcon className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* ── Info bar ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "8 Formats", desc: "CODE128, EAN, UPC, CODE39 & more" },
            { label: "SVG Export", desc: "Crisp, scalable vector graphics" },
            { label: "Live Scanning", desc: "Real-time camera barcode detection" },
          ].map(({ label, desc }) => (
            <div key={label} className="bg-card border border-card-border rounded-xl px-4 py-3 flex items-center gap-3 shadow-xs">
              <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
              <div>
                <p className="text-xs font-semibold">{label}</p>
                <p className="text-[11px] text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center py-6 text-[11px] text-muted-foreground/50">
        Barcode Studio — All processing happens locally in your browser. No data is sent to any server.
      </footer>
    </div>
  );
}
