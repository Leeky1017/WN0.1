/**
 * Component state tests.
 * 
 * Why: Verifies that UI components handle all states correctly:
 * - default, hover, focus, active, disabled, loading
 * - error states for form components
 * - variants and sizes work correctly
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Divider } from '@/components/ui/divider';
import { Search } from 'lucide-react';

describe('Button Component', () => {
  describe('Variants', () => {
    it('renders primary variant', () => {
      render(<Button variant="primary">Primary</Button>);
      expect(screen.getByRole('button')).toHaveTextContent('Primary');
    });

    it('renders secondary variant (default)', () => {
      render(<Button>Secondary</Button>);
      expect(screen.getByRole('button')).toHaveTextContent('Secondary');
    });

    it('renders ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByRole('button')).toHaveTextContent('Ghost');
    });

    it('renders danger variant', () => {
      render(<Button variant="danger">Danger</Button>);
      expect(screen.getByRole('button')).toHaveTextContent('Danger');
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('h-7');
    });

    it('renders medium size (default)', () => {
      render(<Button>Medium</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('h-8');
    });

    it('renders large size', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('h-10');
    });
  });

  describe('States', () => {
    it('handles disabled state', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button.className).toContain('disabled:opacity-50');
    });

    it('handles loading state', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button.querySelector('svg.animate-spin')).toBeInTheDocument();
    });

    it('handles click events', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not fire click when disabled', () => {
      const handleClick = vi.fn();
      render(<Button disabled onClick={handleClick}>Disabled</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Icons', () => {
    it('renders with left icon', () => {
      render(<Button leftIcon={<Search data-testid="left-icon" />}>With Icon</Button>);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('renders with right icon', () => {
      render(<Button rightIcon={<Search data-testid="right-icon" />}>With Icon</Button>);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('hides icons when loading', () => {
      render(
        <Button 
          loading 
          leftIcon={<Search data-testid="left-icon" />}
          rightIcon={<Search data-testid="right-icon" />}
        >
          Loading
        </Button>
      );
      expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
    });
  });
});

describe('Input Component', () => {
  describe('Sizes', () => {
    it('renders small size', () => {
      render(<Input inputSize="sm" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('h-7');
    });

    it('renders medium size (default)', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('h-8');
    });

    it('renders large size', () => {
      render(<Input inputSize="lg" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('h-10');
    });
  });

  describe('States', () => {
    it('handles disabled state', () => {
      render(<Input disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('handles error state', () => {
      render(<Input error />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('border-[var(--error)]');
    });

    it('handles value changes', () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Icons', () => {
    it('renders with left icon', () => {
      render(<Input leftIcon={<Search data-testid="left-icon" />} />);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('renders with right icon', () => {
      render(<Input rightIcon={<Search data-testid="right-icon" />} />);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });
  });
});

describe('Textarea Component', () => {
  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Textarea onChange={handleChange} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'test content' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('handles disabled state', () => {
    render(<Textarea disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('handles error state', () => {
    render(<Textarea error />);
    const textarea = screen.getByRole('textbox');
    expect(textarea.className).toContain('border-[var(--error)]');
  });

  it('renders with autoResize enabled by default', () => {
    render(<Textarea />);
    const textarea = screen.getByRole('textbox');
    expect(textarea.className).toContain('resize-none');
  });

  it('allows manual resize when autoResize is disabled', () => {
    render(<Textarea autoResize={false} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea.className).toContain('resize-y');
  });
});

describe('Badge Component', () => {
  describe('Variants', () => {
    it('renders default variant', () => {
      render(<Badge>Default</Badge>);
      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('renders success variant', () => {
      render(<Badge variant="success">Success</Badge>);
      const badge = screen.getByText('Success');
      expect(badge.className).toContain('text-[var(--success)]');
    });

    it('renders warning variant', () => {
      render(<Badge variant="warning">Warning</Badge>);
      const badge = screen.getByText('Warning');
      expect(badge.className).toContain('text-[var(--warning)]');
    });

    it('renders error variant', () => {
      render(<Badge variant="error">Error</Badge>);
      const badge = screen.getByText('Error');
      expect(badge.className).toContain('text-[var(--error)]');
    });

    it('renders accent variant', () => {
      render(<Badge variant="accent">Accent</Badge>);
      const badge = screen.getByText('Accent');
      expect(badge.className).toContain('text-[var(--accent-default)]');
    });
  });
});

describe('Avatar Component', () => {
  describe('Sizes', () => {
    it('renders small size', () => {
      const { container } = render(<Avatar fallback="John" size="sm" />);
      const avatar = container.firstChild as HTMLElement;
      expect(avatar.className).toContain('w-6');
      expect(avatar.className).toContain('h-6');
    });

    it('renders medium size (default)', () => {
      const { container } = render(<Avatar fallback="John" />);
      const avatar = container.firstChild as HTMLElement;
      expect(avatar.className).toContain('w-8');
      expect(avatar.className).toContain('h-8');
    });

    it('renders large size', () => {
      const { container } = render(<Avatar fallback="John" size="lg" />);
      const avatar = container.firstChild as HTMLElement;
      expect(avatar.className).toContain('w-10');
      expect(avatar.className).toContain('h-10');
    });
  });

  describe('Fallback', () => {
    it('shows first character of fallback when no image', () => {
      render(<Avatar fallback="John Doe" />);
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('uppercases the fallback character', () => {
      render(<Avatar fallback="john" />);
      expect(screen.getByText('J')).toBeInTheDocument();
    });
  });

  describe('Image', () => {
    it('renders image when src is provided', () => {
      render(<Avatar src="test.jpg" fallback="John" />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'test.jpg');
    });
  });
});

describe('Divider Component', () => {
  it('renders horizontal divider by default', () => {
    const { container } = render(<Divider />);
    const divider = container.firstChild as HTMLElement;
    expect(divider.className).toContain('h-px');
    expect(divider.className).toContain('w-full');
    expect(divider).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('renders vertical divider', () => {
    const { container } = render(<Divider orientation="vertical" />);
    const divider = container.firstChild as HTMLElement;
    expect(divider.className).toContain('w-px');
    expect(divider.className).toContain('h-full');
    expect(divider).toHaveAttribute('aria-orientation', 'vertical');
  });
});
