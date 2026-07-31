export function Logo({ size = 40, showText = false }: { size?: number; showText?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <img
        src="/ndahari-logo.svg"
        alt="Ndahari"
        width={size}
        height={size}
        className="object-contain"
        onError={(e) => {
          // Fallback if SVG fails
          const target = e.currentTarget;
          target.style.display = "none";
          const next = target.nextElementSibling as HTMLElement | null;
          if (next) next.style.display = "flex";
        }}
      />
      {/* Fallback SVG icon shown only if image fails */}
      <div
        style={{ display: "none", width: size, height: size }}
        className="rounded-xl items-center justify-center flex-shrink-0"
      >
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="10" fill="#1a3a8f"/>
          <text x="20" y="27" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold" fontFamily="Arial">N</text>
        </svg>
      </div>
      {showText && (
        <span className="text-xl font-bold tracking-tight text-[#1a3a8f]">
          Ndahari
        </span>
      )}
    </div>
  );
}
