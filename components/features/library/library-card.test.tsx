import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import { LibraryCard } from './library-card';
import { renderWithProviders, mockStorage } from '@/tests/utils/component-test-utils';
import type { UnifiedContent } from '@/types/unified-content';

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, onClick, className, target, rel, ...props }: any) => (
    <a href={href} onClick={onClick} className={className} target={target} rel={rel} {...props}>
      {children}
    </a>
  ),
}));

// Mock External Link Modal
vi.mock('./external-link-modal', () => ({
  ExternalLinkModal: ({ isOpen, onClose, onConfirm, url, sourceName }: any) =>
    isOpen ? (
      <div data-testid="external-link-modal">
        <span>Opening {sourceName} link: {url}</span>
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null,
}));

const mockContent: UnifiedContent = {
  id: 'content_123',
  source: 'note',
  type: 'article',
  url: 'https://note.com/test-article',
  title: 'Test Article Title',
  description: 'This is a test article description that provides some context about the content.',
  thumbnail: 'https://example.com/thumbnail.jpg',
  author: {
    name: 'Test Author',
    url: 'https://note.com/author',
  },
  publishedAt: '2025-01-15T10:00:00Z',
  tags: ['education', 'javascript', 'testing', 'react', 'vitest'],
  contentRaw: 'Raw content here',
  processedContent: 'Processed content here',
  difficulty: 'intermediate',
  category: 'programming',
  relatedContents: [],
  metrics: {
    views: 100,
    likes: 10,
    comments: 5,
  },
};

const mockAIContent: UnifiedContent = {
  ...mockContent,
  id: 'ai_content_123',
  source: 'ai_generated',
  aiMetadata: {
    generatedBy: {
      provider: 'OpenAI',
      model: 'GPT-4',
      version: '1.0',
    },
    qualityScore: {
      playability: 8,
      learningValue: 9,
      accuracy: 0.95,
    },
    sourceContext: {
      articleId: 'original_123',
      articleTitle: 'Original Article',
      url: '/library/original_123',
    },
    humanReview: {
      status: 'approved',
      reviewerId: 'reviewer_123',
      reviewDate: '2025-01-16T10:00:00Z',
      comments: 'Good quality content',
    },
  },
};

describe('LibraryCard', () => {
  let storage: ReturnType<typeof mockStorage>;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = mockStorage();
  });

  afterEach(() => {
    storage.restore();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      renderWithProviders(<LibraryCard content={mockContent} />);
      expect(screen.getByText('Test Article Title')).toBeInTheDocument();
    });

    it('should display thumbnail when provided', () => {
      renderWithProviders(<LibraryCard content={mockContent} />);
      const thumbnail = screen.getByAltText('Test Article Title');
      expect(thumbnail).toHaveAttribute('src', 'https://example.com/thumbnail.jpg');
    });

    it('should not display thumbnail section when not provided', () => {
      const contentWithoutThumbnail = { ...mockContent, thumbnail: undefined };
      renderWithProviders(<LibraryCard content={contentWithoutThumbnail} />);
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('should display source badge with correct styling', () => {
      renderWithProviders(<LibraryCard content={mockContent} />);
      const sourceBadge = screen.getByText('note');
      expect(sourceBadge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('should display difficulty badge when provided', () => {
      renderWithProviders(<LibraryCard content={mockContent} />);
      const difficultyBadge = screen.getByText('intermediate');
      expect(difficultyBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('should display type badge', () => {
      renderWithProviders(<LibraryCard content={mockContent} />);
      const typeBadge = screen.getByText('article');
      expect(typeBadge).toHaveClass('bg-gray-100', 'text-gray-800');
    });

    it('should display title and description', () => {
      renderWithProviders(<LibraryCard content={mockContent} />);
      expect(screen.getByText('Test Article Title')).toBeInTheDocument();
      expect(screen.getByText(/This is a test article description/)).toBeInTheDocument();
    });

    it('should display author and publish date', () => {
      renderWithProviders(<LibraryCard content={mockContent} />);
      expect(screen.getByText('Test Author')).toBeInTheDocument();
      expect(screen.getByText(/1\/15\/2025/)).toBeInTheDocument();
    });

    it('should display tags correctly', () => {
      renderWithProviders(<LibraryCard content={mockContent} />);
      expect(screen.getByText('#education')).toBeInTheDocument();
      expect(screen.getByText('#javascript')).toBeInTheDocument();
      expect(screen.getByText('#testing')).toBeInTheDocument();
      expect(screen.getByText('+2')).toBeInTheDocument(); // Additional tags indicator
    });

    it('should display action button', () => {
      renderWithProviders(<LibraryCard content={mockContent} />);
      const button = screen.getByText('View Content');
      expect(button).toHaveAttribute('href', 'https://note.com/test-article');
    });
  });

  describe('Source-specific Styling', () => {
    it('should apply correct colors for different sources', () => {
      const sources = [
        { source: 'note', expectedClasses: ['bg-green-100', 'text-green-800'] },
        { source: 'youtube', expectedClasses: ['bg-red-100', 'text-red-800'] },
        { source: 'ai_generated', expectedClasses: ['bg-purple-100', 'text-purple-800'] },
        { source: 'internal', expectedClasses: ['bg-blue-100', 'text-blue-800'] },
        { source: 'partner', expectedClasses: ['bg-orange-100', 'text-orange-800'] },
      ];

      sources.forEach(({ source, expectedClasses }) => {
        const { unmount } = renderWithProviders(
          <LibraryCard content={{ ...mockContent, source: source as any }} />
        );
        const badge = screen.getByText(source);
        expectedClasses.forEach(cls => {
          expect(badge).toHaveClass(cls);
        });
        unmount();
      });
    });

    it('should apply correct colors for different difficulty levels', () => {
      const difficulties = [
        { difficulty: 'beginner', expectedClasses: ['bg-emerald-100', 'text-emerald-800'] },
        { difficulty: 'intermediate', expectedClasses: ['bg-yellow-100', 'text-yellow-800'] },
        { difficulty: 'advanced', expectedClasses: ['bg-red-100', 'text-red-800'] },
      ];

      difficulties.forEach(({ difficulty, expectedClasses }) => {
        const { unmount } = renderWithProviders(
          <LibraryCard content={{ ...mockContent, difficulty: difficulty as any }} />
        );
        const badge = screen.getByText(difficulty);
        expectedClasses.forEach(cls => {
          expect(badge).toHaveClass(cls);
        });
        unmount();
      });
    });
  });

  describe('AI Metadata Display', () => {
    it('should display AI transparency information for AI-generated content', () => {
      renderWithProviders(<LibraryCard content={mockAIContent} />);
      expect(screen.getByText('🤖 AI透明性情報')).toBeInTheDocument();
    });

    it('should display generation model information', () => {
      renderWithProviders(<LibraryCard content={mockAIContent} />);
      expect(screen.getByText('生成モデル:')).toBeInTheDocument();
      expect(screen.getByText('OpenAI GPT-4')).toBeInTheDocument();
    });

    it('should display quality scores', () => {
      renderWithProviders(<LibraryCard content={mockAIContent} />);
      expect(screen.getByText('品質スコア:')).toBeInTheDocument();
      expect(screen.getByText('再生性: 8/10')).toBeInTheDocument();
      expect(screen.getByText('学習価値: 9/10')).toBeInTheDocument();
    });

    it('should display source context when available', () => {
      renderWithProviders(<LibraryCard content={mockAIContent} />);
      expect(screen.getByText('生成元:')).toBeInTheDocument();
      const sourceLink = screen.getByText('Original Article');
      expect(sourceLink).toHaveAttribute('href', '/library/original_123');
    });

    it('should display human review status', () => {
      renderWithProviders(<LibraryCard content={mockAIContent} />);
      expect(screen.getByText('人間レビュー:')).toBeInTheDocument();
      expect(screen.getByText('承認済み')).toBeInTheDocument();
      expect(screen.getByText('承認済み')).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('should handle different review statuses', () => {
      const statuses = [
        { status: 'approved', text: '承認済み', classes: ['bg-green-100', 'text-green-800'] },
        { status: 'needs_revision', text: '修正必要', classes: ['bg-yellow-100', 'text-yellow-800'] },
        { status: 'rejected', text: '却下', classes: ['bg-red-100', 'text-red-800'] },
      ];

      statuses.forEach(({ status, text, classes }) => {
        const content = {
          ...mockAIContent,
          aiMetadata: {
            ...mockAIContent.aiMetadata!,
            humanReview: {
              ...mockAIContent.aiMetadata!.humanReview!,
              status: status as any,
            },
          },
        };

        const { unmount } = renderWithProviders(<LibraryCard content={content} />);
        const statusBadge = screen.getByText(text);
        classes.forEach(cls => {
          expect(statusBadge).toHaveClass(cls);
        });
        unmount();
      });
    });

    it('should not display AI metadata for non-AI content', () => {
      renderWithProviders(<LibraryCard content={mockContent} />);
      expect(screen.queryByText('🤖 AI透明性情報')).not.toBeInTheDocument();
    });
  });

  describe('External Link Handling', () => {
    it('should open external link modal for external sources', async () => {
      const { user } = renderWithProviders(<LibraryCard content={mockContent} />);

      const linkButton = screen.getByText('View Content');
      await user.click(linkButton);

      expect(screen.getByTestId('external-link-modal')).toBeInTheDocument();
      expect(screen.getByText(/Opening note link/)).toBeInTheDocument();
    });

    it('should not show modal when skip warning is set', async () => {
      localStorage.setItem('mued_skip_external_warning', 'true');

      const { user } = renderWithProviders(<LibraryCard content={mockContent} />);

      const linkButton = screen.getByText('View Content');
      await user.click(linkButton);

      expect(screen.queryByTestId('external-link-modal')).not.toBeInTheDocument();
    });

    it('should open link in new window when confirming modal', async () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      const { user } = renderWithProviders(<LibraryCard content={mockContent} />);

      const linkButton = screen.getByText('View Content');
      await user.click(linkButton);

      const confirmButton = screen.getByText('Confirm');
      await user.click(confirmButton);

      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://note.com/test-article',
        '_blank',
        'noopener,noreferrer'
      );

      windowOpenSpy.mockRestore();
    });

    it('should close modal when canceling', async () => {
      const { user } = renderWithProviders(<LibraryCard content={mockContent} />);

      const linkButton = screen.getByText('View Content');
      await user.click(linkButton);

      expect(screen.getByTestId('external-link-modal')).toBeInTheDocument();

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(screen.queryByTestId('external-link-modal')).not.toBeInTheDocument();
    });

    it('should not show modal for internal sources', async () => {
      const internalContent = { ...mockContent, source: 'internal' as any };

      const { user } = renderWithProviders(<LibraryCard content={internalContent} />);

      const linkButton = screen.getByText('View Details');
      await user.click(linkButton);

      expect(screen.queryByTestId('external-link-modal')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing author gracefully', () => {
      const contentWithoutAuthor = { ...mockContent, author: undefined };
      renderWithProviders(<LibraryCard content={contentWithoutAuthor} />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('should handle empty tags array', () => {
      const contentWithoutTags = { ...mockContent, tags: [] };
      renderWithProviders(<LibraryCard content={contentWithoutTags} />);
      expect(screen.queryByText(/#/)).not.toBeInTheDocument();
    });

    it('should handle missing URL', () => {
      const contentWithoutUrl = { ...mockContent, url: undefined };
      renderWithProviders(<LibraryCard content={contentWithoutUrl} />);
      expect(screen.queryByText('View Content')).not.toBeInTheDocument();
    });

    it('should handle missing difficulty', () => {
      const contentWithoutDifficulty = { ...mockContent, difficulty: undefined };
      renderWithProviders(<LibraryCard content={contentWithoutDifficulty} />);
      // Should only show source and type badges
      const badges = screen.getAllByText(/note|article/);
      expect(badges).toHaveLength(2);
    });

    it('should apply line-clamp to long titles', () => {
      const longTitle = 'This is a very long title that should be clamped to prevent layout issues in the card display';
      const contentWithLongTitle = { ...mockContent, title: longTitle };
      renderWithProviders(<LibraryCard content={contentWithLongTitle} />);

      const title = screen.getByText(longTitle);
      expect(title).toHaveClass('line-clamp-2');
    });

    it('should apply line-clamp to long descriptions', () => {
      const longDescription = 'A'.repeat(500);
      const contentWithLongDesc = { ...mockContent, description: longDescription };
      renderWithProviders(<LibraryCard content={contentWithLongDesc} />);

      const description = screen.getByText(longDescription);
      expect(description).toHaveClass('line-clamp-3');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderWithProviders(<LibraryCard content={mockContent} />);
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Test Article Title');
    });

    it('should have proper image alt text', () => {
      renderWithProviders(<LibraryCard content={mockContent} />);
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', 'Test Article Title');
    });

    it('should have accessible links', () => {
      renderWithProviders(<LibraryCard content={mockContent} />);
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAttribute('href');
      });
    });

    it('should properly mark external links', () => {
      renderWithProviders(<LibraryCard content={mockContent} />);
      const externalLink = screen.getByText('View Content');
      expect(externalLink).toHaveAttribute('target', '_blank');
      expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Styling and Layout', () => {
    it('should apply hover effect to card', () => {
      const { container } = renderWithProviders(<LibraryCard content={mockContent} />);
      const card = container.firstChild;
      expect(card).toHaveClass('hover:shadow-md', 'transition-shadow');
    });

    it('should maintain aspect ratio for thumbnail', () => {
      const { container } = renderWithProviders(<LibraryCard content={mockContent} />);
      const thumbnailContainer = container.querySelector('.aspect-video');
      expect(thumbnailContainer).toBeInTheDocument();
    });

    it('should apply correct button styling', () => {
      renderWithProviders(<LibraryCard content={mockContent} />);
      const button = screen.getByText('View Content');
      expect(button).toHaveClass(
        'bg-[var(--color-brand-green)]',
        'hover:bg-[var(--color-brand-green-hover)]',
        'text-white',
        'rounded-md'
      );
    });

    it('should handle button text based on source', () => {
      const aiContent = { ...mockContent, source: 'ai_generated' as any };
      const { rerender } = renderWithProviders(<LibraryCard content={aiContent} />);
      expect(screen.getByText('View Details')).toBeInTheDocument();

      rerender(<LibraryCard content={{ ...mockContent, source: 'internal' as any }} />);
      expect(screen.getByText('View Details')).toBeInTheDocument();

      rerender(<LibraryCard content={mockContent} />);
      expect(screen.getByText('View Content')).toBeInTheDocument();
    });
  });
});