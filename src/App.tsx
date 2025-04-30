import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PageLandingMued } from "./screens/PageLandingMued";
import { LoginPage } from "./screens/LoginPage";
import { SignupPage } from "./screens/SignupPage";
import { DashboardPage } from "./screens/DashboardPage";
import { SettingsPage } from "./screens/SettingsPage";
import { MyLessonsPage } from "./screens/MyLessonsPage";
import { MaterialsPage } from "./screens/MaterialsPage";
import { MessagesPage } from "./screens/MessagesPage";
import { PlansPage } from "./screens/PlansPage";
import { AuthProvider } from "./contexts/AuthContext";
import { PrivateRoute } from "./components/PrivateRoute";
import { SuccessPage } from "./screens/SuccessPage";
import { CancelPage } from "./screens/CancelPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<PageLandingMued />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/cancel" element={<CancelPage />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/my-lessons"
            element={
              <PrivateRoute>
                <MyLessonsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/materials"
            element={
              <PrivateRoute>
                <MaterialsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <PrivateRoute>
                <MessagesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <SettingsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/plans"
            element={
              <PrivateRoute>
                <PlansPage />
              </PrivateRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}