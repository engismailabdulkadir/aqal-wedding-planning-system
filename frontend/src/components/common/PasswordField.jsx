import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import {
  fieldClass,
  FieldError,
} from './FormModal.jsx';

// Password input oo dib loo isticmaali karo pages badan
export default function PasswordField({
  label = 'Password',
  value,
  onChange,
  error = '',
  required = true,
  minLength = 4,
  placeholder = '',
  autoComplete = 'new-password',
  fieldName = 'password',
}) {
  // Xakamee password-ka inuu muuqdo ama qarsoonaado
  const [visible, setVisible] = useState(false);

  return (
    <label className="block text-sm font-medium text-stone-700">

      {/* Password label */}
      {label}

      <span className="relative mt-1 block">

        {/* Password input */}
        <input
          data-field={fieldName}
          required={required}
          minLength={
            required
              ? minLength
              : undefined
          }
          type={
            visible
              ? 'text'
              : 'password'
          }
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`${fieldClass} pr-12`}
        />

        {/* Show/Hide password button */}
        <button
          type="button"
          onClick={() =>
            setVisible(
              (current) => !current
            )
          }
          className="absolute right-4 top-3 text-stone-400 hover:text-brand-600"
          aria-label={
            visible
              ? 'Hide password'
              : 'Show password'
          }
        >
          {visible
            ? <FiEyeOff />
            : <FiEye />}
        </button>
      </span>

      {/* Error message */}
      <FieldError message={error} />
    </label>
  );
}