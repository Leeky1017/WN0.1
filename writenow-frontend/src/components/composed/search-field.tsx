/**
 * SearchField component combining Input with search icon and clear button.
 */

import { memo, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { IconButton } from '@/components/ui/icon-button';
import { cn } from '@/lib/utils';

interface SearchFieldProps {
  /** Current search value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
  /** Size variant of the search field */
  size?: 'sm' | 'md';
}

/**
 * SearchField component combining Input with search icon and clear button.
 *
 * Why memo: Controlled input that receives onChange callback from parent.
 * Memoization prevents re-render when parent state changes unrelated to this field.
 *
 * Why composed: This pattern (icon + input + clear button) is used throughout
 * the app for search functionality. Composing it ensures consistency.
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState('');
 * <SearchField value={query} onChange={setQuery} placeholder="Search files..." />
 * ```
 */
export const SearchField = memo(function SearchField({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  size = 'sm',
}: SearchFieldProps) {
  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <div className={cn('relative', className)}>
      <Input
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        leftIcon={<Search size={14} className="text-[var(--fg-subtle)]" />}
        rightIcon={
          value ? (
            <IconButton
              icon={X}
              size="sm"
              variant="ghost"
              onClick={handleClear}
              className="absolute right-0.5 top-1/2 -translate-y-1/2 w-6 h-6"
              aria-label="Clear search"
            />
          ) : undefined
        }
        inputSize={size}
        className="pr-8"
      />
    </div>
  );
});
