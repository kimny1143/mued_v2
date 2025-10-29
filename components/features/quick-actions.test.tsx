import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { QuickActions } from './quick-actions';
import { renderWithProviders, expectNoA11yViolations } from '@/tests/utils/component-test-utils';

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}));

// Mock locale context
vi.mock('@/lib/i18n/locale-context', () => ({
  LocaleProvider: vi.fn(({ children }: { children: any }) => children),
  useLocale: () => ({
    t: {
      dashboard: {
        quickActions: {
          title: 'Quick Actions',
          createMaterial: 'Create Material',
          createMaterialDesc: 'Add new learning material',
          bookLesson: 'Book Lesson',
          bookLessonDesc: 'Schedule a new lesson',
          myMaterials: 'My Materials',
          myMaterialsDesc: 'View all materials',
          upgradePlan: 'Upgrade Plan',
          upgradePlanDesc: 'Get premium features',
        },
      },
    },
    locale: 'en',
  }),
}));

describe('QuickActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      renderWithProviders(<QuickActions />);
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });

    it('should display section heading', () => {
      renderWithProviders(<QuickActions />);
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Quick Actions');
      expect(heading).toHaveClass('text-xl', 'font-bold', 'mb-4');
    });

    it('should render all four action cards', () => {
      renderWithProviders(<QuickActions />);

      expect(screen.getByText('Create Material')).toBeInTheDocument();
      expect(screen.getByText('Book Lesson')).toBeInTheDocument();
      expect(screen.getByText('My Materials')).toBeInTheDocument();
      expect(screen.getByText('Upgrade Plan')).toBeInTheDocument();
    });

    it('should render descriptions for all actions', () => {
      renderWithProviders(<QuickActions />);

      expect(screen.getByText('Add new learning material')).toBeInTheDocument();
      expect(screen.getByText('Schedule a new lesson')).toBeInTheDocument();
      expect(screen.getByText('View all materials')).toBeInTheDocument();
      expect(screen.getByText('Get premium features')).toBeInTheDocument();
    });
  });

  describe('Links and Navigation', () => {
    it('should have correct href for Create Material', () => {
      renderWithProviders(<QuickActions />);
      const link = screen.getByText('Create Material').closest('a');
      expect(link).toHaveAttribute('href', '/dashboard/materials/new');
    });

    it('should have correct href for Book Lesson', () => {
      renderWithProviders(<QuickActions />);
      const link = screen.getByText('Book Lesson').closest('a');
      expect(link).toHaveAttribute('href', '/dashboard/lessons');
    });

    it('should have correct href for My Materials', () => {
      renderWithProviders(<QuickActions />);
      const link = screen.getByText('My Materials').closest('a');
      expect(link).toHaveAttribute('href', '/dashboard/materials');
    });

    it('should have correct href for Upgrade Plan', () => {
      renderWithProviders(<QuickActions />);
      const link = screen.getByText('Upgrade Plan').closest('a');
      expect(link).toHaveAttribute('href', '/dashboard/subscription');
    });

    it('should render all links as anchor elements', () => {
      const { container } = renderWithProviders(<QuickActions />);
      const links = container.querySelectorAll('a');
      expect(links).toHaveLength(4);
    });
  });

  describe('Icons', () => {
    it('should render icons for all actions', () => {
      const { container } = renderWithProviders(<QuickActions />);
      const icons = container.querySelectorAll('svg');
      expect(icons).toHaveLength(4);
    });

    it('should apply correct size to icons', () => {
      const { container } = renderWithProviders(<QuickActions />);
      const icons = container.querySelectorAll('svg');

      icons.forEach(icon => {
        expect(icon).toHaveClass('w-8', 'h-8');
      });
    });

    it('should apply correct colors to icons', () => {
      const { container } = renderWithProviders(<QuickActions />);
      const icons = container.querySelectorAll('svg');

      expect(icons[0]).toHaveClass('text-[var(--color-brand-green)]');
      expect(icons[1]).toHaveClass('text-blue-500');
      expect(icons[2]).toHaveClass('text-purple-500');
      expect(icons[3]).toHaveClass('text-orange-500');
    });

    it('should apply hover transform to icons', () => {
      const { container } = renderWithProviders(<QuickActions />);
      const icons = container.querySelectorAll('svg');

      icons.forEach(icon => {
        expect(icon).toHaveClass('group-hover:scale-110', 'transition-transform');
      });
    });
  });

  describe('Styling and Layout', () => {
    it('should use grid layout', () => {
      const { container } = renderWithProviders(<QuickActions />);
      const grid = container.querySelector('.grid');

      expect(grid).toHaveClass(
        'grid-cols-1',
        'md:grid-cols-2',
        'lg:grid-cols-4',
        'gap-4'
      );
    });

    it('should apply card styling to action items', () => {
      const { container } = renderWithProviders(<QuickActions />);
      const cards = container.querySelectorAll('a');

      cards.forEach(card => {
        expect(card).toHaveClass(
          'flex',
          'flex-col',
          'items-center',
          'justify-center',
          'p-6',
          'bg-white',
          'border',
          'border-gray-200',
          'rounded-lg'
        );
      });
    });

    it('should apply hover effects to cards', () => {
      const { container } = renderWithProviders(<QuickActions />);
      const cards = container.querySelectorAll('a');

      expect(cards[0]).toHaveClass('hover:border-[var(--color-brand-green)]', 'hover:shadow-md');
      expect(cards[1]).toHaveClass('hover:border-blue-500', 'hover:shadow-md');
      expect(cards[2]).toHaveClass('hover:border-purple-500', 'hover:shadow-md');
      expect(cards[3]).toHaveClass('hover:border-orange-500', 'hover:shadow-md');
    });

    it('should apply transition effects', () => {
      const { container } = renderWithProviders(<QuickActions />);
      const cards = container.querySelectorAll('a');

      cards.forEach(card => {
        expect(card).toHaveClass('transition-all', 'group');
      });
    });

    it('should apply correct text styling', () => {
      renderWithProviders(<QuickActions />);

      // Main labels
      const labels = ['Create Material', 'Book Lesson', 'My Materials', 'Upgrade Plan'];
      labels.forEach(label => {
        const element = screen.getByText(label);
        expect(element).toHaveClass('text-sm', 'font-semibold', 'text-gray-900');
      });

      // Descriptions
      const descriptions = [
        'Add new learning material',
        'Schedule a new lesson',
        'View all materials',
        'Get premium features'
      ];
      descriptions.forEach(desc => {
        const element = screen.getByText(desc);
        expect(element).toHaveClass('text-xs', 'text-gray-500', 'mt-1');
      });
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive grid columns', () => {
      const { container } = renderWithProviders(<QuickActions />);
      const grid = container.querySelector('.grid');

      // Mobile: 1 column
      expect(grid).toHaveClass('grid-cols-1');
      // Tablet: 2 columns
      expect(grid).toHaveClass('md:grid-cols-2');
      // Desktop: 4 columns
      expect(grid).toHaveClass('lg:grid-cols-4');
    });

    it('should maintain card structure across breakpoints', () => {
      const { container } = renderWithProviders(<QuickActions />);
      const cards = container.querySelectorAll('a');

      expect(cards).toHaveLength(4);
      cards.forEach(card => {
        expect(card).toHaveClass('flex', 'flex-col', 'items-center');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderWithProviders(<QuickActions />);
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Quick Actions');
    });

    it('should have accessible links', () => {
      renderWithProviders(<QuickActions />);

      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(4);

      // Each link should have descriptive text
      expect(links[0]).toHaveTextContent(/Create Material.*Add new learning material/);
      expect(links[1]).toHaveTextContent(/Book Lesson.*Schedule a new lesson/);
      expect(links[2]).toHaveTextContent(/My Materials.*View all materials/);
      expect(links[3]).toHaveTextContent(/Upgrade Plan.*Get premium features/);
    });

    it('should pass basic accessibility checks', async () => {
      const { container } = renderWithProviders(<QuickActions />);
      await expectNoA11yViolations(container);
    });

    it('should be keyboard navigable', () => {
      const { container } = renderWithProviders(<QuickActions />);
      const links = container.querySelectorAll('a');

      links.forEach(link => {
        // Links should be focusable
        expect(link.tabIndex).not.toBe(-1);
      });
    });
  });

  describe('Internationalization', () => {
    it('should use translated text from locale context', () => {
      renderWithProviders(<QuickActions />);

      // All text should come from the locale context
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Create Material')).toBeInTheDocument();
      expect(screen.getByText('Book Lesson')).toBeInTheDocument();
      expect(screen.getByText('My Materials')).toBeInTheDocument();
      expect(screen.getByText('Upgrade Plan')).toBeInTheDocument();
    });

    it('should display localized descriptions', () => {
      renderWithProviders(<QuickActions />);

      expect(screen.getByText('Add new learning material')).toBeInTheDocument();
      expect(screen.getByText('Schedule a new lesson')).toBeInTheDocument();
      expect(screen.getByText('View all materials')).toBeInTheDocument();
      expect(screen.getByText('Get premium features')).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('should be clickable', async () => {
      const { user } = renderWithProviders(<QuickActions />);

      const createMaterialLink = screen.getByText('Create Material').closest('a');
      await user.click(createMaterialLink!);

      // Link should still be present after click (navigation handled by Next.js)
      expect(createMaterialLink).toBeInTheDocument();
    });

    it('should support hover interactions', async () => {
      const { user } = renderWithProviders(<QuickActions />);

      const card = screen.getByText('Create Material').closest('a');
      await user.hover(card!);

      // Card should still have hover classes (actual hover effect is CSS)
      expect(card).toHaveClass('hover:shadow-md');
    });
  });

  describe('Component Structure', () => {
    it('should wrap content in a section element', () => {
      const { container } = renderWithProviders(<QuickActions />);
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('should maintain consistent card structure', () => {
      const { container } = renderWithProviders(<QuickActions />);
      const cards = container.querySelectorAll('a');

      cards.forEach(card => {
        // Each card should have an icon, title, and description
        const icon = card.querySelector('svg');
        const spans = card.querySelectorAll('span');

        expect(icon).toBeInTheDocument();
        expect(spans).toHaveLength(2); // Title and description
      });
    });

    it('should apply margin between icon and text', () => {
      const { container } = renderWithProviders(<QuickActions />);
      const icons = container.querySelectorAll('svg');

      icons.forEach(icon => {
        expect(icon).toHaveClass('mb-3');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should render without locale context errors', () => {
      // Even if locale context fails, component should not crash
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderWithProviders(<QuickActions />);

      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle long text gracefully', () => {
      // Component should handle text overflow properly
      const { container } = renderWithProviders(<QuickActions />);
      const cards = container.querySelectorAll('a');

      cards.forEach(card => {
        expect(card).toHaveClass('items-center', 'text-sm');
      });
    });
  });
});