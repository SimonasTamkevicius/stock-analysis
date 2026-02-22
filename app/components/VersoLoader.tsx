"use client";

export default function VersoLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-20">
      <svg
        viewBox="0 0 340 90"
        className="w-80 h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Glow filter for the tracing stroke */}
          <filter id="verso-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Static ghost outline — always visible */}
        <text
          x="170"
          y="62"
          textAnchor="middle"
          fill="none"
          strokeWidth="0.8"
          fontSize="68"
          fontFamily="var(--font-display), Inter, sans-serif"
          fontWeight="900"
          letterSpacing="-3"
        >
          <tspan stroke="var(--text-primary)" opacity="0.15">Ver</tspan>
          <tspan stroke="var(--color-brand)" opacity="0.25">so.</tspan>
        </text>

        {/* Sweeping tracer stroke — the "painter" */}
        <text
          x="170"
          y="62"
          textAnchor="middle"
          className="verso-tracer"
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fontSize="68"
          fontFamily="var(--font-display), Inter, sans-serif"
          fontWeight="900"
          letterSpacing="-3"
          filter="url(#verso-glow)"
        >
          <tspan stroke="var(--text-primary)">Ver</tspan>
          <tspan stroke="var(--color-brand)">so.</tspan>
        </text>

        {/* Subtle residual glow left behind */}
        <text
          x="170"
          y="62"
          textAnchor="middle"
          className="verso-residue"
          fill="none"
          strokeWidth="1"
          strokeLinecap="round"
          fontSize="68"
          fontFamily="var(--font-display), Inter, sans-serif"
          fontWeight="900"
          letterSpacing="-3"
          opacity="0.15"
        >
          <tspan stroke="var(--text-primary)">Ver</tspan>
          <tspan stroke="var(--color-brand)">so.</tspan>
        </text>
      </svg>

      <p className="text-xs font-medium text-text-muted tracking-widest uppercase">
        Analyzing
      </p>
    </div>
  );
}
