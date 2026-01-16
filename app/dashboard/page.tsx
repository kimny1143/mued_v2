import { redirect } from "next/navigation";

/**
 * Dashboard Root - Redirects to MUEDnote
 *
 * LMS features are on hold for 1/7 launch.
 * All users are redirected to MUEDnote dashboard.
 */
export default function DashboardPage() {
  redirect("/dashboard/muednote");
}
