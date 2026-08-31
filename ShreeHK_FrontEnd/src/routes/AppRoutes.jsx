import { useEffect, useMemo, useState } from "react";
import { Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import {
  getAuthorizedRouteMeta,
  getPostLoginPath,
  publicRoutes,
} from "./Routes";
import LayoutShell from "../components/layout/LayoutShell";
import Loader from "../components/common/Loader";
import PageSkeleton from "../components/common/skeleton/PageSkeleton";
import useAuthStore from "../store/Auth.Store";
import useAuthUser from "../hooks/useAuthUser";


export default function AppRoutes() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const sanitizeUser = useAuthStore((state) => state.sanitizeUser);
  const userWithPerms = useAuthUser();

  const [authHydrated, setAuthHydrated] = useState(() => useAuthStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setAuthHydrated(true);
    });
    if (useAuthStore.persist.hasHydrated()) {
      setAuthHydrated(true);
    }
    return unsub;
  }, []);

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

  if (!authHydrated) {
    return <Loader />;
  }

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
              <Suspense fallback={<PageSkeleton />}>{r.element}</Suspense>
            ) : (
              <Navigate to={getPostLoginPath(userWithPerms)} replace />
            )
          }
        />
      ))}

      {/* 2. PROTECTED ROUTES (Dashboard, Profile etc.) */}
      <Route
        element={
          isAuthenticated ? <LayoutShell /> : <Navigate to="/auth/login" state={{ from: location }} replace />
        }
      >
        {authorizedRoutes.map((r, i) => (
          <Route
            key={`protected-${i}`}
            path={r.path}
            element={<Suspense fallback={<PageSkeleton />}>{r.element}</Suspense>}
          />
        ))}
      </Route>

      {/* 3. FALLBACK */}
      <Route
        path="*"
        element={
          <Navigate to={isAuthenticated ? defaultAuthedPath : "/auth/login"} state={{ from: location }} replace />
        }
      />
    </Routes>
  );
}