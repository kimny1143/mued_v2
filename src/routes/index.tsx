import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { PageLandingMued } from "../screens/PageLandingMued";
import { LoginPage } from "../screens/LoginPage";
import { SignupPage } from "../screens/SignupPage";
import { DashboardPage } from "../screens/DashboardPage";
import { SettingsPage } from "../screens/SettingsPage";
import { MyLessonsPage } from "../screens/MyLessonsPage";
import { MaterialsPage } from "../screens/MaterialsPage";
import { MessagesPage } from "../screens/MessagesPage";
import { PlansPage } from "../screens/PlansPage";
import { SuccessPage } from "../screens/SuccessPage";
import { CancelPage } from "../screens/CancelPage";
import { PrivateRoute } from "../components/PrivateRoute";
import { AuthProvider } from "../contexts/AuthContext";

// 公開ルート
const publicRoutes = [
  {
    path: "/",
    element: <PageLandingMued />
  },
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    path: "/signup",
    element: <SignupPage />
  },
  {
    path: "/success",
    element: <SuccessPage />
  },
  {
    path: "/cancel",
    element: <CancelPage />
  }
];

// 保護されたルート
const protectedRoutes = [
  {
    path: "/dashboard",
    element: <DashboardPage />
  },
  {
    path: "/my-lessons",
    element: <MyLessonsPage />
  },
  {
    path: "/materials",
    element: <MaterialsPage />
  },
  {
    path: "/messages",
    element: <MessagesPage />
  },
  {
    path: "/settings",
    element: <SettingsPage />
  },
  {
    path: "/plans",
    element: <PlansPage />
  }
];

// ルーターの定義
const router = createBrowserRouter([
  ...publicRoutes,
  ...protectedRoutes.map(route => ({
    path: route.path,
    element: <PrivateRoute>{route.element}</PrivateRoute>
  }))
]);

export function AppRoutes() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
} 