import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { UserAvatar } from './user-avatar';
import { renderWithProviders, mockUser } from '@/tests/utils/component-test-utils';
import { useUser } from '@clerk/nextjs';

// Mock Clerk's useUser hook
vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn(),
}));

describe('UserAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render nothing when user is not authenticated', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: false,
        user: null,
      });

      const { container } = renderWithProviders(<UserAvatar />);
      expect(container.firstChild).toBeNull();
    });

    it('should render avatar and user info when authenticated', () => {
      const user = mockUser({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });

      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          emailAddresses: [
            {
              id: 'email_1',
              emailAddress: user.email,
              linkedTo: [],
              verification: {
                status: 'verified',
                strategy: 'email_code',
                attempts: 0,
                expireAt: new Date(),
              },
            },
          ],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      renderWithProviders(<UserAvatar />);

      expect(screen.getByText('J')).toBeInTheDocument(); // Initial
      expect(screen.getByText('John')).toBeInTheDocument(); // Display name
      expect(screen.getByText('john@example.com')).toBeInTheDocument(); // Email
    });

    it('should display proper structure with flex layout', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          firstName: 'Test',
          emailAddresses: [{ emailAddress: 'test@example.com' }],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      const { container } = renderWithProviders(<UserAvatar />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper).toHaveClass('flex', 'items-center', 'gap-3', 'mb-6');
    });
  });

  describe('Initial Generation', () => {
    it('should use first letter of firstName when available', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          firstName: 'Alice',
          emailAddresses: [{ emailAddress: 'alice@example.com' }],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      renderWithProviders(<UserAvatar />);
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('should use first letter of username when firstName is not available', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          firstName: null,
          username: 'bobsmith',
          emailAddresses: [{ emailAddress: 'bob@example.com' }],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      renderWithProviders(<UserAvatar />);
      expect(screen.getByText('B')).toBeInTheDocument();
    });

    it('should use first letter of email when neither firstName nor username available', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          firstName: null,
          username: null,
          emailAddresses: [{ emailAddress: 'charlie@example.com' }],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      renderWithProviders(<UserAvatar />);
      expect(screen.getByText('C')).toBeInTheDocument();
    });

    it('should default to "U" when no user data is available', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          firstName: null,
          username: null,
          emailAddresses: [],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      renderWithProviders(<UserAvatar />);
      expect(screen.getByText('U')).toBeInTheDocument();
    });

    it('should uppercase the initial', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          firstName: 'david',
          emailAddresses: [{ emailAddress: 'david@example.com' }],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      renderWithProviders(<UserAvatar />);
      expect(screen.getByText('D')).toBeInTheDocument(); // Should be uppercase
    });
  });

  describe('Display Name', () => {
    it('should prioritize firstName for display name', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          firstName: 'Emily',
          username: 'emilyuser',
          emailAddresses: [{ emailAddress: 'emily@example.com' }],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      renderWithProviders(<UserAvatar />);
      expect(screen.getByText('Emily')).toBeInTheDocument();
    });

    it('should use username when firstName is not available', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          firstName: null,
          username: 'frankuser',
          emailAddresses: [{ emailAddress: 'frank@example.com' }],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      renderWithProviders(<UserAvatar />);
      expect(screen.getByText('frankuser')).toBeInTheDocument();
    });

    it('should use email when firstName and username are not available', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          firstName: null,
          username: null,
          emailAddresses: [{ emailAddress: 'george@example.com' }],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      renderWithProviders(<UserAvatar />);
      // Email appears twice - as display name and in the subtitle
      const emails = screen.getAllByText('george@example.com');
      expect(emails).toHaveLength(2);
    });

    it('should default to "ユーザー" when no identifying information is available', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          firstName: null,
          username: null,
          emailAddresses: [],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      renderWithProviders(<UserAvatar />);
      expect(screen.getByText('ユーザー')).toBeInTheDocument();
    });
  });

  describe('Email Display', () => {
    it('should display email address when available', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          firstName: 'Helen',
          emailAddresses: [{ emailAddress: 'helen@example.com' }],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      renderWithProviders(<UserAvatar />);
      expect(screen.getByText('helen@example.com')).toBeInTheDocument();
    });

    it('should not display email when not available', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          firstName: 'Ian',
          emailAddresses: [],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      renderWithProviders(<UserAvatar />);
      expect(screen.queryByText(/@/)).not.toBeInTheDocument();
    });

    it('should use the first email address when multiple are available', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          firstName: 'Jane',
          emailAddresses: [
            { emailAddress: 'jane@example.com' },
            { emailAddress: 'jane.doe@example.org' },
          ],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      renderWithProviders(<UserAvatar />);
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.queryByText('jane.doe@example.org')).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply correct styling to avatar circle', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          firstName: 'Kevin',
          emailAddresses: [{ emailAddress: 'kevin@example.com' }],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      const { container } = renderWithProviders(<UserAvatar />);
      const avatar = container.querySelector('.w-12.h-12.rounded-full');

      expect(avatar).toHaveClass(
        'bg-[var(--color-brand-green)]',
        'flex',
        'items-center',
        'justify-center',
        'text-white',
        'text-lg',
        'font-bold'
      );
    });

    it('should apply correct text styling to display name', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          firstName: 'Laura',
          emailAddresses: [{ emailAddress: 'laura@example.com' }],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      renderWithProviders(<UserAvatar />);
      const displayName = screen.getByText('Laura');

      expect(displayName).toHaveClass(
        'text-sm',
        'font-medium',
        'text-[var(--color-text-primary)]'
      );
    });

    it('should apply correct text styling to email', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          firstName: 'Mike',
          emailAddresses: [{ emailAddress: 'mike@example.com' }],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      renderWithProviders(<UserAvatar />);
      const email = screen.getByText('mike@example.com');

      expect(email).toHaveClass('text-xs', 'text-gray-500');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings in user data', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          firstName: '',
          username: '',
          emailAddresses: [{ emailAddress: '' }],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      renderWithProviders(<UserAvatar />);
      expect(screen.getByText('U')).toBeInTheDocument(); // Default initial
      expect(screen.getByText('ユーザー')).toBeInTheDocument(); // Default display name
    });

    it('should handle null emailAddresses array', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          firstName: 'Nancy',
          username: null,
          emailAddresses: null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      renderWithProviders(<UserAvatar />);
      expect(screen.getByText('N')).toBeInTheDocument();
      expect(screen.getByText('Nancy')).toBeInTheDocument();
    });

    it('should handle undefined values in user object', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          firstName: undefined,
          username: undefined,
          emailAddresses: undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      renderWithProviders(<UserAvatar />);
      expect(screen.getByText('U')).toBeInTheDocument();
      expect(screen.getByText('ユーザー')).toBeInTheDocument();
    });

    it('should handle special characters in names', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          firstName: '田中',
          emailAddresses: [{ emailAddress: 'tanaka@example.com' }],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      renderWithProviders(<UserAvatar />);
      expect(screen.getByText('田')).toBeInTheDocument();
      expect(screen.getByText('田中')).toBeInTheDocument();
    });

    it('should handle very long display names gracefully', () => {
      const longName = 'VeryLongFirstNameThatMightCauseLayoutIssues';
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          firstName: longName,
          emailAddresses: [{ emailAddress: 'long@example.com' }],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      renderWithProviders(<UserAvatar />);
      expect(screen.getByText('V')).toBeInTheDocument();
      expect(screen.getByText(longName)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have semantic HTML structure', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          firstName: 'Oscar',
          emailAddresses: [{ emailAddress: 'oscar@example.com' }],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      const { container } = renderWithProviders(<UserAvatar />);

      // Check for proper paragraph elements
      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs).toHaveLength(2);
    });

    it('should properly display text content for screen readers', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          firstName: 'Patricia',
          emailAddresses: [{ emailAddress: 'patricia@example.com' }],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      renderWithProviders(<UserAvatar />);

      // All text should be visible and accessible
      expect(screen.getByText('P')).toBeVisible();
      expect(screen.getByText('Patricia')).toBeVisible();
      expect(screen.getByText('patricia@example.com')).toBeVisible();
    });
  });

  describe('Loading States', () => {
    it('should handle loading state gracefully', () => {
      vi.mocked(useUser).mockReturnValue({
        isLoaded: false,
        isSignedIn: false,
        user: null,
        setActive: vi.fn(),
      } as unknown as ReturnType<typeof useUser>);

      const { container } = renderWithProviders(<UserAvatar />);
      expect(container.firstChild).toBeNull();
    });

    it('should render once user data is loaded', () => {
      // Initially not loaded
      vi.mocked(useUser).mockReturnValue({
        isLoaded: false,
        isSignedIn: false,
        user: null,
        setActive: vi.fn(),
      } as unknown as ReturnType<typeof useUser>);

      const { rerender } = renderWithProviders(<UserAvatar />);
      expect(screen.queryByText(/./)).not.toBeInTheDocument();

      // After loading
      vi.mocked(useUser).mockReturnValue({
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: 'user_123',
          firstName: 'Quinn',
          emailAddresses: [{ emailAddress: 'quinn@example.com' }],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });

      rerender(<UserAvatar />);
      expect(screen.getByText('Q')).toBeInTheDocument();
    });
  });
});
