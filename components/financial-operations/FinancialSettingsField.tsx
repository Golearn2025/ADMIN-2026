import { Input } from "@/components/ui/input";

type PercentFieldProps = {
  id: string;
  label: string;
  hint: string;
  value: number;
  step?: number;
  onChange: (value: number) => void;
};

export function PercentField({
  id,
  label,
  hint,
  value,
  step = 0.1,
  onChange,
}: PercentFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-foreground">
        {label}
      </label>
      <Input
        id={id}
        type="number"
        min={0}
        max={100}
        step={step}
        className="h-9"
        value={String(value)}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          onChange(Number.isNaN(n) ? 0 : n);
        }}
      />
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

type PoundsFieldProps = {
  id: string;
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
};

export function PoundsField({ id, label, hint, value, onChange }: PoundsFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-foreground">
        {label}
      </label>
      <div className="relative flex items-center">
        <span className="absolute left-3 text-sm text-muted-foreground select-none pointer-events-none">
          £
        </span>
        <Input
          id={id}
          type="number"
          min={0}
          step={0.01}
          className="h-9 pl-7"
          value={String(value)}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            onChange(Number.isNaN(n) ? 0 : n);
          }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
