import { useRef, useEffect } from "react";
import * as THREE from "three";
import { cn } from "~/utils";
import { getVisualDistanceToSurface, computeOrbitalMetrics } from "~/utils/grandnessEffect";
import type { ControlMode } from "./Scene";

/*
 * 📡 The HUD (Heads-Up Display)
 * ────────────────────────────────────────────
 * Overlaid on the viewport like a Post-it note
 * from the universe. Pure HTML/CSS floating above
 * the Three.js canvas because sometimes the best
 * tech is the simplest tech.
 *
 * Three faces now:
 *   🚶 CABIN HUD   — mission readouts, orbit data, system status
 *   🚀 HELM HUD    — flight instruments, velocity vector, control hints
 *   🌍 SURFACE HUD — compass, distance-to-ship, altitude. minimal.
 *
 * If you're adding new readouts, remember:
 * every good cockpit tells a story.
 * What story does YOUR readout tell?
 */

export function HUD({
  locked,
  controlMode = "cabin",
  isMobile = false,
  shipWorldPosRef,
  shipVelocityRef,
  landed = false,
}: HUDProps) {
  /*
   * 📏 Live distance readout — updated imperatively via rAF
   * because React re-renders at 60fps would make the GC weep.
   */
  const distanceElRef = useRef<HTMLSpanElement>(null);
  const cabinDistanceElRef = useRef<HTMLSpanElement>(null);

  // 🏎️ velocity readout refs
  const velXRef = useRef<HTMLSpanElement>(null);
  const velYRef = useRef<HTMLSpanElement>(null);
  const velZRef = useRef<HTMLSpanElement>(null);
  const cabinVelXRef = useRef<HTMLSpanElement>(null);
  const cabinVelYRef = useRef<HTMLSpanElement>(null);
  const cabinVelZRef = useRef<HTMLSpanElement>(null);

  // 🛸 orbital velocity readout
  const orbVelElRef = useRef<HTMLSpanElement>(null);
  const orbTargetElRef = useRef<HTMLSpanElement>(null);
  const orbPercentElRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!shipWorldPosRef) return;

    let frameId: number;
    const tick = () => {
      // 📏 distance
      if (shipWorldPosRef.current) {
        const d = getVisualDistanceToSurface(shipWorldPosRef.current);
        const text = d.toFixed(1);
        if (distanceElRef.current) distanceElRef.current.textContent = text;
        if (cabinDistanceElRef.current)
          cabinDistanceElRef.current.textContent = text;
      }

      // 🏎️ velocity
      if (shipVelocityRef?.current) {
        const v = shipVelocityRef.current;
        const vx = v.x.toFixed(2);
        const vy = v.y.toFixed(2);
        const vz = v.z.toFixed(2);
        if (velXRef.current) velXRef.current.textContent = vx;
        if (velYRef.current) velYRef.current.textContent = vy;
        if (velZRef.current) velZRef.current.textContent = vz;
        if (cabinVelXRef.current) cabinVelXRef.current.textContent = vx;
        if (cabinVelYRef.current) cabinVelYRef.current.textContent = vy;
        if (cabinVelZRef.current) cabinVelZRef.current.textContent = vz;

        // orbital velocity decomposition
        if (shipWorldPosRef?.current) {
          const metrics = computeOrbitalMetrics(shipWorldPosRef.current, v);
          if (metrics) {
            if (orbVelElRef.current)
              orbVelElRef.current.textContent = metrics.tangentialSpeed.toFixed(1);
            if (orbTargetElRef.current)
              orbTargetElRef.current.textContent = metrics.orbitalSpeed.toFixed(1);
            if (orbPercentElRef.current)
              orbPercentElRef.current.textContent = String(metrics.orbitalPercent);
          }
        }
      }

      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [shipWorldPosRef, shipVelocityRef]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🌍 SURFACE HUD — you're standing on a world
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (controlMode === "surface") {
    return (
      <div className="pointer-events-none absolute inset-0 z-10">
        {/* ─── surface mode banner ─── */}
        <div className="flex items-center justify-center pt-6">
          <div
            className={cn(
              "rounded border border-emerald-400/30 bg-black/50 px-6 py-2 backdrop-blur-sm",
              "shadow-[0_0_20px_rgba(52,211,153,0.15)]"
            )}
          >
            <span className="font-mono text-xs tracking-[0.4em] text-emerald-400 uppercase">
              ⟐ Surface ⟐
            </span>
          </div>
        </div>

        {/* ─── left panel — minimal readouts ─── */}
        <div className="absolute top-1/2 left-8 -translate-y-1/2 space-y-4">
          <div className="font-mono">
            <div className="text-[10px] tracking-[0.2em] text-white/40 uppercase">
              DIST
            </div>
            <div className="text-sm text-white/80">
              <span ref={distanceElRef}>--</span>
              <span className="ml-1 text-[10px] text-white/40">su</span>
            </div>
          </div>
        </div>

        {/* ─── bottom prompt ─── */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <div
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg",
              "border border-white/10 bg-black/40 px-8 py-3 backdrop-blur-sm"
            )}
          >
            <div className="flex items-center gap-6">
              <HelmKey label="W" desc="FWD" color="emerald" />
              <HelmKey label="S" desc="BACK" color="emerald" />
              <HelmKey label="A" desc="LEFT" color="emerald" />
              <HelmKey label="D" desc="RIGHT" color="emerald" />
              <span className="mx-1 text-white/20">│</span>
              <span className="font-mono text-[10px] tracking-wider text-white/40">
                🖱 LOOK AROUND
              </span>
            </div>
            <span className="font-mono text-[10px] tracking-[0.2em] text-amber-400/60 uppercase">
              Press F to re-board ship
            </span>
          </div>
        </div>

        {/* ─── corner brackets — earthy tones for surface mode ─── */}
        <SurfaceBracket position="top-left" />
        <SurfaceBracket position="top-right" />
        <SurfaceBracket position="bottom-left" />
        <SurfaceBracket position="bottom-right" />
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🚀 HELM HUD — flight instruments
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (controlMode === "helm") {
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
              {landed ? "⟐ Landed ⟐" : "⟐ Helm Active ⟐"}
            </span>
          </div>
        </div>

        {/* ─── LANDED overlay ─── */}
        {landed && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2">
            <div
              className={cn(
                "rounded border border-emerald-400/40 bg-emerald-950/50 px-6 py-2 backdrop-blur-sm",
                "shadow-[0_0_20px_rgba(52,211,153,0.2)]",
                "animate-pulse"
              )}
            >
              <span className="font-mono text-sm tracking-[0.3em] text-emerald-400 uppercase">
                🌍 Surface Contact
              </span>
            </div>
          </div>
        )}

        {/* ─── crosshair ─── */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-1.5 w-1.5 rounded-full bg-cyan-400/60 shadow-[0_0_6px_rgba(34,211,238,0.4)]" />
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
          <VelocityTriad
            xRef={velXRef}
            yRef={velYRef}
            zRef={velZRef}
          />
        </div>

        {/* ─── right panel — ship systems ─── */}
        <div className="absolute top-1/2 right-8 -translate-y-1/2 space-y-5 text-right">
          <Readout label="ROLL" value="0.0" unit="°" align="right" />
          <div className="font-mono text-right">
            <div className="text-[10px] tracking-[0.2em] text-white/40 uppercase">
              DIST
            </div>
            <div className="text-sm text-white/80">
              <span ref={distanceElRef}>--</span>
              <span className="ml-1 text-[10px] text-white/40">su</span>
            </div>
          </div>
          <div className="font-mono text-right">
            <div className="text-[10px] tracking-[0.2em] text-white/40 uppercase">
              ORB
            </div>
            <div className="text-sm text-white/80">
              <span ref={orbVelElRef}>0.0</span>
              <span className="mx-1 text-[10px] text-white/30">/</span>
              <span ref={orbTargetElRef} className="text-cyan-400/70">0.0</span>
              <span className="ml-1 text-[10px] text-white/40">su/s</span>
            </div>
            <div className="text-[9px] text-white/30">
              <span ref={orbPercentElRef}>0</span>
              <span>% orbital</span>
            </div>
          </div>
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
              {landed
                ? "Press F to disembark · E to disengage helm"
                : "Press E or ESC to disengage helm"}
            </span>
          </div>
        </div>

        {/* ─── corner brackets ─── */}
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
      {/* ─── engagement prompt ─── */}
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
        <VelocityTriad
          xRef={cabinVelXRef}
          yRef={cabinVelYRef}
          zRef={cabinVelZRef}
        />
        <Readout label="FUEL" value="87" unit="%" />
      </div>

      {/* ─── right readouts ─── */}
      <div className="absolute top-1/2 right-8 -translate-y-1/2 space-y-4 text-right">
        <Readout label="LAT" value="28.524" unit="°N" align="right" />
        <Readout label="LON" value="-80.65" unit="°W" align="right" />
        <Readout label="COM" value="CH-07" align="right" />
        <div className="font-mono text-right">
          <div className="text-[10px] tracking-[0.2em] text-white/40 uppercase">
            DIST
          </div>
          <div className="text-sm text-white/80">
            <span ref={cabinDistanceElRef}>--</span>
            <span className="ml-1 text-[10px] text-white/40">su</span>
          </div>
        </div>
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

      {/* ─── E to helm prompt ─── */}
      {locked && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
          <span className="font-mono text-[10px] tracking-[0.2em] text-white/30 uppercase">
            Press E to engage helm
          </span>
        </div>
      )}

      {/* ─── corner brackets ─── */}
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

/*
 * 🏎️ VelocityTriad — three axes of planet-relative speed
 */
function VelocityTriad({
  xRef,
  yRef,
  zRef,
  align = "left",
}: {
  xRef: React.RefObject<HTMLSpanElement | null>;
  yRef: React.RefObject<HTMLSpanElement | null>;
  zRef: React.RefObject<HTMLSpanElement | null>;
  align?: "left" | "right";
}) {
  return (
    <div className={cn("font-mono space-y-0.5", align === "right" && "text-right")}>
      <div className="text-[10px] tracking-[0.2em] text-white/40 uppercase">
        VEL
      </div>
      <div className="space-y-px text-xs text-white/80">
        <div>
          <span className="text-[9px] text-white/30 mr-1">X</span>
          <span ref={xRef}>0.00</span>
        </div>
        <div>
          <span className="text-[9px] text-white/30 mr-1">Y</span>
          <span ref={yRef}>0.00</span>
        </div>
        <div>
          <span className="text-[9px] text-white/30 mr-1">Z</span>
          <span ref={zRef}>0.00</span>
        </div>
      </div>
      <div className="text-[9px] text-white/25">su/s</div>
    </div>
  );
}

function HelmKey({
  label,
  desc,
  color = "cyan",
}: {
  label: string;
  desc: string;
  color?: "cyan" | "emerald";
}) {
  const colorClasses = color === "emerald"
    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400/80"
    : "border-cyan-400/30 bg-cyan-400/10 text-cyan-400/80";
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded",
          colorClasses,
          "font-mono text-[10px]"
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

function SurfaceBracket({
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
        "absolute h-10 w-10 border-emerald-400/25",
        posClass,
        borderClass
      )}
    />
  );
}

/* ─── Props at the bottom, as is tradition ─── */

interface HUDProps {
  locked: boolean;
  controlMode?: ControlMode;
  isMobile?: boolean;
  shipWorldPosRef?: React.RefObject<THREE.Vector3>;
  shipVelocityRef?: React.RefObject<THREE.Vector3>;
  landed?: boolean;
}
