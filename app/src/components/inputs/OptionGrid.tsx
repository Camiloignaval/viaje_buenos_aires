import type { TravelOption } from "@/features/trips/data/travelOptions";

interface Props {
  legend: string;
  options: TravelOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  multiple?: boolean;
  maxSelected?: number;
}

// Grilla de chips seleccionables — single-select (radiogroup) o multi-select
// con tope (group). Nunca administrativa: sin checkboxes, solo texto + emoji
// con un borde dorado tenue cuando está elegido.
export function OptionGrid({ legend, options, selected, onChange, multiple = false, maxSelected }: Props) {
  function handleClick(value: string) {
    if (!multiple) {
      onChange([value]);
      return;
    }
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
      return;
    }
    if (maxSelected != null && selected.length >= maxSelected) {
      return;
    }
    onChange([...selected, value]);
  }

  return (
    <fieldset className="option-grid">
      <legend className="option-grid-legend">{legend}</legend>
      <div className="option-grid-list" role={multiple ? "group" : "radiogroup"} aria-label={legend}>
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          const isDisabled = multiple && !isSelected && maxSelected != null && selected.length >= maxSelected;
          return (
            <button
              key={option.value}
              type="button"
              role={multiple ? undefined : "radio"}
              aria-checked={multiple ? undefined : isSelected}
              aria-pressed={multiple ? isSelected : undefined}
              className={`option-chip${isSelected ? " is-selected" : ""}`}
              disabled={isDisabled}
              onClick={() => handleClick(option.value)}
            >
              <span className="option-chip-emoji" aria-hidden="true">
                {option.emoji}
              </span>
              <span className="option-chip-label">{option.label}</span>
              {option.description && <span className="option-chip-description">{option.description}</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
