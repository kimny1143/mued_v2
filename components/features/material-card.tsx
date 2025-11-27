import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

interface MaterialCardProps {
  id: string;
  title: string;
  description: string;
  category: string;
  createdAt: Date;
  onView?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function MaterialCard({
  id,
  title,
  description,
  category,
  createdAt,
  onView,
  onDelete,
}: MaterialCardProps) {
  return (
    <Card className="p-4">
      <div className="mb-3">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-[var(--color-text-primary)]">{title}</h3>
          <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700">
            {category}
          </span>
        </div>
        <p className="text-sm text-gray-600 line-clamp-2">{description}</p>
      </div>
      <div className="text-xs text-gray-500 mb-4">
        作成日: {formatDate(createdAt)}
      </div>
      <div className="flex gap-2">
        {onView && (
          <Button variant="primary" size="sm" onClick={() => onView(id)} className="flex-1">
            View
          </Button>
        )}
        {onDelete && (
          <Button variant="danger" size="sm" onClick={() => onDelete(id)}>
            Delete
          </Button>
        )}
      </div>
    </Card>
  );
}
