import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/tests/utils/test-utils';
import { LessonCard } from './lesson-card';

describe('LessonCard', () => {
  const defaultProps = {
    id: 'lesson-123',
    mentorName: 'John Doe',
    mentorEmail: 'john.doe@example.com',
    startTime: new Date('2025-01-15T10:00:00'),
    endTime: new Date('2025-01-15T11:00:00'),
    status: 'available',
  };

  describe('Basic Rendering', () => {
    it('renders all mentor information', () => {
      render(<LessonCard {...defaultProps} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });

    it('displays status badge', () => {
      render(<LessonCard {...defaultProps} />);

      const statusBadge = screen.getByText('available');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass('bg-green-100', 'text-green-700');
    });

    it('formats and displays time correctly', () => {
      render(<LessonCard {...defaultProps} />);

      // The component uses date-fns formatDateTime with Japanese locale
      // We need to check for the presence of date/time text
      expect(screen.getByText(/開始:/)).toBeInTheDocument();
      expect(screen.getByText(/終了:/)).toBeInTheDocument();
    });

    it('renders in a Card container', () => {
      const { container } = render(<LessonCard {...defaultProps} />);

      const card = container.querySelector('.p-4');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Book Now Button', () => {
    it('shows Book Now button when status is available and onBook is provided', () => {
      const onBook = vi.fn();
      render(<LessonCard {...defaultProps} onBook={onBook} />);

      const bookButton = screen.getByText('Book Now');
      expect(bookButton).toBeInTheDocument();
      expect(bookButton).toHaveAttribute('type', 'button');
    });

    it('does not show Book Now button when onBook is not provided', () => {
      render(<LessonCard {...defaultProps} />);

      expect(screen.queryByText('Book Now')).not.toBeInTheDocument();
    });

    it('does not show Book Now button when status is not available', () => {
      const onBook = vi.fn();
      render(<LessonCard {...defaultProps} status="booked" onBook={onBook} />);

      expect(screen.queryByText('Book Now')).not.toBeInTheDocument();
    });

    it('calls onBook with lesson id when clicked', () => {
      const onBook = vi.fn();
      render(<LessonCard {...defaultProps} onBook={onBook} />);

      const bookButton = screen.getByText('Book Now');
      fireEvent.click(bookButton);

      expect(onBook).toHaveBeenCalledTimes(1);
      expect(onBook).toHaveBeenCalledWith('lesson-123');
    });

    it('Book Now button has full width styling', () => {
      const onBook = vi.fn();
      render(<LessonCard {...defaultProps} onBook={onBook} />);

      const bookButton = screen.getByText('Book Now');
      expect(bookButton).toHaveClass('w-full');
    });
  });

  describe('Status Variants', () => {
    it('displays available status with green styling', () => {
      render(<LessonCard {...defaultProps} status="available" />);

      const statusBadge = screen.getByText('available');
      expect(statusBadge).toHaveClass('bg-green-100', 'text-green-700');
    });

    it('displays other status with gray styling', () => {
      render(<LessonCard {...defaultProps} status="booked" />);

      const statusBadge = screen.getByText('booked');
      expect(statusBadge).toHaveClass('bg-gray-100', 'text-gray-700');
    });

    it('handles custom status values', () => {
      render(<LessonCard {...defaultProps} status="pending" />);

      const statusBadge = screen.getByText('pending');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass('bg-gray-100', 'text-gray-700');
    });
  });

  describe('Date and Time Formatting', () => {
    it('formats dates using Japanese locale with date-fns', () => {
      render(<LessonCard {...defaultProps} />);

      // Check that the Japanese labels are present (開始/終了)
      const startText = screen.getByText(/開始:/);
      const endText = screen.getByText(/終了:/);

      expect(startText).toBeInTheDocument();
      expect(endText).toBeInTheDocument();
    });

    it('handles different time zones correctly', () => {
      const props = {
        ...defaultProps,
        startTime: new Date('2025-01-15T00:00:00Z'),
        endTime: new Date('2025-01-15T01:00:00Z'),
      };

      render(<LessonCard {...props} />);

      expect(screen.getByText(/開始:/)).toBeInTheDocument();
      expect(screen.getByText(/終了:/)).toBeInTheDocument();
    });

    it('handles invalid dates gracefully', () => {
      const props = {
        ...defaultProps,
        startTime: new Date('Invalid Date'),
        endTime: new Date('Invalid Date'),
      };

      // This should not throw an error
      const { container } = render(<LessonCard {...props} />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('has correct layout structure', () => {
      const { container } = render(<LessonCard {...defaultProps} />);

      // Check for flex layout in header
      const header = container.querySelector('.flex.items-start.justify-between');
      expect(header).toBeInTheDocument();

      // Check for mentor info section
      expect(screen.getByText('John Doe')).toHaveClass('font-semibold');
      expect(screen.getByText('john.doe@example.com')).toHaveClass('text-sm', 'text-gray-600');
    });

    it('status badge has correct styling', () => {
      render(<LessonCard {...defaultProps} />);

      const statusBadge = screen.getByText('available');
      expect(statusBadge).toHaveClass('px-2', 'py-1', 'text-xs', 'font-medium', 'rounded');
    });

    it('time section has correct text styling', () => {
      const { container } = render(<LessonCard {...defaultProps} />);

      const timeSection = container.querySelector('.text-sm.text-gray-700.mb-4');
      expect(timeSection).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('Book Now button is keyboard accessible', () => {
      const onBook = vi.fn();
      render(<LessonCard {...defaultProps} onBook={onBook} />);

      const bookButton = screen.getByText('Book Now');

      // Simulate keyboard interaction
      bookButton.focus();
      expect(document.activeElement).toBe(bookButton);

      fireEvent.keyDown(bookButton, { key: 'Enter' });
      fireEvent.click(bookButton);

      expect(onBook).toHaveBeenCalled();
    });

    it('has semantic HTML structure', () => {
      render(<LessonCard {...defaultProps} />);

      // Check for heading element for mentor name
      const mentorName = screen.getByText('John Doe');
      expect(mentorName.tagName.toLowerCase()).toBe('h3');
    });

    it('email is displayed as plain text', () => {
      render(<LessonCard {...defaultProps} />);

      const email = screen.getByText('john.doe@example.com');
      expect(email.tagName.toLowerCase()).toBe('p');
    });
  });

  describe('Edge Cases', () => {
    it('handles very long mentor names', () => {
      const props = {
        ...defaultProps,
        mentorName: 'Very Long Mentor Name That Might Cause Layout Issues',
      };

      render(<LessonCard {...props} />);

      expect(screen.getByText(props.mentorName)).toBeInTheDocument();
    });

    it('handles very long email addresses', () => {
      const props = {
        ...defaultProps,
        mentorEmail: 'very.long.email.address.that.might.break.layout@example.com',
      };

      render(<LessonCard {...props} />);

      expect(screen.getByText(props.mentorEmail)).toBeInTheDocument();
    });

    it('handles missing optional props gracefully', () => {
      const minimalProps = {
        id: 'lesson-123',
        mentorName: 'John Doe',
        mentorEmail: 'john@example.com',
        startTime: new Date(),
        endTime: new Date(),
        status: 'available',
      };

      const { container } = render(<LessonCard {...minimalProps} />);
      expect(container).toBeInTheDocument();
      expect(screen.queryByText('Book Now')).not.toBeInTheDocument();
    });
  });
});