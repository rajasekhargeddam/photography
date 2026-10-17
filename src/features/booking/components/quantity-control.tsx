type Props = {
  label: string;
  outputLabel?: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
};

export function QuantityControl({
  label,
  outputLabel = `${label} quantity`,
  value,
  disabled = false,
  onChange,
}: Props) {
  return (
    <div className="guided-counter">
      <button
        type="button"
        aria-label={`Decrease ${label} quantity`}
        disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <output aria-label={outputLabel}>{value}</output>
      <button
        type="button"
        aria-label={`Increase ${label} quantity`}
        disabled={disabled || value >= 5}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}
