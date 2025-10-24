import { Button } from "@/components/ui/button";

interface Reservation {
  id: string;
  mentorName: string;
  mentorEmail: string;
  startTime: Date;
  endTime: Date;
  status: string;
  paymentStatus?: string;
}

interface ReservationTableProps {
  reservations: Reservation[];
  onPayment?: (reservationId: string) => void;
  onCancel?: (reservationId: string) => void;
}

export function ReservationTable({
  reservations,
  onPayment,
  onCancel,
}: ReservationTableProps) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--color-card-border)]">
            <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--color-text-primary)]">
              メンター
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--color-text-primary)]">
              開始時間
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--color-text-primary)]">
              終了時間
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--color-text-primary)]">
              ステータス
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--color-text-primary)]">
              決済
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--color-text-primary)]">
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          {reservations.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-8 text-gray-500">
                予約がありません
              </td>
            </tr>
          ) : (
            reservations.map((reservation) => (
              <tr key={reservation.id} className="border-b border-gray-200 hover:bg-[var(--color-card-bg)]">
                <td className="py-3 px-4">
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)]">
                      {reservation.mentorName}
                    </p>
                    <p className="text-sm text-gray-600">{reservation.mentorEmail}</p>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-gray-700">
                  {formatTime(reservation.startTime)}
                </td>
                <td className="py-3 px-4 text-sm text-gray-700">
                  {formatTime(reservation.endTime)}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      reservation.status === "confirmed"
                        ? "bg-green-100 text-green-700"
                        : reservation.status === "pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {reservation.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      reservation.paymentStatus === "completed"
                        ? "bg-green-100 text-green-700"
                        : reservation.paymentStatus === "processing"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {reservation.paymentStatus === "completed"
                      ? "決済完了"
                      : reservation.paymentStatus === "processing"
                      ? "処理中"
                      : "未払い"}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex justify-end gap-2">
                    {reservation.paymentStatus !== "completed" && onPayment && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onPayment(reservation.id)}
                      >
                        支払う
                      </Button>
                    )}
                    {onCancel && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => onCancel(reservation.id)}
                      >
                        キャンセル
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
