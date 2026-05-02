"use client";

type AudioMeterProps = {
  level: number;
  className?: string;
};

export function AudioMeter({ level, className = "" }: AudioMeterProps) {
  const totalBars = 40;
  const safeLevel = Math.min(100, Math.max(0, level));
  const activeBars = Math.round((safeLevel / 100) * totalBars);

  return (
    <div className={`inline-flex items-end gap-1 bg-black px-5 py-4 ${className}`}>
      {Array.from({ length: totalBars }).map((_, index) => {
        const isActive = index < activeBars;
        const colour = index > 33 ? "#dc2626" : index > 27 ? "#facc15" : "#22c55e";

        return (
          <span
            key={index}
            className="h-[42px] w-[7px] transition-all duration-150 ease-out"
            style={{
              backgroundColor: colour,
              opacity: isActive ? 1 : 0.16,
              transform: `scaleY(${isActive ? 1 : 0.88})`,
              boxShadow: isActive ? `0 0 10px ${colour}` : "none",
            }}
          />
        );
      })}
    </div>
  );
}
