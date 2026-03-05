import { useRef, useState } from "react";
import { cn } from "~/utils";

/*
 * 🎮 Mobile Controls
 * ────────────────────────────────────────────
 * For the brave astronauts who navigate the cosmos
 * with nothing but their thumbs and sheer audacity.
 *
 *  LEFT HAND              RIGHT HAND
 *  ─────────              ──────────
 *      [▲]
 *   [◀]  [▶]  [🕹️]        [A]
 *      [▼]                [B]
 *
 * The D-pad gives you precision — cardinal thrust
 * for when you know EXACTLY where the airlock is.
 *
 * The joystick gives you finesse — analog control
 * for when you're parallel-parking a starship.
 *
 * A/B? Every spaceship needs buttons that glow
 * and feel important. What they DO is... TBD.
 * (Isn't that how all the best buttons start?)
 *
 *    ╔═══════════════════════════════╗
 *    ║  "Houston, I'm using my      ║
 *    ║   thumbs." — No astronaut    ║
 *    ║   ever. Until now.           ║
 *    ╚═══════════════════════════════╝
 */

export function MobileControls({
  virtualKeys,
  joystick,
  navMode = false,
}: MobileControlsProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {/* ─── bottom control strip ─── */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-5 pb-8">
        {/* left cluster: D-pad + Joystick */}
        <div className="pointer-events-auto flex items-end gap-4">
          <DPad virtualKeys={virtualKeys} navMode={navMode} />
          <Joystick stickRef={joystick} />
        </div>

        {/* right cluster: helm toggle + action */}
        <div className="pointer-events-auto flex flex-col items-center gap-3">
          <ActionButton
            label={navMode ? "⏏" : "E"}
            virtualKey="ButtonA"
            virtualKeys={virtualKeys}
            color="cyan"
          />
          <ActionButton
            label="B"
            virtualKey="ButtonB"
            virtualKeys={virtualKeys}
            color="amber"
          />
        </div>
      </div>

      {/* 📱 helm mode label — so mobile pilots know what's happening */}
      {navMode && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2">
          <span className="font-mono text-[10px] tracking-[0.2em] text-cyan-400/50 uppercase">
            Helm engaged · tap E to disengage
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── D-Pad ─── */

function DPad({ virtualKeys, navMode }: { virtualKeys: { current: Set<string> }; navMode: boolean }) {
  const press = (key: string) => {
    navigator.vibrate?.(10);
    virtualKeys.current.add(key);
  };
  const release = (key: string) => virtualKeys.current.delete(key);

  return (
    <div className="relative h-[130px] w-[130px]">
      {/* up / forward thrust */}
      <DPadButton
        arrow={navMode ? "⟰" : "▲"}
        className="absolute top-0 left-1/2 -translate-x-1/2"
        onPress={() => press("KeyW")}
        onRelease={() => release("KeyW")}
      />
      {/* left / port strafe */}
      <DPadButton
        arrow={navMode ? "⟸" : "◀"}
        className="absolute top-1/2 left-0 -translate-y-1/2"
        onPress={() => press("KeyA")}
        onRelease={() => release("KeyA")}
      />
      {/* right / starboard strafe */}
      <DPadButton
        arrow={navMode ? "⟹" : "▶"}
        className="absolute top-1/2 right-0 -translate-y-1/2"
        onPress={() => press("KeyD")}
        onRelease={() => release("KeyD")}
      />
      {/* down / reverse thrust */}
      <DPadButton
        arrow={navMode ? "⟱" : "▼"}
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        onPress={() => press("KeyS")}
        onRelease={() => release("KeyS")}
      />
      {/* center hub — the crosshair of the D-pad */}
      <div className="absolute top-1/2 left-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/20 bg-black/60" />
    </div>
  );
}

function DPadButton({
  arrow,
  className,
  onPress,
  onRelease,
}: {
  arrow: string;
  className?: string;
  onPress: () => void;
  onRelease: () => void;
}) {
  return (
    <button
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-lg",
        "border border-cyan-400/30 bg-black/50 backdrop-blur-sm",
        "text-cyan-400/70 active:bg-cyan-400/20 active:text-cyan-400",
        "select-none transition-colors",
        className
      )}
      onTouchStart={(e) => {
        e.preventDefault();
        onPress();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        onRelease();
      }}
      onTouchCancel={() => onRelease()}
    >
      <span className="text-xs">{arrow}</span>
    </button>
  );
}

/* ─── Joystick ─── */

function Joystick({
  stickRef,
}: {
  stickRef: { current: { x: number; z: number } };
}) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const touchId = useRef<number | null>(null);

  // how far the knob can travel from center
  const RADIUS = 34;

  const updateFromTouch = (touch: React.Touch) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = touch.clientX - cx;
    let dy = touch.clientY - cy;

    // clamp to the circle's edge — no escaping orbit
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > RADIUS) {
      dx = (dx / dist) * RADIUS;
      dy = (dy / dist) * RADIUS;
    }

    setKnobOffset({ x: dx, y: dy });

    // screen coords → 3D: x stays x, screen-y maps to z
    // up on screen (dy < 0) → forward (z < 0) ✓
    stickRef.current.x = dx / RADIUS;
    stickRef.current.z = dy / RADIUS;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (touchId.current !== null) return;
    navigator.vibrate?.(5);
    touchId.current = e.changedTouches[0].identifier;
    setIsActive(true);
    updateFromTouch(e.changedTouches[0]);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId.current) {
        updateFromTouch(e.changedTouches[i]);
        return;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId.current) {
        touchId.current = null;
        setIsActive(false);
        setKnobOffset({ x: 0, y: 0 });
        stickRef.current.x = 0;
        stickRef.current.z = 0;
        return;
      }
    }
  };

  return (
    <div
      ref={baseRef}
      className={cn(
        "relative flex h-[88px] w-[88px] items-center justify-center rounded-full",
        "border-2 border-cyan-400/30 bg-black/40 backdrop-blur-sm",
        "shadow-[inset_0_0_20px_rgba(34,211,238,0.05)]"
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* knob — the part you actually drag */}
      <div
        className={cn(
          "h-10 w-10 rounded-full",
          "border-2 border-cyan-400/50 bg-cyan-400/10",
          "shadow-[0_0_12px_rgba(34,211,238,0.2)]",
          !isActive && "transition-transform duration-150 ease-out"
        )}
        style={{
          transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
        }}
      />

      {/* cardinal tick marks — subtle directional hints */}
      <div className="absolute top-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-cyan-400/20" />
      <div className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-cyan-400/20" />
      <div className="absolute top-1/2 left-1.5 h-1 w-1 -translate-y-1/2 rounded-full bg-cyan-400/20" />
      <div className="absolute top-1/2 right-1.5 h-1 w-1 -translate-y-1/2 rounded-full bg-cyan-400/20" />
    </div>
  );
}

