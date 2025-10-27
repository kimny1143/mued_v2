import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { DashboardTabs } from "@/components/layouts/dashboard-tabs";

interface LoadingStateProps {
  message?: string;
  showLayout?: boolean;
  showTabs?: boolean;
  height?: string;
}

export function LoadingState({
  message = "Loading...",
  showLayout = true,
  showTabs = true,
  height = "h-64",
}: LoadingStateProps) {
  const content = (
    <div className={`flex justify-center items-center ${height}`}>
      <div className="animate-pulse text-gray-500">{message}</div>
    </div>
  );

  if (showLayout) {
    return (
      <DashboardLayout>
        {showTabs && <DashboardTabs />}
        {content}
      </DashboardLayout>
    );
  }

  return content;
}
