import React from "react";

interface GlassWrapperProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Apple-style Liquid Glass container.
 * Technique: 1px gradient-border wrapper → inner surface with
 * backdrop-filter blur + saturate + brightness.
 * A specular highlight strip simulates light catching the top edge.
 */
const GlassWrapper = ({ children, className = "", style }: GlassWrapperProps) => (
  <div
    className={`relative rounded-2xl p-px ${className}`}
    style={{
      // Gradient border: bright white at top-left (light source), electric blue at bottom-right
      background:
        "linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 35%, rgba(0,112,243,0.18) 100%)",
      ...style,
    }}
  >
    {/* Specular highlight — a thin luminous line along the top edge */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full"
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
      }}
    />

    {/* Glass inner surface */}
    <div
      className="relative h-full rounded-[15px] overflow-hidden"
      style={{
        backdropFilter: "blur(20px) saturate(180%) brightness(1.06)",
        WebkitBackdropFilter: "blur(20px) saturate(180%) brightness(1.06)",
        background: "rgba(18,18,18,0.58)",
      }}
    >
      {children}
    </div>
  </div>
);

export default GlassWrapper;
