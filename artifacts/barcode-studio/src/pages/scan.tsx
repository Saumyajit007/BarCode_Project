import { useRef, useState, useEffect, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

/* ─── Types ──────────────────────────────────────────────── */

interface ScanResult {
  value: string;
  time: string;
  format: string;
}

/* ─── BarcodeDetector type shim (not yet in TS lib) ──────── */

interface BarcodeDetectorBarcode {
  rawValue: string;
  format: string;
}

interface BarcodeDetectorInstance {
  detect(image: HTMLVideoElement): Promise<BarcodeDetectorBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats: string[] }): BarcodeDetectorInstance;
  getSupportedFormats(): Promise<string[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

/* ─── Icons ──────────────────────────────────────────────── */

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

function CameraIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
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

function TrashIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

/* ─── Component ──────────────────────────────────────────── */

export default function Scan() {
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [copied, setCopied] = useState<number | null>(null);
  const [method, setMethod] = useState<"native" | "html5qr" | null>(null);

  /* Native BarcodeDetector refs */
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const lastValueRef = useRef<string>("");

  /* html5-qrcode fallback ref */
  const html5Ref = useRef<Html5Qrcode | null>(null);

  /* ── Add a result (deduplicated) ── */
  const addResult = useCallback((value: string, fmt: string) => {
    if (value === lastValueRef.current) return;
    lastValueRef.current = value;
    const time = new Date().toLocaleTimeString();
    setResults((prev) => [{ value, time, format: fmt }, ...prev.slice(0, 19)]);
    /* Reset dedup after 2 s so same barcode can be scanned again */
    setTimeout(() => { lastValueRef.current = ""; }, 2000);
  }, []);

  /* ── Native BarcodeDetector scan loop ── */
  const nativeScanLoop = useCallback(async () => {
    if (!videoRef.current || !detectorRef.current) return;
    if (videoRef.current.readyState >= 2) {
      try {
        const barcodes = await detectorRef.current.detect(videoRef.current);
        if (barcodes.length > 0) {
          addResult(barcodes[0].rawValue, barcodes[0].format);
        }
      } catch { /* frame decode errors are normal */ }
    }
    rafRef.current = requestAnimationFrame(nativeScanLoop);
  }, [addResult]);

  /* ── Start scanner ── */
  const start = useCallback(async () => {
    setError(null);
    setReady(false);
    setActive(true);

    /* Camera permission check */
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied")) {
        setError("Camera permission denied. Please allow camera access in your browser settings and try again.");
      } else if (msg.toLowerCase().includes("found") || msg.toLowerCase().includes("device")) {
        setError("No camera found on this device.");
      } else {
        setError("Could not start camera. Make sure no other app is using it.");
      }
      setActive(false);
      return;
    }

    /* Try native BarcodeDetector first (Chrome/Edge/Android) */
    if (window.BarcodeDetector) {
      try {
        const supported = await window.BarcodeDetector.getSupportedFormats();
        const formats = ["code_128", "ean_13", "ean_8", "qr_code"].filter((f) =>
          supported.includes(f)
        );
        detectorRef.current = new window.BarcodeDetector({ formats: formats.length ? formats : ["code_128", "ean_13", "ean_8"] });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setReady(true);
            setMethod("native");
            rafRef.current = requestAnimationFrame(nativeScanLoop);
          };
        }
        return;
      } catch {
        /* BarcodeDetector failed, fall through to html5-qrcode */
        stream.getTracks().forEach((t) => t.stop());
      }
    }

    /* Fallback: html5-qrcode ── */
    stream.getTracks().forEach((t) => t.stop()); /* html5-qrcode manages its own stream */
    setMethod("html5qr");

    /* Small delay so the qr-reader div is rendered */
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader-div");
        html5Ref.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 12,
            qrbox: { width: 280, height: 120 },
            aspectRatio: 1.6,
            formatsToSupport: [
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.QR_CODE,
            ],
          },
          (text, result) => {
            addResult(text, result?.result?.format?.formatName ?? "unknown");
          },
          undefined
        );
        setReady(true);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to start scanner. Check camera permissions."
        );
        setActive(false);
        html5Ref.current = null;
      }
    }, 150);
  }, [addResult, nativeScanLoop]);

  /* ── Stop scanner ── */
  const stop = useCallback(async () => {
    cancelAnimationFrame(rafRef.current);

    /* Stop native stream */
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    detectorRef.current = null;

    /* Stop html5-qrcode */
    if (html5Ref.current) {
      try {
        await html5Ref.current.stop();
        html5Ref.current.clear();
      } catch { /* ignore */ }
      html5Ref.current = null;
    }

    setActive(false);
    setReady(false);
    setMethod(null);
    lastValueRef.current = "";
  }, []);

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      html5Ref.current?.stop().catch(() => {});
    };
  }, []);

  /* Copy a result */
  const copyResult = async (value: string, idx: number) => {
    await navigator.clipboard.writeText(value);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  /* ── Render ── */
  return (
    <div className="flex flex-col gap-5 px-4 py-5 max-w-lg mx-auto w-full">

      {/* Camera viewport */}
      <div className={`
        relative overflow-hidden rounded-3xl border-2 transition-all duration-300 bg-black
        ${active ? "border-accent/60 shadow-lg" : "border-border/30"}
      `} style={{ minHeight: 260, aspectRatio: "16/10" }}>

        {/* Native video element */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover ${method === "native" ? "block" : "hidden"}`}
        />

        {/* html5-qrcode fallback container */}
        <div
          id="qr-reader-div"
          className={`absolute inset-0 w-full h-full ${method === "html5qr" ? "block" : "hidden"}`}
        />

        {/* Inactive placeholder */}
        {!active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30">
              <CameraIcon />
            </div>
            <div className="text-center">
              <p className="text-sm text-white/40">Camera is off</p>
              <p className="text-xs text-white/25 mt-0.5">Tap "Start Scanner" to begin</p>
            </div>
          </div>
        )}

        {/* Loading spinner */}
        {active && !ready && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 z-10">
            <div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-xs text-white/60">Starting camera…</p>
          </div>
        )}

        {/* Scanning overlay (native only) */}
        {method === "native" && ready && (
          <div className="absolute inset-0 pointer-events-none z-10">
            {/* Darkened corners */}
            <div className="absolute inset-0 bg-black/20" />
            {/* Finder brackets */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-72 h-24">
                <div className="absolute top-0 left-0 w-7 h-7 border-t-3 border-l-3 border-accent rounded-tl" style={{ borderWidth: 3 }} />
                <div className="absolute top-0 right-0 w-7 h-7 border-t-3 border-r-3 border-accent rounded-tr" style={{ borderWidth: 3 }} />
                <div className="absolute bottom-0 left-0 w-7 h-7 border-b-3 border-l-3 border-accent rounded-bl" style={{ borderWidth: 3 }} />
                <div className="absolute bottom-0 right-0 w-7 h-7 border-b-3 border-r-3 border-accent rounded-br" style={{ borderWidth: 3 }} />
                {/* Scan line */}
                <div className="absolute inset-x-2 h-0.5 bg-accent/80 blur-[0.5px] scan-line" style={{ top: 0 }} />
              </div>
            </div>
            <p className="absolute bottom-3 inset-x-0 text-center text-[11px] text-white/50">
              Point at a barcode
            </p>
          </div>
        )}

        {/* Last scanned flash */}
        {results.length > 0 && active && (
          <div className="absolute top-3 inset-x-3 z-20">
            <div className="bg-black/70 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-xs text-white font-medium truncate">{results[0].value}</span>
              <span className="text-[10px] text-white/40 shrink-0">{results[0].format}</span>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-destructive text-xs bg-destructive/8 border border-destructive/20 rounded-2xl px-4 py-3">
          <AlertIcon />
          <span>{error}</span>
        </div>
      )}

      {/* Start / Stop button */}
      {!active ? (
        <button
          onClick={start}
          className="w-full py-4 bg-accent text-accent-foreground rounded-2xl font-semibold text-sm
            shadow-sm active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2
            focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2"
        >
          <CameraIcon />
          Start Scanner
        </button>
      ) : (
        <button
          onClick={stop}
          className="w-full py-4 bg-destructive text-destructive-foreground rounded-2xl font-semibold text-sm
            shadow-sm active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2"
        >
          <StopIcon />
          Stop Scanner
        </button>
      )}

      {/* Results list */}
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Scan History</p>
            {results.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {results.length}
              </span>
            )}
          </div>
          {results.length > 0 && (
            <button
              onClick={() => setResults([])}
              className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg"
              title="Clear all"
            >
              <TrashIcon />
            </button>
          )}
        </div>

        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center">
              <CameraIcon />
            </div>
            <p className="text-sm text-muted-foreground/50">No scans yet</p>
            <p className="text-xs text-muted-foreground/35">Scanned values appear here live</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40 max-h-72 overflow-y-auto">
            {results.map((r, idx) => (
              <li key={`${r.value}-${r.time}-${idx}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.value}</p>
                  <p className="text-[10px] text-muted-foreground">{r.format} · {r.time}</p>
                </div>
                <button
                  onClick={() => copyResult(r.value, idx)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted border border-transparent
                    hover:border-border transition-all text-muted-foreground hover:text-foreground shrink-0"
                  title="Copy"
                >
                  {copied === idx ? <CheckIcon /> : <CopyIcon />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Method indicator (dev info) */}
      {active && ready && method && (
        <p className="text-center text-[10px] text-muted-foreground/40">
          Scanner: {method === "native" ? "Native BarcodeDetector" : "html5-qrcode"} · pointing rear camera
        </p>
      )}
    </div>
  );
}
