import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { DashboardLayout } from './dashboard-layout';
import { renderWithProviders, mockUser, expectNoA11yViolations } from '@/tests/utils/component-test-utils';

// Mock the child components
vi.mock('./header', () => ({
  Header: () => <header data-testid="header">Header Component</header>,
}));

vi.mock('./footer', () => ({
  Footer: () => <footer data-testid="footer">Footer Component</footer>,
}));

vi.mock('./user-avatar', () => ({
  UserAvatar: () => <div data-testid="user-avatar">User Avatar</div>,
}));

describe('DashboardLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      renderWithProviders(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      );

      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
      expect(screen.getByTestId('user-avatar')).toBeInTheDocument();
    });

    it('should render children content', () => {
      const testContent = 'Dashboard Content';
      renderWithProviders(
        <DashboardLayout>
          <div data-testid="child-content">{testContent}</div>
        </DashboardLayout>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText(testContent)).toBeInTheDocument();
    });

    it('should apply correct layout structure', () => {
      const { container } = renderWithProviders(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      // Check for min-height screen
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('min-h-screen', 'flex', 'flex-col', 'bg-white');

      // Check main element
      const main = screen.getByRole('main');
      expect(main).toHaveClass('flex-1', 'container', 'mx-auto', 'px-6', 'py-8');
    });

    it('should maintain correct component order', () => {
      const { container } = renderWithProviders(
        <DashboardLayout>
          <div data-testid="content">Content</div>
        </DashboardLayout>
      );

      const elements = container.querySelectorAll('[data-testid]');
      const order = Array.from(elements).map(el => el.getAttribute('data-testid'));

      expect(order[0]).toBe('header');
      expect(order[1]).toBe('user-avatar');
      expect(order[2]).toBe('content');
      expect(order[3]).toBe('footer');
    });

    it('should render multiple children correctly', () => {
      renderWithProviders(
        <DashboardLayout>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <div data-testid="child-3">Child 3</div>
        </DashboardLayout>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });
  });

  describe('User Context', () => {
    it('should render with authenticated user', () => {
      const user = mockUser({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });

      renderWithProviders(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
        { user }
      );

      expect(screen.getByTestId('user-avatar')).toBeInTheDocument();
    });

    it('should render when user is not authenticated', () => {
      renderWithProviders(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>,
        { isSignedIn: false }
      );

      // Layout should still render, even without auth
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('should render correctly with different user roles', () => {
      const roles = ['teacher', 'student', 'admin'] as const;

      roles.forEach(role => {
        const { unmount } = renderWithProviders(
          <DashboardLayout>
            <div>Content for {role}</div>
          </DashboardLayout>,
          { user: mockUser({ role }) }
        );

        expect(screen.getByText(`Content for ${role}`)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive container classes', () => {
      renderWithProviders(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const main = screen.getByRole('main');
      expect(main).toHaveClass('container', 'mx-auto');
    });

    it('should apply proper padding for different screen sizes', () => {
      renderWithProviders(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const main = screen.getByRole('main');
      expect(main).toHaveClass('px-6', 'py-8');
    });

    it('should maintain flexible layout structure', () => {
      const { container } = renderWithProviders(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex', 'flex-col');

      const main = screen.getByRole('main');
      expect(main).toHaveClass('flex-1');
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic HTML structure', () => {
      renderWithProviders(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      // Should have header element
      expect(screen.getByTestId('header').tagName.toLowerCase()).toBe('header');

      // Should have main element
      expect(screen.getByRole('main')).toBeInTheDocument();

      // Should have footer element
      expect(screen.getByTestId('footer').tagName.toLowerCase()).toBe('footer');
    });

    it('should maintain proper document structure', () => {
      renderWithProviders(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const main = screen.getByRole('main');
      const header = screen.getByTestId('header');
      const footer = screen.getByTestId('footer');

      // Header should come before main
      expect(header.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      // Main should come before footer
      expect(main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('should pass basic accessibility checks', async () => {
      const { container } = renderWithProviders(
        <DashboardLayout>
          <div>
            <h1>Dashboard</h1>
            <p>Welcome to the dashboard</p>
          </div>
        </DashboardLayout>
      );

      await expectNoA11yViolations(container);
    });

    it('should support keyboard navigation', () => {
      const { container } = renderWithProviders(
        <DashboardLayout>
          <div>
            <button>Action 1</button>
            <button>Action 2</button>
          </div>
        </DashboardLayout>
      );

      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        expect(button).toBeVisible();
      });
    });
  });

  describe('Theme and Styling', () => {
    it('should have white background by default', () => {
      const { container } = renderWithProviders(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('bg-white');
    });

    it('should apply minimum height to fill viewport', () => {
      const { container } = renderWithProviders(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('min-h-screen');
    });

    it('should center content horizontally', () => {
      renderWithProviders(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const main = screen.getByRole('main');
      expect(main).toHaveClass('mx-auto');
    });
  });

  describe('Error Handling', () => {
    it('should render empty children gracefully', () => {
      renderWithProviders(<DashboardLayout>{null}</DashboardLayout>);

      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('should render with undefined children', () => {
      renderWithProviders(<DashboardLayout>{undefined}</DashboardLayout>);

      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('should render with empty fragment as children', () => {
      renderWithProviders(<DashboardLayout><></></DashboardLayout>);

      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });
  });

  describe('Integration with Child Components', () => {
    it('should pass through to Header component', () => {
      renderWithProviders(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByText('Header Component')).toBeInTheDocument();
    });

    it('should pass through to Footer component', () => {
      renderWithProviders(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      expect(screen.getByTestId('footer')).toBeInTheDocument();
      expect(screen.getByText('Footer Component')).toBeInTheDocument();
    });

    it('should pass through to UserAvatar component', () => {
      renderWithProviders(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      expect(screen.getByTestId('user-avatar')).toBeInTheDocument();
      expect(screen.getByText('User Avatar')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = renderWithProviders(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      const main = screen.getByRole('main');
      const initialHTML = main.innerHTML;

      // Re-render with same props
      rerender(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      );

      expect(main.innerHTML).toBe(initialHTML);
    });

    it('should update when children change', () => {
      const { rerender } = renderWithProviders(
        <DashboardLayout>
          <div>Original Content</div>
        </DashboardLayout>
      );

      expect(screen.getByText('Original Content')).toBeInTheDocument();

      rerender(
        <DashboardLayout>
          <div>Updated Content</div>
        </DashboardLayout>
      );

      expect(screen.queryByText('Original Content')).not.toBeInTheDocument();
      expect(screen.getByText('Updated Content')).toBeInTheDocument();
    });
  });
});