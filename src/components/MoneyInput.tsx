import React from 'react';

interface MoneyInputProps {
  value: number | undefined | null;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  autoFocus?: boolean;
  required?: boolean;
  id?: string;
}

export const MoneyInput: React.FC<MoneyInputProps> = ({
  value,
  onChange,
  className = '',
  placeholder = '০.০০',
  disabled = false,
  min,
  max,
  autoFocus = false,
  required = false,
  id,
}) => {
  const displayVal = value !== undefined && value !== null && value !== 0 ? value : (value === 0 ? '0' : '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange(0);
      return;
    }
    const num = parseFloat(raw);
    if (!isNaN(num)) {
      onChange(num);
    }
  };

  return (
    <input
      id={id}
      type="number"
      step="any"
      min={min}
      max={max}
      required={required}
      autoFocus={autoFocus}
      disabled={disabled}
      placeholder={placeholder}
      value={displayVal}
      onChange={handleChange}
      className={className}
    />
  );
};
