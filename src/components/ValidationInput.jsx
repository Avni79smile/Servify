import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * ValidatedInput - A reusable form input component with validation styling and error display
 */
export const ValidatedInput = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  error,
  disabled = false,
  validator,
  sanitizer,
  formatter,
  maxLength,
  className,
  ...props
}) => {
  const handleChange = (e) => {
    let newValue = e.target.value;

    // Apply sanitizer if provided (e.g., remove non-numeric chars)
    if (sanitizer) {
      newValue = sanitizer(newValue, maxLength);
    }

    // Apply formatter if provided (e.g., format phone as XXX-XXX-XXXX)
    if (formatter) {
      newValue = formatter(newValue);
    }

    // Apply max length if specified
    if (maxLength && newValue.length > maxLength) {
      newValue = newValue.slice(0, maxLength);
    }

    onChange(newValue);
  };

  const isInvalid = Boolean(error);

  return (
    <div className="space-y-1">
      {label && (
        <Label className={required ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}>
          {label}
        </Label>
      )}
      <Input
        name={name}
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        className={cn(
          "transition-colors",
          isInvalid && "border-red-500 focus-visible:ring-red-500 bg-red-50",
          className
        )}
        {...props}
      />
      {isInvalid && (
        <p className="text-sm text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
};

/**
 * ValidatedSelect - A reusable select component with validation
 */
export const ValidatedSelect = ({
  label,
  value,
  onValueChange,
  error,
  required = false,
  placeholder = "Select...",
  children,
  disabled = false,
}) => {
  const isInvalid = Boolean(error);

  return (
    <div className="space-y-1">
      {label && (
        <Label className={required ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}>
          {label}
        </Label>
      )}
      <div className={cn("rounded-md border", isInvalid && "border-red-500")}>
        {children}
      </div>
      {isInvalid && (
        <p className="text-sm text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
};

/**
 * ValidatedTextarea - A reusable textarea component with validation
 */
export const ValidatedTextarea = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  error,
  disabled = false,
  maxLength,
  rows = 3,
  className,
  ...props
}) => {
  const isInvalid = Boolean(error);

  const handleChange = (e) => {
    let newValue = e.target.value;

    if (maxLength && newValue.length > maxLength) {
      newValue = newValue.slice(0, maxLength);
    }

    onChange(newValue);
  };

  return (
    <div className="space-y-1">
      {label && (
        <Label className={required ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}>
          {label}
        </Label>
      )}
      <textarea
        name={name}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        rows={rows}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors",
          isInvalid && "border-red-500 focus-visible:ring-red-500 bg-red-50",
          className
        )}
        {...props}
      />
      {isInvalid && (
        <p className="text-sm text-red-500 font-medium">{error}</p>
      )}
      {maxLength && (
        <p className="text-xs text-muted-foreground text-right">
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  );
};
