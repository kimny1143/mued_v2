import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { RAGMetricsOverview } from "@/components/features/admin/rag-metrics-overview";
import { RAGMetricsHistory } from "@/components/features/admin/rag-metrics-history";
import { SLOStatusCard } from "@/components/features/admin/slo-status-card";

export default async function RAGMetricsPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Check if user is admin
  const isAdmin = user.publicMetadata?.role === "admin";

  // Debug logging
  console.log('User publicMetadata:', user.publicMetadata);
  console.log('Role:', user.publicMetadata?.role);
  console.log('Is Admin:', isAdmin);

  if (!isAdmin) {
    redirect("/dashboard");
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
          RAG Metrics Dashboard
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Monitor AI dialogue performance, citation rates, and SLO compliance
        </p>
      </section>

      {/* SLO Status Overview */}
      <div className="mb-8">
        <SLOStatusCard />
      </div>

      {/* Current Metrics Overview */}
      <div className="mb-8">
        <RAGMetricsOverview />
      </div>

      {/* Historical Data */}
      <div className="mb-8">
        <RAGMetricsHistory />
      </div>
    </DashboardLayout>
  );
}
