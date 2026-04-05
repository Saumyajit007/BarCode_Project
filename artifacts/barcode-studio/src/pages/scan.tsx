import { useRef, useState, useEffect, useCallback } from "react";

/* ─── Polyfill BarcodeDetector for Firefox/Safari ───────── */
async function ensureBarcodeDetector(): Promise<boolean> {
  if (!("BarcodeDetector" in window)) {
    try {
      await import("barcode-detector");
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

/* ─── Types ──────────────────────────────────────────────── */

interface ScanResult {
  value: string;
  time: string;
  format: string;
}

const SUPPORTED_FORMATS = [
  "aztec", "code_128", "code_39", "code_93", "codabar",
  "data_matrix", "ean_13", "ean_8", "itf", "pdf417",
  "qr_code", "upc_a", "upc_e",
];

/* ─── Icons ──────────────────────────────────────────────── */

function CopyIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
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
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
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
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function TorchIcon({ on }: { on: boolean }) {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6l-2 4h-4l-2 4h4l-2 6 10-10h-4l2-4z" />
    </svg>
  );
}

function FlipIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3l4 4-4 4" /><path d="M20 7H4" /><path d="M8 21l-4-4 4-4" /><path d="M4 17h16" />
    </svg>
  );
}

/* ─── Component ──────────────────────────────────────────── */

