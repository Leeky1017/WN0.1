/**
 * Composed component tests.
 * 
 * Why: Verifies that composed components (molecules) work correctly
 * with proper state handling, accessibility, and performance optimizations.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileItem } from '@/components/composed/file-item';
import { SearchField } from '@/components/composed/search-field';
import { MessageBubble } from '@/components/composed/message-bubble';
import { TooltipProvider } from '@/components/ui/tooltip';

/**
 * Wrapper component that provides necessary context for components
 * that use Tooltip (via IconButton).
 */
const withProviders = (ui: React.ReactElement) => {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
};

describe('FileItem Component', () => {
  describe('Rendering', () => {
    it('renders file with correct name', () => {
      render(<FileItem name="document.md" type="file" />);
      expect(screen.getByText('document.md')).toBeInTheDocument();
    });

    it('renders folder with correct name', () => {
      render(<FileItem name="projects" type="folder" />);
      expect(screen.getByText('projects')).toBeInTheDocument();
    });

    it('renders folder with bold text style', () => {
      render(<FileItem name="projects" type="folder" />);
      const nameElement = screen.getByText('projects');
      expect(nameElement.className).toContain('font-medium');
    });
  });

  describe('States', () => {
    it('applies selected state styling', () => {
      const { container } = render(
        <FileItem name="doc.md" type="file" selected />
      );
      const item = container.firstChild as HTMLElement;
      expect(item.className).toContain('bg-[var(--bg-active)]');
    });

    it('applies active state with ring', () => {
      const { container } = render(
        <FileItem name="doc.md" type="file" active />
      );
      const item = container.firstChild as HTMLElement;
      expect(item.className).toContain('ring-1');
    });

    it('shows modified indicator when modified', () => {
      render(<FileItem name="doc.md" type="file" modified />);
      const indicator = screen.getByTitle('Modified');
      expect(indicator).toBeInTheDocument();
    });

    it('shows active indicator when active and not modified', () => {
      render(<FileItem name="doc.md" type="file" active />);
      const indicator = screen.getByTitle('Active');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onSelect when clicked', () => {
      const handleSelect = vi.fn();
      render(
        <FileItem name="doc.md" type="file" onSelect={handleSelect} />
      );
      fireEvent.click(screen.getByRole('treeitem'));
      expect(handleSelect).toHaveBeenCalledTimes(1);
    });

    it('calls onDoubleClick when double-clicked', () => {
      const handleDoubleClick = vi.fn();
      render(
        <FileItem name="doc.md" type="file" onDoubleClick={handleDoubleClick} />
      );
      fireEvent.doubleClick(screen.getByRole('treeitem'));
      expect(handleDoubleClick).toHaveBeenCalledTimes(1);
    });

    it('calls onToggleExpand for folders when expand button clicked', () => {
      const handleToggle = vi.fn();
      render(
        <FileItem 
          name="projects" 
          type="folder" 
          onToggleExpand={handleToggle}
        />
      );
      // Click the expand button (first button within the item)
      const expandButton = screen.getByLabelText('Expand');
      fireEvent.click(expandButton);
      expect(handleToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has treeitem role', () => {
      render(<FileItem name="doc.md" type="file" />);
      expect(screen.getByRole('treeitem')).toBeInTheDocument();
    });

    it('has aria-selected for selected state', () => {
      render(<FileItem name="doc.md" type="file" selected />);
      expect(screen.getByRole('treeitem')).toHaveAttribute('aria-selected', 'true');
    });

    it('has aria-expanded for folders', () => {
      render(<FileItem name="projects" type="folder" expanded />);
      expect(screen.getByRole('treeitem')).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Indentation', () => {
    it('applies indentation based on depth', () => {
      const { container } = render(
        <FileItem name="nested.md" type="file" depth={2} />
      );
      const item = container.firstChild as HTMLElement;
      // depth=2 should have 2*16 + 8 = 40px padding
      expect(item.style.paddingLeft).toBe('40px');
    });
  });
});

describe('SearchField Component', () => {
  it('renders with placeholder', () => {
    render(<SearchField value="" onChange={() => {}} placeholder="Search..." />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('displays current value', () => {
    render(<SearchField value="test query" onChange={() => {}} />);
    expect(screen.getByDisplayValue('test query')).toBeInTheDocument();
  });

  it('calls onChange when input changes', () => {
    const handleChange = vi.fn();
    render(<SearchField value="" onChange={handleChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new' } });
    expect(handleChange).toHaveBeenCalledWith('new');
  });

  it('shows clear button when has value', () => {
    render(<SearchField value="test" onChange={() => {}} />);
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('hides clear button when empty', () => {
    render(<SearchField value="" onChange={() => {}} />);
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
  });

  it('clears value when clear button clicked', () => {
    const handleChange = vi.fn();
    render(<SearchField value="test" onChange={handleChange} />);
    fireEvent.click(screen.getByLabelText('Clear search'));
    expect(handleChange).toHaveBeenCalledWith('');
  });
});

describe('MessageBubble Component', () => {
  describe('User Messages', () => {
    it('renders user message with accent styling', () => {
      const { container } = withProviders(
        <MessageBubble role="user" content="Hello" />
      );
      const bubble = container.querySelector('.border-\\[var\\(--accent-muted\\)\\]');
      expect(bubble).toBeInTheDocument();
    });

    it('renders user message content', () => {
      withProviders(<MessageBubble role="user" content="Hello world" />);
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });
  });

  describe('Assistant Messages', () => {
    it('renders assistant message with avatar', () => {
      withProviders(<MessageBubble role="assistant" content="Hi there" />);
      // Assistant has a Bot icon avatar
      expect(screen.getByText('Hi there')).toBeInTheDocument();
    });

    it('renders complex content for assistant', () => {
      withProviders(
        <MessageBubble 
          role="assistant" 
          content={<div data-testid="complex">Complex content</div>}
        />
      );
      expect(screen.getByTestId('complex')).toBeInTheDocument();
    });
  });

  describe('Copy Functionality', () => {
    it('shows copy button for assistant messages on hover', () => {
      withProviders(<MessageBubble role="assistant" content="Copy me" />);
      // The copy button is visible on group-hover, test its existence
      const copyButton = screen.getByRole('button');
      expect(copyButton).toBeInTheDocument();
    });
  });

  describe('Timestamp', () => {
    it('renders timestamp when provided', () => {
      withProviders(
        <MessageBubble 
          role="assistant" 
          content="Hello" 
          timestamp="2:30 PM"
        />
      );
      expect(screen.getByText('2:30 PM')).toBeInTheDocument();
    });
  });
});
