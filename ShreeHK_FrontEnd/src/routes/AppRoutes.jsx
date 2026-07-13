import { useEffect, useMemo } from "react";
import { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import {
  getAuthorizedRouteMeta,
  getPostLoginPath,
  normalizeAuthUser,
  publicRoutes,
} from "./Routes";
import LayoutShell from "../components/layout/LayoutShell";
import Loader from "../components/common/Loader";
import useAuthStore from "../store/Auth.Store";


export default function AppRoutes() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const storePermissions = useAuthStore((state) => state.permissions);
  const sanitizeUser = useAuthStore((state) => state.sanitizeUser);

  const userWithPerms = useMemo(() => normalizeAuthUser({
    ...user,
    permissions: user?.permissions ?? storePermissions ?? [],
  }), [user, storePermissions]);

  useEffect(() => {
    if (isAuthenticated && user) {
      sanitizeUser();
    }
  }, [isAuthenticated, user, sanitizeUser]);

  const { flatRoutes: authorizedRoutes } = useMemo(
    () => getAuthorizedRouteMeta(userWithPerms),
    [userWithPerms]
  );

  const defaultAuthedPath = getPostLoginPath(userWithPerms);

  return (
    <Routes>
      {/* 1. PUBLIC ROUTES (Login, Register etc.) */}
      {publicRoutes.map((r, i) => (
        <Route
          key={`public-${i}`}
          path={r.path}
          element={
            // AGAR LOGIN HAI TO DASHBOARD BHEJO, WARNA LOGIN DIKHAO
            !isAuthenticated ? (
              <Suspense fallback={<Loader />}>{r.element}</Suspense>
            ) : (
              <Navigate to={getPostLoginPath(userWithPerms)} replace />
            )
          }
        />
      ))}

      {/* 2. PROTECTED ROUTES (Dashboard, Profile etc.) */}
      <Route
        element={
          isAuthenticated ? <LayoutShell /> : <Navigate to="/auth/login" replace />
        }
      >
        {authorizedRoutes.map((r, i) => (
          <Route
            key={`protected-${i}`}
            path={r.path}
            element={<Suspense fallback={<Loader />}>{r.element}</Suspense>}
          />
        ))}
      </Route>

      {/* 3. FALLBACK */}
      <Route
        path="*"
        element={
          <Navigate to={isAuthenticated ? defaultAuthedPath : "/auth/login"} replace />
        }
      />
    </Routes>
  );
}