export default function Scan() {
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [copied, setCopied] = useState<number | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [imageResult, setImageResult] = useState<ScanResult | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageScanning, setImageScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const detectorRef = useRef<InstanceType<typeof BarcodeDetector> | null>(null);
  const lastValueRef = useRef<string>("");
  const lastTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Add result with rate-limiting (1 s per unique value) ── */
  const addResult = useCallback((value: string, fmt: string) => {
    const now = Date.now();
    if (value === lastValueRef.current && now - lastTimeRef.current < 1000) return;
    lastValueRef.current = value;
    lastTimeRef.current = now;
    const time = new Date().toLocaleTimeString();
    setResults((prev) => [{ value, time, format: fmt }, ...prev.slice(0, 49)]);
  }, []);

  /* ── Scan loop ── */
  const scanLoop = useCallback(async () => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video || !detector) return;

    if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      try {
        const barcodes = await detector.detect(video);
        if (barcodes.length > 0) {
          addResult(barcodes[0].rawValue, barcodes[0].format);
        }
      } catch {
        /* decode errors on individual frames are normal */
      }
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  }, [addResult]);

  /* ── Start camera ── */
  const start = useCallback(async () => {
    setError(null);
    setReady(false);
    setActive(true);
    setTorchAvailable(false);

    const supported = await ensureBarcodeDetector();
    if (!supported) {
      setUnsupported(true);
      setActive(false);
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
    } catch (err) {
      const msg = (err instanceof Error ? err.message : "").toLowerCase();
      if (msg.includes("permission") || msg.includes("denied") || msg.includes("notallowed")) {
        setError("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (msg.includes("notfound") || msg.includes("device")) {
        setError("No camera found on this device.");
      } else {
        setError("Could not start the camera. Make sure nothing else is using it.");
      }
      setActive(false);
      return;
    }

    /* Check torch support */
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const caps = videoTrack.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
      if (caps?.torch) setTorchAvailable(true);
    }

    /* Build detector with only formats the browser supports */
    let formats: string[];
    try {
      const native = await (window.BarcodeDetector as typeof BarcodeDetector).getSupportedFormats();
      formats = SUPPORTED_FORMATS.filter((f) => native.includes(f));
      if (formats.length === 0) formats = ["code_128", "ean_13", "ean_8", "qr_code"];
    } catch {
      formats = ["code_128", "ean_13", "ean_8", "qr_code"];
    }

    detectorRef.current = new (window.BarcodeDetector as typeof BarcodeDetector)({ formats });
    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play();
        setReady(true);
        rafRef.current = requestAnimationFrame(scanLoop);
      };
    }
  }, [facingMode, scanLoop]);

  /* ── Stop camera ── */
  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    detectorRef.current = null;
    lastValueRef.current = "";
    setActive(false);
    setReady(false);
    setTorchOn(false);
    setTorchAvailable(false);
  }, []);

  /* ── Toggle torch ── */
  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch { /* torch not supported */ }
  }, [torchOn]);

  /* ── Flip camera ── */
  const flip = useCallback(async () => {
    const next: "environment" | "user" = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    if (active) { stop(); setTimeout(() => start(), 100); }
  }, [facingMode, active, stop, start]);

  /* ── Scan from image file ── */
  const scanFromFile = useCallback(async (file: File) => {
    setImageResult(null);
    setImageError(null);
    setImageScanning(true);

    const supported = await ensureBarcodeDetector();
    if (!supported) { setImageError("BarcodeDetector not supported in this browser."); setImageScanning(false); return; }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      try {
        let formats: string[];
        try {
          const native = await (window.BarcodeDetector as typeof BarcodeDetector).getSupportedFormats();
          formats = SUPPORTED_FORMATS.filter((f) => native.includes(f));
        } catch { formats = ["code_128", "ean_13", "ean_8", "qr_code"]; }

        const detector = new (window.BarcodeDetector as typeof BarcodeDetector)({ formats });
        const barcodes = await detector.detect(img);

        if (barcodes.length > 0) {
          const { rawValue, format } = barcodes[0];
          const result = { value: rawValue, time: new Date().toLocaleTimeString(), format };
          setImageResult(result);
          setResults((prev) => [result, ...prev.slice(0, 49)]);
        } else {
          setImageError("No barcode found in this image. Make sure the barcode is clear and unobstructed.");
        }
      } catch {
        setImageError("Failed to scan the image. Try a clearer photo.");
      } finally {
        URL.revokeObjectURL(url);
        setImageScanning(false);
      }
    };

    img.onerror = () => {
      setImageError("Could not load the image file.");
      URL.revokeObjectURL(url);
      setImageScanning(false);
    };

    img.src = url;
  }, []);

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /* Copy result */
  const copyResult = async (value: string, idx: number) => {
    await navigator.clipboard.writeText(value);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  /* ── Render ── */
  return (
    <div className="flex flex-col gap-4 px-4 py-5 max-w-lg mx-auto w-full">

      {/* Unsupported browser banner */}
      {unsupported && (
        <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400 text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3">
          <AlertIcon />
          <span>Your browser doesn't support barcode detection. Please use Chrome, Edge, or Samsung Internet for camera scanning.</span>
        </div>
      )}

      {/* Camera viewport */}
      <div className={`
        relative overflow-hidden rounded-3xl border-2 transition-all duration-300 bg-black
        ${active ? "border-accent/60 shadow-lg shadow-accent/10" : "border-border/30"}
      `} style={{ aspectRatio: "4/3" }}>

        <video
          ref={videoRef}
          playsInline muted autoPlay
          className="absolute inset-0 w-full h-full object-cover"
          style={{ display: active ? "block" : "none" }}
        />

        {/* Inactive state */}
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

        {/* Scan frame + animated line */}
        {active && ready && (
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-64 h-20">
                {/* Corner brackets */}
                {[
                  "top-0 left-0 border-t border-l rounded-tl",
                  "top-0 right-0 border-t border-r rounded-tr",
                  "bottom-0 left-0 border-b border-l rounded-bl",
                  "bottom-0 right-0 border-b border-r rounded-br",
                ].map((cls, i) => (
                  <div key={i} className={`absolute w-6 h-6 border-accent ${cls}`} style={{ borderWidth: 3 }} />
                ))}
                {/* Animated scan line */}
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent scan-line" />
              </div>
            </div>
            <p className="absolute bottom-3 inset-x-0 text-center text-[11px] text-white/50 tracking-wide">
              Hold steady — point at a barcode
            </p>
          </div>
        )}

        {/* Last scanned flash */}
        {results.length > 0 && active && (
          <div className="absolute top-3 inset-x-3 z-20">
            <div className="bg-black/75 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-xs text-white font-medium truncate">{results[0].value}</span>
              <span className="text-[10px] text-white/40 shrink-0 uppercase">{results[0].format}</span>
            </div>
          </div>
        )}

        {/* Camera controls overlay (torch + flip) */}
        {active && ready && (
          <div className="absolute bottom-10 right-3 z-20 flex flex-col gap-2">
            {torchAvailable && (
              <button
                onClick={toggleTorch}
                className={`w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-sm border transition-colors
                  ${torchOn ? "bg-yellow-400/80 border-yellow-300 text-black" : "bg-black/40 border-white/10 text-white/70"}`}
                title="Toggle flashlight"
              >
                <TorchIcon on={torchOn} />
              </button>
            )}
            <button
              onClick={flip}
              className="w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-sm bg-black/40 border border-white/10 text-white/70"
              title="Flip camera"
            >
              <FlipIcon />
            </button>
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

      {/* Scan from image */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border/50">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Scan from Image</p>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">Upload a photo of a barcode to decode it.</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) scanFromFile(f); e.target.value = ""; }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={imageScanning}
            className="w-full py-3 border-2 border-dashed border-border hover:border-accent hover:bg-accent/5
              rounded-xl text-sm font-medium text-muted-foreground hover:text-accent transition-all
              flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {imageScanning
              ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Scanning…</>
              : <><ImageIcon />Choose Image</>
            }
          </button>

          {imageResult && (
            <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 truncate">{imageResult.value}</p>
                <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500/70 uppercase">{imageResult.format}</p>
              </div>
              <button
                onClick={() => copyResult(imageResult.value, -1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shrink-0"
              >
                {copied === -1 ? <CheckIcon /> : <CopyIcon />}
              </button>
            </div>
          )}

          {imageError && (
            <div className="flex items-start gap-2 text-destructive text-xs bg-destructive/8 border border-destructive/20 rounded-xl px-3 py-2.5">
              <AlertIcon />
              <span>{imageError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Results list */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Scan History</p>
            {results.length > 0 && (
              <span className="min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {results.length}
              </span>
            )}
          </div>
          {results.length > 0 && (
            <button
              onClick={() => { setResults([]); setImageResult(null); }}
              className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg"
              title="Clear all"
            >
              <TrashIcon />
            </button>
          )}
        </div>

        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground/40">
              <CameraIcon />
            </div>
            <p className="text-sm text-muted-foreground/50">No scans yet</p>
            <p className="text-xs text-muted-foreground/35">Camera and image scans appear here</p>
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
                  <p className="text-[10px] text-muted-foreground uppercase">{r.format} · {r.time}</p>
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
    </div>
  );
}
