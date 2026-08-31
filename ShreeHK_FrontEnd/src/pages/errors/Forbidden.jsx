import { useEffect } from "react";
import { Button, Result, Space } from "antd";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/Auth.Store";
import useAuthUser from "../../hooks/useAuthUser";
import {
  userLacksRoleAccess,
  userHasAssignedRole,
  getUserPermissions,
  getPostLoginPath,
} from "../../routes/Routes";
import styles from "../../assets/scss/pages/errors/forbidden.module.scss";

const Forbidden = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const userWithPerms = useAuthUser();

  const blockedFromApp = userLacksRoleAccess(userWithPerms);
  const hasRole = userHasAssignedRole(userWithPerms);
  const hasPermissions = getUserPermissions(userWithPerms).length > 0;

  useEffect(() => {
    if (!blockedFromApp && window.location.pathname === "/forbidden") {
      const permissiblePath = getPostLoginPath(userWithPerms);
      if (permissiblePath && permissiblePath !== "/forbidden") {
        navigate(permissiblePath, { replace: true });
      }
    }
  }, [blockedFromApp, userWithPerms, navigate]);

  const getSubTitle = () => {
    if (!hasRole) {
      return "No role is assigned to your account. Please contact your administrator to assign a role, then login again.";
    }
    if (hasRole && !hasPermissions) {
      const roleLabel = userWithPerms?.role_name ? ` "${userWithPerms.role_name}"` : "";
      return `Your role${roleLabel} has no page permissions configured. Please contact your administrator to assign pages to this role, then login again.`;
    }
    return "You do not have permission to view this page. Contact your administrator if you need access.";
  };

  const handleAction = () => {
    if (blockedFromApp) {
      logout();
      navigate("/auth/login", { replace: true });
      return;
    }
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className={styles.forbiddenPage}>
      <Result
        status="403"
        title="Access Denied"
        subTitle={getSubTitle()}
        // extra={
        //   <Space>
        //     {blockedFromApp ? (
        //       <Button type="primary" onClick={handleAction}>
        //         Back to Login
        //       </Button>
        //     ) : (
        //       <Button type="primary" onClick={handleAction}>
        //         Go to Dashboard
        //       </Button>
        //     )}
        //   </Space>
        // }
      />
    </div>
  );
};

export default Forbidden;
