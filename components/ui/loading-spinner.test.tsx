import { describe, it, expect } from 'vitest';
import { render, screen } from '@/tests/utils/test-utils';
import { LoadingSpinner, PageLoading, InlineLoading } from './loading-spinner';

describe('LoadingSpinner', () => {
  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<LoadingSpinner />);
      const spinner = screen.getByRole('status');

      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
      expect(spinner).toHaveClass('animate-spin', 'rounded-full', 'border-b-2', 'border-primary');
    });

    it('renders with custom label', () => {
      const label = 'Loading data...';
      render(<LoadingSpinner label={label} />);

      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', label);
    });

    it('renders with custom className', () => {
      const customClass = 'custom-spinner-class';
      const { container } = render(<LoadingSpinner className={customClass} />);
      const wrapper = container.querySelector(`.${customClass}`);

      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('renders small size correctly', () => {
      render(<LoadingSpinner size="sm" />);
      const spinner = screen.getByRole('status');

      expect(spinner).toHaveClass('h-4', 'w-4', 'border-2');
    });

    it('renders medium size correctly (default)', () => {
      render(<LoadingSpinner size="md" />);
      const spinner = screen.getByRole('status');

      expect(spinner).toHaveClass('h-8', 'w-8', 'border-2');
    });

    it('renders large size correctly', () => {
      render(<LoadingSpinner size="lg" />);
      const spinner = screen.getByRole('status');

      expect(spinner).toHaveClass('h-12', 'w-12', 'border-3');
    });

    it('renders extra large size correctly', () => {
      render(<LoadingSpinner size="xl" />);
      const spinner = screen.getByRole('status');

      expect(spinner).toHaveClass('h-16', 'w-16', 'border-4');
    });
  });

  describe('Centered Prop', () => {
    it('renders centered when prop is true', () => {
      const { container } = render(<LoadingSpinner centered />);
      const centerWrapper = container.querySelector('.min-h-screen');

      expect(centerWrapper).toBeInTheDocument();
      expect(centerWrapper).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('renders inline when centered is false', () => {
      const { container } = render(<LoadingSpinner centered={false} />);
      const centerWrapper = container.querySelector('.min-h-screen');

      expect(centerWrapper).not.toBeInTheDocument();
    });
  });

  describe('Compound Components', () => {
    it('renders with label and centered', () => {
      const label = 'Processing...';
      render(<LoadingSpinner centered size="lg" label={label} />);

      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', label);
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('h-12', 'w-12');
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(<LoadingSpinner />);
      const spinner = screen.getByRole('status');

      expect(spinner).toHaveAttribute('role', 'status');
      expect(spinner).toHaveAttribute('aria-label');
    });

    it('uses label as aria-label when provided', () => {
      const label = 'Custom loading message';
      render(<LoadingSpinner label={label} />);

      expect(screen.getByRole('status')).toHaveAttribute('aria-label', label);
    });

    it('has default aria-label when no label provided', () => {
      render(<LoadingSpinner />);

      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading');
    });
  });
});

describe('PageLoading', () => {
  it('renders with centered and large size by default', () => {
    const { container } = render(<PageLoading />);

    const centerWrapper = container.querySelector('.min-h-screen');
    expect(centerWrapper).toBeInTheDocument();

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('h-12', 'w-12'); // large size
  });

  it('accepts and displays custom label', () => {
    const label = 'Loading page...';
    render(<PageLoading label={label} />);

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', label);
  });
});

describe('InlineLoading', () => {
  it('renders with small size by default', () => {
    render(<InlineLoading />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('h-4', 'w-4'); // small size
  });

  it('is not centered', () => {
    const { container } = render(<InlineLoading />);

    const centerWrapper = container.querySelector('.min-h-screen');
    expect(centerWrapper).not.toBeInTheDocument();
  });

  it('accepts and displays custom label', () => {
    const label = 'Loading inline...';
    render(<InlineLoading label={label} />);

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', label);
  });
});