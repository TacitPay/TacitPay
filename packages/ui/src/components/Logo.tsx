import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  showWordmark?: boolean;
  badge?: string;
}

// `badge` has no default on purpose. It used to default to 'Preview', which meant
// omitting it — or passing undefined — silently stamped a network name on the mark
// that had nothing to do with the network in use. A logo should not assert state.
export function Logo({
  size = 32,
  showWordmark = true,
  badge,
  className = '',
  ...props
}: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* ZK Eclipse Vector Mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        {...props}
      >
        {/* 1. Shielded State Circle (Background Line) */}
        <circle
          cx="24"
          cy="20"
          r="9"
          stroke="currentColor"
          strokeWidth="2.25"
          className="text-zinc-400"
        />

        {/* 2. Public Ledger Disc (Foreground Solid Dark Fill) */}
        <circle cx="16" cy="20" r="9" fill="currentColor" className="text-zinc-950" />

        {/* 3. Verified Settlement Node (Contrasting Inner Anchor) */}
        <circle cx="20" cy="20" r="2.25" fill="#FFFFFF" />
      </svg>

      {/* Brand Lockup */}
      {showWordmark && (
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold tracking-tight text-zinc-950">
            Tacit<span className="font-normal text-zinc-500">Pay</span>
          </span>
          {badge && (
            <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-zinc-600 border border-zinc-200">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
