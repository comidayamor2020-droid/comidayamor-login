import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canAccess, getDefaultRoute } from "@/lib/roles";

interface RoleRouteProps {
  path: string;
  children: React.ReactNode;
}

export function RoleRoute({ path, children }: RoleRouteProps) {
  const { profile, loading } = useAuth();

  if (loading || !profile) return null;

  const role = profile.role;

  if (!canAccess(role, path)) {
    return <Navigate to={getDefaultRoute(role)} replace />;
  }

  return <>{children}</>;
}
