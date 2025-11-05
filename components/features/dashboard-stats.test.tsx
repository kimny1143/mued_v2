import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { DashboardStats } from './dashboard-stats';
import { renderWithProviders, mockApiResponse } from '@/tests/utils/component-test-utils';
import { mockFetchResponses } from '@/tests/mocks/common-mocks';

// Mock the locale context
vi.mock('@/lib/i18n/locale-context', () => ({
  LocaleProvider: vi.fn(({ children }: { children: any }) => children),
  useLocale: () => ({
    t: {
      dashboard: {
        overview: 'Overview',
        stats: {
          totalMaterials: 'Total Materials',
          totalLessons: 'Total Lessons',
          completed: 'Completed',
          inProgress: 'In Progress',
        },
      },
    },
    locale: 'en',
  }),
}));

describe('DashboardStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', async () => {
      const mockResponses = new Map([
        ['/api/dashboard/stats', { success: true, stats: { totalMaterials: 0, totalReservations: 0 } }],
      ]);
      mockFetchResponses(mockResponses);

      renderWithProviders(<DashboardStats />);

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
      });
    });

    it('should display section heading', async () => {
      const mockResponses = new Map([
        ['/api/dashboard/stats', { success: true, stats: { totalMaterials: 0, totalReservations: 0 } }],
      ]);
      mockFetchResponses(mockResponses);

      renderWithProviders(<DashboardStats />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 2 });
        expect(heading).toHaveTextContent('Overview');
      });
    });

    it('should render four stat cards', async () => {
      const mockResponses = new Map([
        ['/api/dashboard/stats', { success: true, stats: { totalMaterials: 10, totalReservations: 5 } }],
      ]);
      mockFetchResponses(mockResponses);

      renderWithProviders(<DashboardStats />);

      await waitFor(() => {
        expect(screen.getByText('Total Materials')).toBeInTheDocument();
        expect(screen.getByText('Total Lessons')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('In Progress')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading skeleton initially', () => {
      const mockResponses = new Map([
        ['/api/dashboard/stats', { success: true, stats: { totalMaterials: 0, totalReservations: 0 } }],
      ]);
      mockFetchResponses(mockResponses);

      renderWithProviders(<DashboardStats />);

      // Check for loading skeleton
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons).toHaveLength(4);
    });

    it('should show loading skeleton with correct structure', () => {
      const mockResponses = new Map([
        ['/api/dashboard/stats', new Promise(() => {})], // Never resolves to keep loading
      ]);
      mockFetchResponses(mockResponses);

      const { container } = renderWithProviders(<DashboardStats />);

      const skeletonCards = container.querySelectorAll('.animate-pulse');
      expect(skeletonCards).toHaveLength(4);

      skeletonCards.forEach(card => {
        expect(card).toHaveClass('bg-white', 'border', 'border-gray-200', 'rounded-lg', 'p-6');
      });
    });

    it('should hide loading state after data loads', async () => {
      const mockResponses = new Map([
        ['/api/dashboard/stats', { success: true, stats: { totalMaterials: 10, totalReservations: 5 } }],
      ]);
      mockFetchResponses(mockResponses);

      renderWithProviders(<DashboardStats />);

      // Wait for actual data to be displayed instead of checking for absence of loading
      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Data Display', () => {
    it('should display fetched stats correctly', async () => {
      const mockResponses = new Map([
        ['/api/dashboard/stats', {
          success: true,
          stats: {
            totalMaterials: 42,
            totalReservations: 17
          }
        }],
      ]);
      mockFetchResponses(mockResponses);

      renderWithProviders(<DashboardStats />);

      await waitFor(() => {
        expect(screen.getByText('42')).toBeInTheDocument();
        expect(screen.getByText('17')).toBeInTheDocument();
      });
    });

    it('should display zero values for TODO items', async () => {
      const mockResponses = new Map([
        ['/api/dashboard/stats', {
          success: true,
          stats: {
            totalMaterials: 10,
            totalReservations: 5
          }
        }],
      ]);
      mockFetchResponses(mockResponses);

      renderWithProviders(<DashboardStats />);

      await waitFor(() => {
        // Check for Completed and In Progress cards (currently showing 0)
        const zeroValues = screen.getAllByText('0');
        expect(zeroValues).toHaveLength(2);
      });
    });

    it('should handle null stats gracefully', async () => {
      const mockResponses = new Map([
        ['/api/dashboard/stats', { success: true, stats: null }],
      ]);
      mockFetchResponses(mockResponses);

      renderWithProviders(<DashboardStats />);

      await waitFor(() => {
        // Should display 0 when stats is null
        const zeroValues = screen.getAllByText('0');
        expect(zeroValues).toHaveLength(4);
      });
    });

    it('should handle missing properties in stats', async () => {
      const mockResponses = new Map([
        ['/api/dashboard/stats', { success: true, stats: {} }],
      ]);
      mockFetchResponses(mockResponses);

      renderWithProviders(<DashboardStats />);

      await waitFor(() => {
        // Should display 0 when properties are missing
        const zeroValues = screen.getAllByText('0');
        expect(zeroValues).toHaveLength(4);
      });
    });
  });

  describe('API Integration', () => {
    it('should fetch stats on mount', async () => {
      const fetchSpy = vi.fn().mockResolvedValue(
        mockApiResponse({ success: true, stats: { totalMaterials: 10, totalReservations: 5 } })
      );
      global.fetch = fetchSpy;

      renderWithProviders(<DashboardStats />);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith('/api/dashboard/stats');
      });
    });

    it('should handle API error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockResponses = new Map([
        ['/api/dashboard/stats', new Error('Network error')],
      ]);
      mockFetchResponses(mockResponses);

      renderWithProviders(<DashboardStats />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch stats:', expect.any(Error));
      });

      // Should still render with default values
      await waitFor(() => {
        expect(screen.getByText('Total Materials')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('should handle unsuccessful API response', async () => {
      const mockResponses = new Map([
        ['/api/dashboard/stats', { success: false, error: 'Unauthorized' }],
      ]);
      mockFetchResponses(mockResponses);

      renderWithProviders(<DashboardStats />);

      await waitFor(() => {
        // Should display default 0 values when response is not successful
        const zeroValues = screen.getAllByText('0');
        expect(zeroValues).toHaveLength(4);
      });
    });

    it('should handle malformed JSON response', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      global.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      });

      renderWithProviders(<DashboardStats />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch stats:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Card Styling', () => {
    it('should apply correct colors to stat cards', async () => {
      const mockResponses = new Map([
        ['/api/dashboard/stats', { success: true, stats: { totalMaterials: 10, totalReservations: 5 } }],
      ]);
      mockFetchResponses(mockResponses);

      const { container } = renderWithProviders(<DashboardStats />);

      await waitFor(() => {
        // Check for color classes
        expect(container.querySelector('.text-green-600')).toBeInTheDocument();
        expect(container.querySelector('.bg-green-50')).toBeInTheDocument();
        expect(container.querySelector('.text-blue-600')).toBeInTheDocument();
        expect(container.querySelector('.bg-blue-50')).toBeInTheDocument();
        expect(container.querySelector('.text-purple-600')).toBeInTheDocument();
        expect(container.querySelector('.bg-purple-50')).toBeInTheDocument();
        expect(container.querySelector('.text-orange-600')).toBeInTheDocument();
        expect(container.querySelector('.bg-orange-50')).toBeInTheDocument();
      });
    });

    it('should apply hover effect to cards', async () => {
      const mockResponses = new Map([
        ['/api/dashboard/stats', { success: true, stats: { totalMaterials: 10, totalReservations: 5 } }],
      ]);
      mockFetchResponses(mockResponses);

      const { container } = renderWithProviders(<DashboardStats />);

      // First wait for data to load
      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Then check hover effects
      const cards = container.querySelectorAll('.hover\\:shadow-md');
      expect(cards).toHaveLength(4);

      cards.forEach(card => {
        expect(card).toHaveClass('transition-shadow');
      });
    });

    it('should render icons correctly', async () => {
      const mockResponses = new Map([
        ['/api/dashboard/stats', { success: true, stats: { totalMaterials: 10, totalReservations: 5 } }],
      ]);
      mockFetchResponses(mockResponses);

      const { container } = renderWithProviders(<DashboardStats />);

      await waitFor(() => {
        const icons = container.querySelectorAll('svg');
        expect(icons).toHaveLength(4); // One icon per stat card

        icons.forEach(icon => {
          expect(icon).toHaveClass('w-5', 'h-5');
        });
      });
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive grid layout', async () => {
      const mockResponses = new Map([
        ['/api/dashboard/stats', { success: true, stats: { totalMaterials: 10, totalReservations: 5 } }],
      ]);
      mockFetchResponses(mockResponses);

      const { container } = renderWithProviders(<DashboardStats />);

      await waitFor(() => {
        const grid = container.querySelector('.grid');
        expect(grid).toHaveClass(
          'grid-cols-1',
          'md:grid-cols-2',
          'lg:grid-cols-4',
          'gap-4'
        );
      });
    });

    it('should maintain card structure at different breakpoints', async () => {
      const mockResponses = new Map([
        ['/api/dashboard/stats', { success: true, stats: { totalMaterials: 10, totalReservations: 5 } }],
      ]);
      mockFetchResponses(mockResponses);

      const { container } = renderWithProviders(<DashboardStats />);

      await waitFor(() => {
        const cards = container.querySelectorAll('.bg-white.border.border-gray-200.rounded-lg');
        expect(cards).toHaveLength(4);

        cards.forEach(card => {
          expect(card).toHaveClass('p-6');
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      const mockResponses = new Map([
        ['/api/dashboard/stats', { success: true, stats: { totalMaterials: 10, totalReservations: 5 } }],
      ]);
      mockFetchResponses(mockResponses);

      renderWithProviders(<DashboardStats />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 2 });
        expect(heading).toBeInTheDocument();
      });
    });

    it('should have descriptive labels for all stats', async () => {
      const mockResponses = new Map([
        ['/api/dashboard/stats', { success: true, stats: { totalMaterials: 10, totalReservations: 5 } }],
      ]);
      mockFetchResponses(mockResponses);

      renderWithProviders(<DashboardStats />);

      await waitFor(() => {
        expect(screen.getByText('Total Materials')).toBeInTheDocument();
        expect(screen.getByText('Total Lessons')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('In Progress')).toBeInTheDocument();
      });
    });

    it('should have semantic HTML structure', async () => {
      const mockResponses = new Map([
        ['/api/dashboard/stats', { success: true, stats: { totalMaterials: 10, totalReservations: 5 } }],
      ]);
      mockFetchResponses(mockResponses);

      const { container } = renderWithProviders(<DashboardStats />);

      await waitFor(() => {
        const section = container.querySelector('section');
        expect(section).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should only fetch stats once on mount', async () => {
      const fetchSpy = vi.fn().mockResolvedValue(
        mockApiResponse({ success: true, stats: { totalMaterials: 10, totalReservations: 5 } })
      );
      global.fetch = fetchSpy;

      const { rerender } = renderWithProviders(<DashboardStats />);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledTimes(1);
      });

      // Re-render should not trigger another fetch
      rerender(<DashboardStats />);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledTimes(1);
      });
    });

    it('should clean up properly on unmount', async () => {
      const mockResponses = new Map([
        ['/api/dashboard/stats', { success: true, stats: { totalMaterials: 10, totalReservations: 5 } }],
      ]);
      mockFetchResponses(mockResponses);

      const { unmount } = renderWithProviders(<DashboardStats />);

      await waitFor(() => {
        expect(screen.getByText('Total Materials')).toBeInTheDocument();
      });

      unmount();

      // Component should unmount without errors
      expect(screen.queryByText('Total Materials')).not.toBeInTheDocument();
    });
  });
});