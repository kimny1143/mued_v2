import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface LessonCardProps {
  id: string;
  mentorName: string;
  mentorEmail: string;
  startTime: Date;
  endTime: Date;
  status: string;
  onBook?: (id: string) => void;
}

export function LessonCard({
  id,
  mentorName,
  mentorEmail,
  startTime,
  endTime,
  status,
  onBook,
}: LessonCardProps) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-[var(--color-text-primary)]">{mentorName}</h3>
          <p className="text-sm text-gray-600">{mentorEmail}</p>
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${
            status === "available"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {status}
        </span>
      </div>
      <div className="text-sm text-gray-700 mb-4">
        <p>開始: {formatTime(startTime)}</p>
        <p>終了: {formatTime(endTime)}</p>
      </div>
      {status === "available" && onBook && (
        <Button variant="primary" size="sm" onClick={() => onBook(id)} className="w-full">
          予約する
        </Button>
      )}
    </Card>
  );
}