/* ─── Action Buttons ─── */

function ActionButton({
  label,
  virtualKey,
  virtualKeys,
  color,
}: {
  label: string;
  virtualKey: string;
  virtualKeys: { current: Set<string> };
  color: "cyan" | "amber";
}) {
  const colorStyles = {
    cyan: {
      border: "border-cyan-400/40",
      text: "text-cyan-400/80",
      active: "active:bg-cyan-400/20 active:border-cyan-400/60 active:text-cyan-400",
      shadow: "shadow-[0_0_14px_rgba(34,211,238,0.15)]",
    },
    amber: {
      border: "border-amber-400/40",
      text: "text-amber-400/80",
      active:
        "active:bg-amber-400/20 active:border-amber-400/60 active:text-amber-400",
      shadow: "shadow-[0_0_14px_rgba(251,191,36,0.15)]",
    },
  }[color];

  return (
    <button
      className={cn(
        "flex h-14 w-14 items-center justify-center rounded-full",
        "border-2 bg-black/50 backdrop-blur-sm",
        "font-mono text-lg font-bold",
        "select-none transition-colors",
        colorStyles.border,
        colorStyles.text,
        colorStyles.active,
        colorStyles.shadow
      )}
      onTouchStart={(e) => {
        e.preventDefault();
        navigator.vibrate?.(10);
        virtualKeys.current.add(virtualKey);
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        virtualKeys.current.delete(virtualKey);
      }}
      onTouchCancel={() => virtualKeys.current.delete(virtualKey)}
    >
      {label}
    </button>
  );
}

/* ─── Types live at the bottom, like sediment ─── */

interface MobileControlsProps {
  virtualKeys: { current: Set<string> };
  joystick: { current: { x: number; z: number } };
  navMode?: boolean;
}
