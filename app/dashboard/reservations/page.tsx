"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Reservation {
  id: string;
  slotId: string;
  studentId: string;
  mentorId: string;
  status: string;
  paymentStatus: string;
  amount: string;
  notes: string | null;
  createdAt: string;
  slot: {
    startTime: string;
    endTime: string;
  };
  student: {
    id: string;
    name: string;
    email: string;
  };
  mentor: {
    id: string;
    name: string;
    email: string;
  };
}

function ReservationsContent() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const showSuccess = searchParams.get("success") === "true";

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const response = await fetch("/api/reservations");
      if (!response.ok) throw new Error("Failed to fetch reservations");
      const data = await response.json();
      setReservations(data.reservations || []);
    } catch (err) {
      setError("予約の取得に失敗しました");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
    });
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(parseFloat(price));
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      completed: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
    };

    const labels = {
      pending: "承認待ち",
      approved: "承認済み",
      paid: "支払済み",
      completed: "完了",
      cancelled: "キャンセル",
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800"}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };

    const labels = {
      pending: "未払い",
      processing: "処理中",
      completed: "支払済み",
      failed: "失敗",
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status as keyof typeof styles] || "bg-gray-100 text-gray-800"}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">予約管理</h1>
        <p className="text-gray-600">あなたの予約を管理できます</p>
      </div>

      {showSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          予約が正常に作成されました！
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {reservations.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">予約がありません</p>
          <Link
            href="/dashboard/lessons"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            レッスンを予約する
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    日時
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    メンター / 生徒
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    料金
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    支払い
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reservations.map((reservation) => (
                  <tr key={reservation.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatDateTime(reservation.slot?.startTime || "")}
                        </div>
                        <div className="text-sm text-gray-500">
                          {reservation.slot && (
                            <>
                              {new Date(reservation.slot.endTime).getHours() -
                               new Date(reservation.slot.startTime).getHours()}時間
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {reservation.mentor?.name || "不明"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {reservation.student?.name || "不明"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatPrice(reservation.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(reservation.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPaymentStatusBadge(reservation.paymentStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {reservation.paymentStatus === "pending" &&
                       (reservation.status === "approved" || reservation.status === "pending") && (
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch("/api/checkout", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ reservationId: reservation.id }),
                              });
                              if (response.ok) {
                                const data = await response.json();
                                window.location.href = data.url;
                              }
                            } catch (error) {
                              console.error("Checkout error:", error);
                            }
                          }}
                          className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                        >
                          支払う
                        </button>
                      )}
                      {reservation.status === "pending" && (
                        <span className="text-sm text-gray-500">承認待ち</span>
                      )}
                      {reservation.status === "completed" && (
                        <span className="text-sm text-gray-500">完了</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReservationsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    }>
      <ReservationsContent />
    </Suspense>
  );
}