import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/tests/utils/test-utils';
import { ErrorBoundary, PageError, InlineError } from './error-boundary';

describe('ErrorBoundary', () => {
  describe('Basic Rendering', () => {
    it('renders with Error object', () => {
      const error = new Error('Test error message');
      render(<ErrorBoundary error={error} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('renders with string error', () => {
      const error = 'String error message';
      render(<ErrorBoundary error={error} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('String error message')).toBeInTheDocument();
    });

    it('renders with custom title', () => {
      const error = new Error('Test error');
      const customTitle = 'Custom Error Title';
      render(<ErrorBoundary error={error} title={customTitle} />);

      expect(screen.getByText(customTitle)).toBeInTheDocument();
      expect(screen.queryByText('エラーが発生しました')).not.toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('does not show retry button by default', () => {
      const error = new Error('Test error');
      render(<ErrorBoundary error={error} />);

      expect(screen.queryByText('再試行')).not.toBeInTheDocument();
    });

    it('shows retry button when showRetry is true and onRetry is provided', () => {
      const error = new Error('Test error');
      const onRetry = vi.fn();
      render(<ErrorBoundary error={error} showRetry onRetry={onRetry} />);

      const retryButton = screen.getByText('再試行');
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toHaveAttribute('type', 'button');
    });

    it('does not show retry button when showRetry is true but onRetry is not provided', () => {
      const error = new Error('Test error');
      render(<ErrorBoundary error={error} showRetry />);

      expect(screen.queryByText('再試行')).not.toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', () => {
      const error = new Error('Test error');
      const onRetry = vi.fn();
      render(<ErrorBoundary error={error} showRetry onRetry={onRetry} />);

      const retryButton = screen.getByText('再試行');
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('retry button has correct styling', () => {
      const error = new Error('Test error');
      const onRetry = vi.fn();
      render(<ErrorBoundary error={error} showRetry onRetry={onRetry} />);

      const retryButton = screen.getByText('再試行');
      expect(retryButton).toHaveClass('mt-4');
      expect(retryButton.tagName.toLowerCase()).toBe('button');
    });
  });

  describe('Error Message Handling', () => {
    it('correctly extracts message from Error object', () => {
      const errorMessage = 'Detailed error description';
      const error = new Error(errorMessage);
      render(<ErrorBoundary error={error} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('displays string error as-is', () => {
      const errorMessage = 'Simple string error';
      render(<ErrorBoundary error={errorMessage} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('handles Error with empty message', () => {
      const error = new Error('');
      render(<ErrorBoundary error={error} />);

      // Should still render the component structure
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    });
  });

  describe('Alert Component Integration', () => {
    it('renders with destructive variant', () => {
      const error = new Error('Test error');
      render(<ErrorBoundary error={error} />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-destructive/50', 'text-destructive');
    });

    it('includes alert icon', () => {
      const error = new Error('Test error');
      const { container } = render(<ErrorBoundary error={error} />);

      // Check for Lucide AlertCircle icon
      const icon = container.querySelector('svg.lucide-circle-alert');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('h-4', 'w-4');
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA role', () => {
      const error = new Error('Test error');
      render(<ErrorBoundary error={error} />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('retry button is keyboard accessible', () => {
      const error = new Error('Test error');
      const onRetry = vi.fn();
      render(<ErrorBoundary error={error} showRetry onRetry={onRetry} />);

      const retryButton = screen.getByText('再試行');
      expect(retryButton).toHaveAttribute('type', 'button');

      // Simulate keyboard interaction
      fireEvent.keyDown(retryButton, { key: 'Enter' });
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalled();
    });
  });
});

describe('PageError', () => {
  it('renders error in centered layout', () => {
    const error = new Error('Page error');
    const { container } = render(<PageError error={error} />);

    const centerWrapper = container.querySelector('.min-h-screen');
    expect(centerWrapper).toBeInTheDocument();
    expect(centerWrapper).toHaveClass('flex', 'items-center', 'justify-center');
  });

  it('includes retry button by default', () => {
    const error = new Error('Page error');
    const onRetry = vi.fn();
    render(<PageError error={error} onRetry={onRetry} />);

    expect(screen.getByText('再試行')).toBeInTheDocument();
  });

  it('passes onRetry callback correctly', () => {
    const error = new Error('Page error');
    const onRetry = vi.fn();
    render(<PageError error={error} onRetry={onRetry} />);

    fireEvent.click(screen.getByText('再試行'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('has max width constraint', () => {
    const error = new Error('Page error');
    const { container } = render(<PageError error={error} />);

    const wrapper = container.querySelector('.max-w-md');
    expect(wrapper).toBeInTheDocument();
  });
});

describe('InlineError', () => {
  it('renders error inline without centering', () => {
    const error = new Error('Inline error');
    const { container } = render(<InlineError error={error} />);

    const centerWrapper = container.querySelector('.min-h-screen');
    expect(centerWrapper).not.toBeInTheDocument();
  });

  it('does not include retry button', () => {
    const error = new Error('Inline error');
    render(<InlineError error={error} />);

    expect(screen.queryByText('再試行')).not.toBeInTheDocument();
  });

  it('accepts string error', () => {
    const error = 'String inline error';
    render(<InlineError error={error} />);

    expect(screen.getByText(error)).toBeInTheDocument();
  });

  it('accepts Error object', () => {
    const error = new Error('Error object inline');
    render(<InlineError error={error} />);

    expect(screen.getByText('Error object inline')).toBeInTheDocument();
  });
});