// 共通のフォーマッター関数

export const formatDateTime = (dateString: string): string => {
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

export const formatDateTimeShort = (dateString: string): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleDateString("ja-JP", options);
};

export const formatPrice = (price: string | number): string => {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
  }).format(numPrice);
};

export const formatTime = (dateStr: string): string => {
  return new Date(dateStr).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
};
