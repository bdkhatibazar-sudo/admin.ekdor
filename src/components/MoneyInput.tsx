import React, { useState, useEffect } from 'react';
import { toEnglishDigits, parseNumberInput } from '../utils/formatters';

interface MoneyInputProps {
  id?: string;
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  title?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Robust Money and Number Input Component.
 * - Supports both English (0-9) and Bengali (০-৯) digit input seamlessly.
 * - Uses inputMode="decimal" so mobile phones show the numeric keypad.
 * - Avoids browser bugs where <input type="number"> blocks Bengali characters or traps '0' when backspacing.
 * - Allows clearing the field completely while typing without stubborn '0' sticking around.
 */
export const MoneyInput: React.FC<MoneyInputProps> = ({
  id,
  value,
  onChange,
  placeholder = '0',
  min = 0,
  max,
  className = '',
  disabled = false,
  required = false,
  autoFocus = false,
  title,
  onKeyDown,
}) => {
  // Local string state allows user to backspace to empty string without fighting a forced '0'
  const [text, setText] = useState<string>(() => (value === 0 ? '' : String(value)));

  // Synchronize when the external numeric value changes (e.g. preset clicked, reset, or cart grand total update)
  useEffect(() => {
    const currentNum = parseNumberInput(text);
    if (currentNum !== value) {
      setText(value === 0 ? '' : String(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    
    // Automatically convert any typed Bengali numerals (০, ১, ২...) to English digits (0, 1, 2...)
    const englishText = toEnglishDigits(raw);

    // Keep only digits and decimal dot
    const cleaned = englishText.replace(/[^0-9.]/g, '');

    // Allow only one decimal point
    const parts = cleaned.split('.');
    const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;

    setText(sanitized);

    const parsed = sanitized === '' ? 0 : parseFloat(sanitized);
    const num = isNaN(parsed) ? 0 : parsed;

    if (max !== undefined && num > max) {
      onChange(max);
    } else if (num < min && sanitized !== '') {
      onChange(min);
    } else {
      onChange(num);
    }
  };

  const handleBlur = () => {
    if (text === '') {
      if (min > 0) {
        setText(String(min));
        onChange(min);
      } else {
        onChange(0);
      }
    } else {
      const parsed = parseNumberInput(text);
      if (max !== undefined && parsed > max) {
        setText(String(max));
        onChange(max);
      } else if (parsed < min) {
        setText(String(min));
        onChange(min);
      }
    }
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      disabled={disabled}
      required={required}
      autoFocus={autoFocus}
      title={title}
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  );
};
