import { cn } from "~/utils";

/*
 * 📡 The HUD (Heads-Up Display)
 * ────────────────────────────────────────────
 * Overlaid on the viewport like a Post-it note
 * from the universe. Pure HTML/CSS floating above
 * the Three.js canvas because sometimes the best
 * tech is the simplest tech.
 *
 * Two faces:
 *   🚶 CABIN HUD — mission readouts, orbit data, system status
 *   🚀 HELM HUD  — flight instruments, velocity vector, control hints
 *
 * If you're adding new readouts, remember:
 * every good cockpit tells a story.
 * What story does YOUR readout tell?
 */

export function HUD({
  locked,
  navMode,
  isMobile = false,
}: {
  locked: boolean;
  navMode?: boolean;
  isMobile?: boolean;
}) {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🚀 HELM HUD — flight instruments
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (navMode) {
    return (
      <div className="pointer-events-none absolute inset-0 z-10">
        {/* ─── helm mode banner ─── */}
        <div className="flex items-center justify-center pt-6">
          <div
            className={cn(
              "rounded border border-cyan-400/30 bg-black/50 px-6 py-2 backdrop-blur-sm",
              "shadow-[0_0_20px_rgba(34,211,238,0.15)]"
            )}
          >
            <span className="font-mono text-xs tracking-[0.4em] text-cyan-400 uppercase">
              ⟐ Helm Active ⟐
            </span>
          </div>
        </div>

        {/* ─── crosshair — your heading indicator ─── */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          {/* center dot */}
          <div className="h-1.5 w-1.5 rounded-full bg-cyan-400/60 shadow-[0_0_6px_rgba(34,211,238,0.4)]" />
          {/* horizontal ticks */}
          <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2">
            <div className="absolute -left-6 top-0 h-px w-3 bg-cyan-400/40" />
            <div className="absolute left-4 top-0 h-px w-3 bg-cyan-400/40" />
            <div className="absolute -top-6 left-0 h-3 w-px bg-cyan-400/40" />
            <div className="absolute top-4 left-0 h-3 w-px bg-cyan-400/40" />
          </div>
        </div>

        {/* ─── left panel — thrust & velocity ─── */}
        <div className="absolute top-1/2 left-8 -translate-y-1/2 space-y-5">
          <div className="space-y-1">
            <div className="font-mono text-[10px] tracking-[0.2em] text-cyan-400/50 uppercase">
              Thrust
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 w-20 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cyan-400/70 shadow-[0_0_6px_rgba(34,211,238,0.5)]"
                  style={{ width: "0%", transition: "width 0.2s" }}
                />
              </div>
            </div>
          </div>
          <Readout label="VEL" value="0.00" unit="m/s" />
          <Readout label="HDG" value="000" unit="°" />
          <Readout label="PITCH" value="0.0" unit="°" />
        </div>

        {/* ─── right panel — ship systems ─── */}
        <div className="absolute top-1/2 right-8 -translate-y-1/2 space-y-5 text-right">
          <Readout label="ROLL" value="0.0" unit="°" align="right" />
          <Readout label="ALT" value="340.2" unit="km" align="right" />
          <Readout label="FUEL" value="87" unit="%" align="right" />
          <Readout label="HULL" value="100" unit="%" align="right" />
        </div>

        {/* ─── bottom control hints ─── */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <div
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg",
              "border border-white/10 bg-black/40 px-8 py-3 backdrop-blur-sm"
            )}
          >
            <div className="flex items-center gap-6">
              <HelmKey label="W" desc="FWD" />
              <HelmKey label="S" desc="REV" />
              <HelmKey label="A" desc="PORT" />
              <HelmKey label="D" desc="STBD" />
              <span className="mx-1 text-white/20">│</span>
              <span className="font-mono text-[10px] tracking-wider text-white/40">
                🖱 PITCH & ROLL
              </span>
            </div>
            <span className="font-mono text-[10px] tracking-[0.2em] text-amber-400/60 uppercase">
              Press E or ESC to disengage helm
            </span>
          </div>
        </div>

        {/* ─── corner brackets — tighter in helm mode ─── */}
        <HelmBracket position="top-left" />
        <HelmBracket position="top-right" />
        <HelmBracket position="bottom-left" />
        <HelmBracket position="bottom-right" />
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🚶 CABIN HUD — the classic mission readouts
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* ─── engagement prompt — on mobile we auto-engage, so skip this ─── */}
      {!locked && !isMobile && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
          <div className="animate-pulse rounded-lg border border-white/10 bg-black/60 px-8 py-5 text-center backdrop-blur-sm">
            <p className="font-mono text-sm tracking-[0.25em] text-white/80 uppercase">
              Click to engage controls
            </p>
            <p className="mt-2 font-mono text-[10px] tracking-widest text-white/40">
              WASD to move &middot; Mouse to look &middot; ESC to disengage
            </p>
          </div>
        </div>
      )}

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

      {/* ─── E to helm prompt (only when locked and walking around) ─── */}
      {locked && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
          <span className="font-mono text-[10px] tracking-[0.2em] text-white/30 uppercase">
            Press E to engage helm
          </span>
        </div>
      )}

      {/* ─── corner brackets (that sci-fi framing everyone loves) ─── */}
      <CornerBracket position="top-left" />
      <CornerBracket position="top-right" />
      <CornerBracket position="bottom-left" />
      <CornerBracket position="bottom-right" />
    </div>
  );
}

/*
 * ── Shared sub-components ──
 * The small pieces that make the HUD feel alive.
 * Each one is a tiny story: a number, a dot, a bracket.
 */

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

function HelmKey({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded",
          "border border-cyan-400/30 bg-cyan-400/10 font-mono text-[10px] text-cyan-400/80"
        )}
      >
        {label}
      </span>
      <span className="font-mono text-[9px] tracking-wider text-white/40 uppercase">
        {desc}
      </span>
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

function HelmBracket({
  position,
}: {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}) {
  const posClass = {
    "top-left": "top-10 left-10",
    "top-right": "top-10 right-10",
    "bottom-left": "bottom-10 left-10",
    "bottom-right": "bottom-10 right-10",
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
        "absolute h-10 w-10 border-cyan-400/25",
        posClass,
        borderClass
      )}
    />
  );
}
