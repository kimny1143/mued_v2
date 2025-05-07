import { AppRoutes } from "./routes";
import { Toaster } from "./components/ui/toast";

export default function App() {
  return (
    <>
      <Toaster />
      <AppRoutes />
    </>
  );
}