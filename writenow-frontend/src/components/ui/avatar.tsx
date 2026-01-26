/**
 * Avatar component for displaying user profile images.
 */

import { cn } from '@/lib/utils';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  /** Image source URL */
  src?: string;
  /** Alt text for the image */
  alt?: string;
  /** Fallback text (first character will be shown when no image) */
  fallback: string;
  /** Size variant */
  size?: AvatarSize;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Size styles mapping.
 * Why: Consistent sizing that aligns with the design system's scale.
 * - sm (24px): For dense UI like lists
 * - md (32px): Default for most use cases
 * - lg (40px): For profile sections or emphasis
 */
const sizeStyles: Record<AvatarSize, string> = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
};

/**
 * Avatar component for displaying user profile images.
 * 
 * Why fallback: Gracefully handles missing images by showing
 * the first character of the fallback text (usually user name).
 * 
 * @example
 * ```tsx
 * <Avatar src="/path/to/image.jpg" alt="User" fallback="John Doe" />
 * <Avatar fallback="Jane Smith" size="lg" />
 * ```
 */
export function Avatar({
  src,
  alt,
  fallback,
  size = 'md',
  className,
}: AvatarProps) {
  return (
    <div
      className={cn(
        // Shape
        'rounded-full overflow-hidden',
        // Background and border for fallback state
        'bg-[var(--bg-active)] border border-[var(--border-subtle)]',
        // Flex centering for fallback text
        'flex items-center justify-center',
        // Text styling for fallback
        'text-[var(--fg-muted)] font-medium',
        // Size
        sizeStyles[size],
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt || fallback}
          className="w-full h-full object-cover"
          // Hide broken image icon if load fails
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        // Show first character of fallback, uppercased
        fallback.charAt(0).toUpperCase()
      )}
    </div>
  );
}
