import { useId, useRef, useState } from "react";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface SelectFieldProps<T extends string> {
  id?: string;
  label: string;
  labelClassName?: string;
  className?: string;
  value: T | "";
  options: readonly SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: T) => void;
}

// Selector cerrado y accesible para catálogos breves. Conserva el comportamiento
// de un select nativo, pero permite que el panel, los estados y el scrollbar
// compartan el lenguaje visual de los comboboxes de Alaia.
export function SelectField<T extends string>({
  id,
  label,
  labelClassName,
  className,
  value,
  options,
  placeholder = "Selecciona una opción",
  disabled = false,
  onChange,
}: SelectFieldProps<T>) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const listboxId = `${fieldId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [activeIndex, setActiveIndex] = useState(Math.max(selectedIndex, 0));
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const activeOption = options[activeIndex];

  function openList(preferredIndex = selectedIndex >= 0 ? selectedIndex : 0) {
    if (disabled || options.length === 0) return;
    setActiveIndex(Math.max(0, Math.min(preferredIndex, options.length - 1)));
    setOpen(true);
  }

  function closeList() {
    setOpen(false);
    setActiveIndex(Math.max(selectedIndex, 0));
  }

  function selectOption(option: SelectOption<T>) {
    onChange(option.value);
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openList();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        openList(selectedIndex >= 0 ? selectedIndex : options.length - 1);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      if (activeOption) {
        event.preventDefault();
        selectOption(activeOption);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeList();
    }
  }

  const classes = ["alaia-select", className].filter(Boolean).join(" ");

  return (
    <div
      ref={rootRef}
      className={classes}
      data-open={open ? "true" : "false"}
      onBlurCapture={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget)) closeList();
      }}
    >
      <label className={labelClassName} htmlFor={fieldId}>
        {label}
      </label>
      <button
        id={fieldId}
        type="button"
        className="alaia-select-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && activeOption ? `${listboxId}-option-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={handleKeyDown}
      >
        <span className={selectedOption ? "alaia-select-value" : "alaia-select-placeholder"}>
          {selectedOption?.label ?? placeholder}
        </span>
        <span className="alaia-select-chevron" aria-hidden="true" />
      </button>

      {open ? (
        <ul id={listboxId} className="alaia-select-listbox" role="listbox">
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${listboxId}-option-${index}`}
              className={`alaia-select-option${index === activeIndex ? " is-active" : ""}`}
              role="option"
              aria-selected={option.value === value}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectOption(option)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
