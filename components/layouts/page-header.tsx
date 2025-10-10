interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">{title}</h1>
          {description && (
            <p className="text-sm text-gray-600 mt-2">{description}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}
