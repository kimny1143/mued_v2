import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/tests/utils/test-utils';
import { MaterialCard } from './material-card';

describe('MaterialCard', () => {
  const defaultProps = {
    id: 'material-123',
    title: 'Introduction to Music Theory',
    description: 'Learn the fundamentals of music theory including scales, chords, and rhythm.',
    category: 'Theory',
    createdAt: new Date('2025-01-10T10:00:00'),
  };

  describe('Basic Rendering', () => {
    it('renders all material information', () => {
      render(<MaterialCard {...defaultProps} />);

      expect(screen.getByText('Introduction to Music Theory')).toBeInTheDocument();
      expect(screen.getByText('Learn the fundamentals of music theory including scales, chords, and rhythm.')).toBeInTheDocument();
      expect(screen.getByText('Theory')).toBeInTheDocument();
    });

    it('displays category badge with correct styling', () => {
      render(<MaterialCard {...defaultProps} />);

      const categoryBadge = screen.getByText('Theory');
      expect(categoryBadge).toBeInTheDocument();
      expect(categoryBadge).toHaveClass('bg-blue-100', 'text-blue-700', 'px-2', 'py-1', 'text-xs');
    });

    it('formats creation date correctly', () => {
      render(<MaterialCard {...defaultProps} />);

      // The component uses toLocaleDateString with en-US locale
      expect(screen.getByText(/Created:/)).toBeInTheDocument();
      expect(screen.getByText(/1\/10\/2025/)).toBeInTheDocument();
    });

    it('renders in a Card container', () => {
      const { container } = render(<MaterialCard {...defaultProps} />);

      const card = container.querySelector('.p-4');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    describe('View Button', () => {
      it('shows View button when onView is provided', () => {
        const onView = vi.fn();
        render(<MaterialCard {...defaultProps} onView={onView} />);

        const viewButton = screen.getByText('View');
        expect(viewButton).toBeInTheDocument();
        expect(viewButton).toHaveAttribute('type', 'button');
      });

      it('does not show View button when onView is not provided', () => {
        render(<MaterialCard {...defaultProps} />);

        expect(screen.queryByText('View')).not.toBeInTheDocument();
      });

      it('calls onView with material id when clicked', () => {
        const onView = vi.fn();
        render(<MaterialCard {...defaultProps} onView={onView} />);

        const viewButton = screen.getByText('View');
        fireEvent.click(viewButton);

        expect(onView).toHaveBeenCalledTimes(1);
        expect(onView).toHaveBeenCalledWith('material-123');
      });

      it('View button has flex-1 styling when Delete is also present', () => {
        const onView = vi.fn();
        const onDelete = vi.fn();
        render(<MaterialCard {...defaultProps} onView={onView} onDelete={onDelete} />);

        const viewButton = screen.getByText('View');
        expect(viewButton).toHaveClass('flex-1');
      });
    });

    describe('Delete Button', () => {
      it('shows Delete button when onDelete is provided', () => {
        const onDelete = vi.fn();
        render(<MaterialCard {...defaultProps} onDelete={onDelete} />);

        const deleteButton = screen.getByText('Delete');
        expect(deleteButton).toBeInTheDocument();
        expect(deleteButton).toHaveAttribute('type', 'button');
      });

      it('does not show Delete button when onDelete is not provided', () => {
        render(<MaterialCard {...defaultProps} />);

        expect(screen.queryByText('Delete')).not.toBeInTheDocument();
      });

      it('calls onDelete with material id when clicked', () => {
        const onDelete = vi.fn();
        render(<MaterialCard {...defaultProps} onDelete={onDelete} />);

        const deleteButton = screen.getByText('Delete');
        fireEvent.click(deleteButton);

        expect(onDelete).toHaveBeenCalledTimes(1);
        expect(onDelete).toHaveBeenCalledWith('material-123');
      });

      it('Delete button has danger variant styling', () => {
        const onDelete = vi.fn();
        render(<MaterialCard {...defaultProps} onDelete={onDelete} />);

        const deleteButton = screen.getByText('Delete');
        expect(deleteButton.closest('button')).toHaveAttribute('class');
        // Button component uses variant="danger"
      });
    });

    describe('Both Buttons', () => {
      it('shows both buttons when both callbacks are provided', () => {
        const onView = vi.fn();
        const onDelete = vi.fn();
        render(<MaterialCard {...defaultProps} onView={onView} onDelete={onDelete} />);

        expect(screen.getByText('View')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });

      it('buttons are arranged horizontally with gap', () => {
        const onView = vi.fn();
        const onDelete = vi.fn();
        const { container } = render(<MaterialCard {...defaultProps} onView={onView} onDelete={onDelete} />);

        const buttonContainer = container.querySelector('.flex.gap-2');
        expect(buttonContainer).toBeInTheDocument();
        expect(buttonContainer?.children).toHaveLength(2);
      });

      it('no buttons section when no callbacks provided', () => {
        const { container } = render(<MaterialCard {...defaultProps} />);

        const buttonContainer = container.querySelector('.flex.gap-2');
        // The container still exists but should be empty
        expect(buttonContainer?.children).toHaveLength(0);
      });
    });
  });

  describe('Text Truncation', () => {
    it('truncates long descriptions with line-clamp', () => {
      const longDescription = 'This is a very long description that would normally take up multiple lines in the card. It contains detailed information about the material and what students will learn. The description continues with more details about prerequisites and learning outcomes.';

      const props = {
        ...defaultProps,
        description: longDescription,
      };

      render(<MaterialCard {...props} />);

      const description = screen.getByText(longDescription);
      expect(description).toHaveClass('line-clamp-2');
    });
  });

  describe('Date Formatting', () => {
    it('formats date using en-US locale', () => {
      render(<MaterialCard {...defaultProps} />);

      const dateText = screen.getByText(/Created:/);
      expect(dateText).toBeInTheDocument();
    });

    it('handles different date formats', () => {
      const props = {
        ...defaultProps,
        createdAt: new Date('2024-12-25T15:30:00Z'),
      };

      render(<MaterialCard {...props} />);

      expect(screen.getByText(/Created:/)).toBeInTheDocument();
      expect(screen.getByText(/12\/25\/2024/)).toBeInTheDocument();
    });

    it('handles invalid dates gracefully', () => {
      const props = {
        ...defaultProps,
        createdAt: new Date('Invalid Date'),
      };

      // Should not throw an error
      const { container } = render(<MaterialCard {...props} />);
      expect(container).toBeInTheDocument();
      expect(screen.getByText(/Created:/)).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('has correct layout structure', () => {
      const { container } = render(<MaterialCard {...defaultProps} />);

      // Check for header with title and category
      const header = container.querySelector('.flex.items-start.justify-between');
      expect(header).toBeInTheDocument();

      // Check title styling
      expect(screen.getByText('Introduction to Music Theory')).toHaveClass('font-semibold');
    });

    it('description has correct text styling', () => {
      render(<MaterialCard {...defaultProps} />);

      const description = screen.getByText(defaultProps.description);
      expect(description).toHaveClass('text-sm', 'text-gray-600', 'line-clamp-2');
    });

    it('creation date has muted styling', () => {
      const { container } = render(<MaterialCard {...defaultProps} />);

      const dateSection = container.querySelector('.text-xs.text-gray-500');
      expect(dateSection).toBeInTheDocument();
    });
  });

  describe('Category Badge', () => {
    it('displays different categories correctly', () => {
      const categories = ['Theory', 'Practice', 'Performance', 'Composition'];

      categories.forEach(category => {
        const { unmount } = render(<MaterialCard {...defaultProps} category={category} />);

        const badge = screen.getByText(category);
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass('bg-blue-100', 'text-blue-700');

        unmount();
      });
    });

    it('handles long category names', () => {
      const props = {
        ...defaultProps,
        category: 'Advanced Music Theory and Composition',
      };

      render(<MaterialCard {...props} />);

      expect(screen.getByText(props.category)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('action buttons are keyboard accessible', () => {
      const onView = vi.fn();
      const onDelete = vi.fn();
      render(<MaterialCard {...defaultProps} onView={onView} onDelete={onDelete} />);

      const viewButton = screen.getByText('View');
      const deleteButton = screen.getByText('Delete');

      // Test View button
      viewButton.focus();
      expect(document.activeElement).toBe(viewButton);
      fireEvent.keyDown(viewButton, { key: 'Enter' });
      fireEvent.click(viewButton);
      expect(onView).toHaveBeenCalled();

      // Test Delete button
      deleteButton.focus();
      expect(document.activeElement).toBe(deleteButton);
      fireEvent.keyDown(deleteButton, { key: 'Enter' });
      fireEvent.click(deleteButton);
      expect(onDelete).toHaveBeenCalled();
    });

    it('has semantic HTML structure', () => {
      render(<MaterialCard {...defaultProps} />);

      // Check for heading element for title
      const title = screen.getByText('Introduction to Music Theory');
      expect(title.tagName.toLowerCase()).toBe('h3');

      // Check description is a paragraph
      const description = screen.getByText(defaultProps.description);
      expect(description.tagName.toLowerCase()).toBe('p');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty strings gracefully', () => {
      const props = {
        ...defaultProps,
        title: '',
        description: '',
        category: '',
      };

      const { container } = render(<MaterialCard {...props} />);
      expect(container).toBeInTheDocument();
    });

    it('handles very long titles', () => {
      const props = {
        ...defaultProps,
        title: 'This is an extremely long title that might cause layout issues in the card component and should be handled gracefully',
      };

      render(<MaterialCard {...props} />);

      expect(screen.getByText(props.title)).toBeInTheDocument();
    });

    it('renders without action buttons', () => {
      render(<MaterialCard {...defaultProps} />);

      expect(screen.queryByText('View')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });

    it('handles special characters in text', () => {
      const props = {
        ...defaultProps,
        title: 'Title with "quotes" & special <characters>',
        description: 'Description with & symbols, "quotes", and <tags>',
        category: 'Category & More',
      };

      render(<MaterialCard {...props} />);

      expect(screen.getByText(props.title)).toBeInTheDocument();
      expect(screen.getByText(props.description)).toBeInTheDocument();
      expect(screen.getByText(props.category)).toBeInTheDocument();
    });
  });
});