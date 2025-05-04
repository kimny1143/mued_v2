import { useSession, signIn, signOut } from "next-auth/react";
import { Session } from "next-auth";

interface CustomUser {
  id?: string;
  role?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface CustomSession extends Session {
  user?: CustomUser;
}

export function useAuth() {
  const { data: session, status } = useSession();
  const customSession = session as CustomSession | null;
  
  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";
  const user = customSession?.user;
  const role = user?.role || "guest";
  
  return {
    session: customSession,
    isAuthenticated,
    isLoading,
    user,
    role,
    signIn,
    signOut,
  };
} 