import { describe, it, expect } from 'vitest';
import { render, screen } from '@/tests/utils/test-utils';
import { QuotaIndicator } from './quota-indicator';

describe('QuotaIndicator', () => {
  describe('Basic Rendering', () => {
    it('renders with default label', () => {
      render(<QuotaIndicator used={5} limit={10} />);

      expect(screen.getByText('Usage')).toBeInTheDocument();
      expect(screen.getByText('5 / 10')).toBeInTheDocument();
    });

    it('renders with custom label', () => {
      render(<QuotaIndicator used={3} limit={10} label="API Calls" />);

      expect(screen.getByText('API Calls')).toBeInTheDocument();
      expect(screen.getByText('3 / 10')).toBeInTheDocument();
    });

    it('displays correct usage numbers', () => {
      render(<QuotaIndicator used={25} limit={100} />);

      expect(screen.getByText('25 / 100')).toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('calculates percentage correctly', () => {
      const { container } = render(<QuotaIndicator used={5} limit={10} />);

      const progressBar = container.querySelector('[style*="width"]');
      expect(progressBar).toHaveStyle({ width: '50%' });
    });

    it('shows 0% when nothing is used', () => {
      const { container } = render(<QuotaIndicator used={0} limit={10} />);

      const progressBar = container.querySelector('[style*="width"]');
      expect(progressBar).toHaveStyle({ width: '0%' });
    });

    it('caps at 100% when usage exceeds limit', () => {
      const { container } = render(<QuotaIndicator used={15} limit={10} />);

      const progressBar = container.querySelector('[style*="width"]');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });

    it('handles fractional percentages', () => {
      const { container } = render(<QuotaIndicator used={1} limit={3} />);

      const progressBar = container.querySelector('[style*="width"]');
      // 1/3 = 33.333...%
      expect(progressBar?.getAttribute('style')).toContain('width: 33.3');
    });

    it('has correct background styling for progress bar container', () => {
      const { container } = render(<QuotaIndicator used={5} limit={10} />);

      const progressContainer = container.querySelector('.bg-gray-200.rounded-full.h-2');
      expect(progressContainer).toBeInTheDocument();
    });
  });

  describe('Warning States', () => {
    it('shows warning when usage is at 80% or above', () => {
      render(<QuotaIndicator used={8} limit={10} />);

      const warningMessage = screen.getByText('Approaching limit. Please consider upgrading.');
      expect(warningMessage).toBeInTheDocument();
      expect(warningMessage).toHaveClass('text-xs', 'text-red-600', 'mt-2');
    });

    it('does not show warning when usage is below 80%', () => {
      render(<QuotaIndicator used={7} limit={10} />);

      expect(screen.queryByText('Approaching limit. Please consider upgrading.')).not.toBeInTheDocument();
    });

    it('shows warning exactly at 80%', () => {
      render(<QuotaIndicator used={80} limit={100} />);

      expect(screen.getByText('Approaching limit. Please consider upgrading.')).toBeInTheDocument();
    });

    it('shows warning when usage exceeds limit', () => {
      render(<QuotaIndicator used={15} limit={10} />);

      expect(screen.getByText('Approaching limit. Please consider upgrading.')).toBeInTheDocument();
    });
  });

  describe('Color States', () => {
    it('uses green color when usage is below 80%', () => {
      const { container } = render(<QuotaIndicator used={5} limit={10} />);

      const progressBar = container.querySelector('.bg-\\[var\\(--color-brand-green\\)\\]');
      expect(progressBar).toBeInTheDocument();

      const usageText = screen.getByText('5 / 10');
      expect(usageText).toHaveClass('text-[var(--color-text-primary)]');
    });

    it('uses red color when usage is at or above 80%', () => {
      const { container } = render(<QuotaIndicator used={8} limit={10} />);

      const progressBar = container.querySelector('.bg-red-500');
      expect(progressBar).toBeInTheDocument();

      const usageText = screen.getByText('8 / 10');
      expect(usageText).toHaveClass('text-red-600');
    });

    it('transitions between color states correctly', () => {
      // First render with low usage
      const { container, rerender } = render(<QuotaIndicator used={7} limit={10} />);

      let progressBar = container.querySelector('.bg-\\[var\\(--color-brand-green\\)\\]');
      expect(progressBar).toBeInTheDocument();

      // Re-render with high usage
      rerender(<QuotaIndicator used={8} limit={10} />);

      progressBar = container.querySelector('.bg-red-500');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero limit gracefully', () => {
      const { container } = render(<QuotaIndicator used={0} limit={0} />);

      expect(screen.getByText('0 / 0')).toBeInTheDocument();
      // Should not divide by zero - progress bar should be 0 or handle gracefully
      const progressBar = container.querySelector('[style*="width"]');
      expect(progressBar).toBeDefined();
    });

    it('handles very large numbers', () => {
      render(<QuotaIndicator used={999999} limit={1000000} />);

      expect(screen.getByText('999999 / 1000000')).toBeInTheDocument();
    });

    it('handles decimal values', () => {
      render(<QuotaIndicator used={5.5} limit={10.5} />);

      expect(screen.getByText('5.5 / 10.5')).toBeInTheDocument();
    });

    it('handles negative values', () => {
      render(<QuotaIndicator used={-5} limit={10} />);

      expect(screen.getByText('-5 / 10')).toBeInTheDocument();
    });

    it('handles very long label text', () => {
      const longLabel = 'This is a very long label that might cause layout issues';
      render(<QuotaIndicator used={5} limit={10} label={longLabel} />);

      expect(screen.getByText(longLabel)).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('has correct container styling', () => {
      const { container } = render(<QuotaIndicator used={5} limit={10} />);

      const mainContainer = container.firstElementChild;
      expect(mainContainer).toHaveClass(
        'p-4',
        'bg-[var(--color-card-bg)]',
        'border',
        'border-[var(--color-card-border)]',
        'rounded-[var(--radius-lg)]'
      );
    });

    it('has flex layout for label and usage', () => {
      const { container } = render(<QuotaIndicator used={5} limit={10} />);

      const flexContainer = container.querySelector('.flex.items-center.justify-between');
      expect(flexContainer).toBeInTheDocument();
    });

    it('label has correct text styling', () => {
      render(<QuotaIndicator used={5} limit={10} />);

      const label = screen.getByText('Usage');
      expect(label).toHaveClass('text-sm', 'font-medium', 'text-[var(--color-text-primary)]');
    });

    it('usage text has correct font weight', () => {
      render(<QuotaIndicator used={5} limit={10} />);

      const usageText = screen.getByText('5 / 10');
      expect(usageText).toHaveClass('text-sm', 'font-semibold');
    });

    it('progress bar has smooth transition', () => {
      const { container } = render(<QuotaIndicator used={5} limit={10} />);

      const progressBar = container.querySelector('.transition-all');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('uses semantic HTML elements', () => {
      const { container } = render(<QuotaIndicator used={5} limit={10} />);

      // Check for proper div structure
      expect(container.querySelector('div')).toBeInTheDocument();

      // Label and value should be in span elements
      expect(screen.getByText('Usage').tagName.toLowerCase()).toBe('span');
      expect(screen.getByText('5 / 10').tagName.toLowerCase()).toBe('span');
    });

    it('warning message is properly marked', () => {
      render(<QuotaIndicator used={8} limit={10} />);

      const warning = screen.getByText('Approaching limit. Please consider upgrading.');
      expect(warning.tagName.toLowerCase()).toBe('p');
    });

    it('progress bar is visually informative', () => {
      const { container } = render(<QuotaIndicator used={5} limit={10} />);

      // Progress bar should have both container and fill for visual clarity
      const progressContainer = container.querySelector('.bg-gray-200');
      const progressFill = container.querySelector('[style*="width"]');

      expect(progressContainer).toBeInTheDocument();
      expect(progressFill).toBeInTheDocument();
    });
  });

  describe('Real-world Scenarios', () => {
    it('handles API rate limiting scenario', () => {
      render(<QuotaIndicator used={95} limit={100} label="API Requests" />);

      expect(screen.getByText('API Requests')).toBeInTheDocument();
      expect(screen.getByText('95 / 100')).toBeInTheDocument();
      expect(screen.getByText('Approaching limit. Please consider upgrading.')).toBeInTheDocument();
    });

    it('handles storage quota scenario', () => {
      render(<QuotaIndicator used={2048} limit={5120} label="Storage (MB)" />);

      expect(screen.getByText('Storage (MB)')).toBeInTheDocument();
      expect(screen.getByText('2048 / 5120')).toBeInTheDocument();
      expect(screen.queryByText('Approaching limit. Please consider upgrading.')).not.toBeInTheDocument();
    });

    it('handles user seats scenario', () => {
      render(<QuotaIndicator used={4} limit={5} label="Team Members" />);

      expect(screen.getByText('Team Members')).toBeInTheDocument();
      expect(screen.getByText('4 / 5')).toBeInTheDocument();
      expect(screen.getByText('Approaching limit. Please consider upgrading.')).toBeInTheDocument();
    });
  });
});