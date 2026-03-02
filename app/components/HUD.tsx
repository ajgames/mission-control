import { cn } from "~/utils";

/*
 * 📡 The HUD (Heads-Up Display)
 * ────────────────────────────────────────────
 * Overlaid on the viewport like a Post-it note
 * from the universe. Pure HTML/CSS floating above
 * the Three.js canvas because sometimes the best
 * tech is the simplest tech.
 *
 * If you're adding new readouts, remember:
 * every good cockpit tells a story.
 * What story does YOUR readout tell?
 */

export function HUD() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* ─── top bar ─── */}
      <div className="flex items-center justify-between px-8 pt-6">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          <span className="font-mono text-xs tracking-widest text-emerald-400/80 uppercase">
            Systems Nominal
          </span>
        </div>
        <h1
          className={cn(
            "font-mono text-lg tracking-[0.3em] text-white/90 uppercase",
            "drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
          )}
        >
          Mission Control
        </h1>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs tracking-widest text-cyan-400/80 uppercase">
            Orbit Stable
          </span>
          <div className="h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
        </div>
      </div>

      {/* ─── left readouts ─── */}
      <div className="absolute top-1/2 left-8 -translate-y-1/2 space-y-4">
        <Readout label="ALT" value="340.2" unit="km" />
        <Readout label="VEL" value="7.66" unit="km/s" />
        <Readout label="FUEL" value="87" unit="%" />
      </div>

      {/* ─── right readouts ─── */}
      <div className="absolute top-1/2 right-8 -translate-y-1/2 space-y-4 text-right">
        <Readout label="LAT" value="28.524" unit="°N" align="right" />
        <Readout label="LON" value="-80.65" unit="°W" align="right" />
        <Readout label="COM" value="CH-07" align="right" />
      </div>

      {/* ─── bottom status bar ─── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <div
          className={cn(
            "flex items-center gap-6 rounded-full",
            "border border-white/10 bg-black/30 px-6 py-2 backdrop-blur-sm"
          )}
        >
          <StatusDot color="emerald" label="NAV" />
          <StatusDot color="cyan" label="COMMS" />
          <StatusDot color="amber" label="THERM" />
          <StatusDot color="emerald" label="O₂" />
        </div>
      </div>

      {/* ─── corner brackets (that sci-fi framing everyone loves) ─── */}
      <CornerBracket position="top-left" />
      <CornerBracket position="top-right" />
      <CornerBracket position="bottom-left" />
      <CornerBracket position="bottom-right" />
    </div>
  );
}

function Readout({
  label,
  value,
  unit,
  align = "left",
}: {
  label: string;
  value: string;
  unit?: string;
  align?: "left" | "right";
}) {
  return (
    <div className={cn("font-mono", align === "right" && "text-right")}>
      <div className="text-[10px] tracking-[0.2em] text-white/40 uppercase">
        {label}
      </div>
      <div className="text-sm text-white/80">
        {value}
        {unit && (
          <span className="ml-1 text-[10px] text-white/40">{unit}</span>
        )}
      </div>
    </div>
  );
}

function StatusDot({
  color,
  label,
}: {
  color: "emerald" | "cyan" | "amber";
  label: string;
}) {
  const colorMap = {
    emerald: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]",
    cyan: "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]",
    amber: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]",
  };

  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-2 w-2 rounded-full", colorMap[color])} />
      <span className="text-[10px] tracking-widest text-white/50 uppercase">
        {label}
      </span>
    </div>
  );
}

function CornerBracket({
  position,
}: {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}) {
  const posClass = {
    "top-left": "top-16 left-16",
    "top-right": "top-16 right-16",
    "bottom-left": "bottom-16 left-16",
    "bottom-right": "bottom-16 right-16",
  }[position];

  const borderClass = {
    "top-left": "border-t border-l",
    "top-right": "border-t border-r",
    "bottom-left": "border-b border-l",
    "bottom-right": "border-b border-r",
  }[position];

  return (
    <div
      className={cn(
        "absolute h-8 w-8 border-white/20",
        posClass,
        borderClass
      )}
    />
  );
}
