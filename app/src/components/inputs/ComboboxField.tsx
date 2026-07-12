import { useId, useRef, useState, type ReactNode } from "react";

interface ComboboxFieldProps<T> {
  id?: string;
  label: string;
  placeholder?: string;
  inputValue: string;
  onInputValueChange: (value: string) => void;
  options: T[];
  isLoading?: boolean;
  errorMessage?: string;
  emptyMessage?: string;
  helperText?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  getOptionKey: (option: T) => string;
  getOptionLabel: (option: T) => string;
  renderOption?: (option: T) => ReactNode;
  onSelect: (option: T) => void;
}

// Combobox accesible genérico: el consumidor decide cómo se producen las
// opciones (filtro local sincrónico o búsqueda async debounced) — este
// componente solo resuelve teclado + ARIA + el listbox visual, compartido por
// país, ciudad y alojamiento.
export function ComboboxField<T>({
  id,
  label,
  placeholder,
  inputValue,
  onInputValueChange,
  options,
  isLoading = false,
  errorMessage,
  emptyMessage,
  helperText,
  disabled = false,
  autoFocus = false,
  getOptionKey,
  getOptionLabel,
  renderOption,
  onSelect,
}: ComboboxFieldProps<T>) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const listboxId = `${fieldId}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const showListbox = open && !disabled && (isLoading || options.length > 0 || Boolean(errorMessage) || Boolean(emptyMessage));
  const activeOption = activeIndex >= 0 ? options[activeIndex] : undefined;

  function handleSelect(option: T) {
    onSelect(option);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, options.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      if (activeOption) {
        event.preventDefault();
        handleSelect(activeOption);
      }
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="combobox-field">
      <label htmlFor={fieldId}>{label}</label>
      <input
        ref={inputRef}
        id={fieldId}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={showListbox}
        aria-controls={listboxId}
        aria-activedescendant={activeOption ? `${listboxId}-${getOptionKey(activeOption)}` : undefined}
        placeholder={placeholder}
        value={inputValue}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(event) => {
          onInputValueChange(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      />
      {helperText && !showListbox && <p className="combobox-helper">{helperText}</p>}
      {showListbox && (
        <ul className="combobox-listbox" id={listboxId} role="listbox">
          {isLoading && (
            <li className="combobox-status" aria-live="polite">
              Buscando…
            </li>
          )}
          {!isLoading && errorMessage && (
            <li className="combobox-status combobox-status-error" aria-live="polite">
              {errorMessage}
            </li>
          )}
          {!isLoading && !errorMessage && options.length === 0 && emptyMessage && (
            <li className="combobox-status" aria-live="polite">
              {emptyMessage}
            </li>
          )}
          {!isLoading &&
            !errorMessage &&
            options.map((option, index) => {
              const key = getOptionKey(option);
              return (
                <li
                  key={key}
                  id={`${listboxId}-${key}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`combobox-option${index === activeIndex ? " is-active" : ""}`}
                >
                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => handleSelect(option)}>
                    {renderOption ? renderOption(option) : getOptionLabel(option)}
                  </button>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
