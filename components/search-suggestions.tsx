'use client';

import { useId } from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

type Suggestion = { id: string; value: string };

export function SearchSuggestions({ label, placeholder, clearLabel, emptyLabel, suggestions, value, onChange, onClear }: {
  label: string;
  placeholder: string;
  clearLabel: string;
  emptyLabel: string;
  suggestions: Suggestion[];
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  const id = useId();
  return (
    <div className="field-label search-label">
      <label htmlFor={id}>{label}</label>
      <Combobox.Root
        items={suggestions}
        itemToStringLabel={(item) => item.value}
        value={suggestions.find((item) => item.value === value) ?? null}
        inputValue={value}
        onInputValueChange={(next, details) => {
          if (details.reason === 'input-change' || details.reason === 'input-clear') onChange(next);
        }}
        onValueChange={(item) => { if (item) onChange(item.value); }}
        openOnInputClick
      >
        <div className="input-with-icon">
          <Search aria-hidden="true" />
          <Combobox.Input id={id} render={<Input />} placeholder={placeholder} />
          {value ? (
            <button type="button" aria-label={clearLabel} onClick={onClear}><X /></button>
          ) : (
            <Combobox.Trigger aria-label={label}><ChevronDown /></Combobox.Trigger>
          )}
        </div>
        <Combobox.Portal>
          <Combobox.Positioner align="start" sideOffset={4} className="search-suggestions-positioner">
            <Combobox.Popup className="nsrd-select-content search-suggestions-content">
              <Combobox.Empty className="search-suggestions-empty">{emptyLabel}</Combobox.Empty>
              <Combobox.List className="search-suggestions-list">
                {(item: Suggestion) => (
                  <Combobox.Item key={item.id} value={item} data-slot="combobox-item" className="search-suggestions-item">
                    {item.value}
                    <Combobox.ItemIndicator><Check /></Combobox.ItemIndicator>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  );
}
