"use client";

import { planetSportBrandOptions } from "@/app/lib/planet-sport-brands/catalog";

const inputClass =
  "mt-1 w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]";
const inputStyle = { borderColor: "var(--border)" } as const;

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
  allowCustom?: boolean;
};

export function BrandSelect({
  value,
  onChange,
  disabled,
  required,
  id,
  className = inputClass,
  allowCustom = true,
}: Props) {
  const options = planetSportBrandOptions();
  const known = options.some((o) => o.value === value);
  const selectValue = value && (known || !allowCustom) ? value : allowCustom && value ? "__custom__" : "";

  return (
    <div className="space-y-2">
      <select
        id={id}
        className={className}
        style={inputStyle}
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value;
          if (next === "__custom__") return;
          onChange(next);
        }}
        disabled={disabled}
        required={required && !allowCustom}
      >
        <option value="">— Select brand —</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {allowCustom ? <option value="__custom__">Custom…</option> : null}
      </select>
      {allowCustom && (selectValue === "__custom__" || (value && !known)) ? (
        <input
          className={className}
          style={inputStyle}
          type="text"
          placeholder="Enter brand name"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
        />
      ) : null}
    </div>
  );
}
