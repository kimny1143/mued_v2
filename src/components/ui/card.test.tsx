import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';

describe('Card', () => {
  it('renders a basic card with all subcomponents', () => {
    const title = 'テストタイトル';
    const description = 'テスト説明';
    const content = 'テストコンテンツ';
    const footer = 'テストフッター';

    render(
      <Card data-testid="test-card">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{content}</CardContent>
        <CardFooter>{footer}</CardFooter>
      </Card>
    );

    expect(screen.getByTestId('test-card')).toBeInTheDocument();
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
    expect(screen.getByText(content)).toBeInTheDocument();
    expect(screen.getByText(footer)).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const customClass = 'test-custom-class';
    
    render(
      <Card className={customClass} data-testid="test-card">
        カードコンテンツ
      </Card>
    );

    const card = screen.getByTestId('test-card');
    expect(card).toHaveClass(customClass);
  });

  it('passes additional props to the card', () => {
    const dataAttribute = 'test-attribute';
    
    render(
      <Card data-custom={dataAttribute} data-testid="test-card">
        カードコンテンツ
      </Card>
    );

    const card = screen.getByTestId('test-card');
    expect(card).toHaveAttribute('data-custom', dataAttribute);
  });

  it('renders CardHeader with custom className', () => {
    const customClass = 'header-custom-class';
    
    render(
      <Card>
        <CardHeader className={customClass} data-testid="test-header">
          ヘッダーコンテンツ
        </CardHeader>
      </Card>
    );

    const header = screen.getByTestId('test-header');
    expect(header).toHaveClass(customClass);
  });

  it('renders CardContent with custom className', () => {
    const customClass = 'content-custom-class';
    
    render(
      <Card>
        <CardContent className={customClass} data-testid="test-content">
          コンテンツ
        </CardContent>
      </Card>
    );

    const content = screen.getByTestId('test-content');
    expect(content).toHaveClass(customClass);
  });

  it('renders CardFooter with custom className', () => {
    const customClass = 'footer-custom-class';
    
    render(
      <Card>
        <CardFooter className={customClass} data-testid="test-footer">
          フッターコンテンツ
        </CardFooter>
      </Card>
    );

    const footer = screen.getByTestId('test-footer');
    expect(footer).toHaveClass(customClass);
  });
}); 