import { Navigate } from "react-router-dom";

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  // Temporarily bypass authentication check
  return <>{children}</>;
}