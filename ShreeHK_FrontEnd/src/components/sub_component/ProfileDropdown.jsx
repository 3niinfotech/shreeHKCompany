// import React, { useEffect, useState } from 'react';
// import { Dropdown, Avatar, Modal } from 'antd';
// import { ExclamationCircleOutlined } from '@ant-design/icons';
// import {
//   User,
//   Settings,
//   Building2,
//   LogOut,
//   ChevronDown,
//   Gem,
//   Sparkles,
// } from 'lucide-react';
// import useAuthStore from '../../store/Auth.Store';
// import { api } from '../../api/axiosInstance';
// import { Link, useNavigate } from 'react-router-dom';
// import { resolveUploadUrl } from '../../utils/uploadBaseUrl';
// import styles from '../../assets/scss/components/profileDropdown.module.scss';

// const getRoleLabel = (user) => {
//   if (!user) return 'Admin';
//   if (user.role_name) return user.role_name;
//   if (Number(user.roll) === 1 || user.role === 'super_admin') return 'Super Admin';
//   if (user.role === 'admin') return 'Admin';
//   return user.role || 'User';
// };

// const getUserDisplayName = (user) => {
//   const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
//   if (fullName) return fullName;
//   if (user?.user_name) return user.user_name;
//   if (user?.username) return user.username;
//   if (user?.name) return user.name;
//   return "User";
// };

// const getCompanyLabel = (user, companyName) => {
//   if (companyName) return companyName;
//   if (user?.company_name) return user.company_name;
//   return null;
// };

// const preventDropdownClose = (event) => {
//   event.preventDefault();
//   event.stopPropagation();
// };

// const ProfileMenuPanel = ({
//   userDisplayName,
//   displayCompany,
//   roleLabel,
//   yearId,
//   userInitial,
//   profileImage,
//   onSwitchContext,
//   onLogout,
//   onNavigate,
// }) => (
//   <div
//     className={styles.panel}
//     onMouseDown={preventDropdownClose}
//     onClick={(e) => e.stopPropagation()}
//   >
//     <div className={styles.panelHero}>
//       <div className={styles.heroGlow} aria-hidden="true" />
//       <div className={styles.heroShine} aria-hidden="true" />

//       <div className={styles.heroContent}>
//         <div className={styles.heroAvatarWrap}>
//           <span className={styles.heroAvatarRing} aria-hidden="true" />
//           <Avatar
//             className={styles.heroAvatar}
//             src={profileImage ? resolveUploadUrl(profileImage) : null}
//             size={52}
//           >
//             {!profileImage && userInitial}
//           </Avatar>
//           <span className={styles.heroBadge} aria-hidden="true">
//             <Gem size={11} strokeWidth={2.2} />
//           </span>
//         </div>

//         <div className={styles.heroText}>
//           <span className={styles.heroEyebrow}>
//             <Sparkles size={12} />
//             Signed in as
//           </span>
//           <h3 className={styles.heroTitle}>{userDisplayName}</h3>
//           <p className={styles.heroMeta}>
//             {displayCompany ? (
//               <span className={styles.companyChip} title={displayCompany}>
//                 {displayCompany}
//               </span>
//             ) : null}
//             {/* <span className={styles.roleChip}>{roleLabel}</span> */}
//             {/* {yearId ? <span className={styles.yearChip}>FY {yearId}</span> : null} */}
//           </p>
//         </div>
//       </div>
//     </div>

//     <nav className={styles.menuList} aria-label="Profile menu">
//       <Link
//         to="/my-account"
//         className={styles.menuItem}
//         onClick={() => onNavigate?.()}
//       >
//         <span className={`${styles.menuIcon} ${styles.menuIconAccount}`}>
//           <User size={17} strokeWidth={2} />
//         </span>
//         <span className={styles.menuCopy}>
//           <span className={styles.menuLabel}>My Account</span>
//           <span className={styles.menuHint}>Profile & preferences</span>
//         </span>
//         <ChevronDown size={14} className={styles.menuArrow} />
//       </Link>

//       <Link
//         to="/settings"
//         className={styles.menuItem}
//         onClick={() => onNavigate?.()}
//       >
//         <span className={`${styles.menuIcon} ${styles.menuIconSettings}`}>
//           <Settings size={17} strokeWidth={2} />
//         </span>
//         <span className={styles.menuCopy}>
//           <span className={styles.menuLabel}>Settings</span>
//           <span className={styles.menuHint}>System configuration</span>
//         </span>
//         <ChevronDown size={14} className={styles.menuArrow} />
//       </Link>

//       <button
//         type="button"
//         className={styles.menuItem}
//         onClick={onSwitchContext}
//       >
//         <span className={`${styles.menuIcon} ${styles.menuIconContext}`}>
//           <Building2 size={17} strokeWidth={2} />
//         </span>
//         <span className={styles.menuCopy}>
//           <span className={styles.menuLabel}>Switch Company / Year</span>
//           <span className={styles.menuHint}>Change active session</span>
//         </span>
//         <ChevronDown size={14} className={styles.menuArrow} />
//       </button>
//     </nav>

//     <div className={styles.panelFooter}>
//       <button type="button" className={styles.logoutBtn} onClick={onLogout}>
//         <span className={styles.logoutIcon}>
//           <LogOut size={16} strokeWidth={2} />
//         </span>
//         <span>Sign Out</span>
//       </button>
//     </div>
//   </div>
// );

// const ProfileDropdown = () => {
//   const navigate = useNavigate();
//   const [open, setOpen] = useState(false);
//   const user = useAuthStore((state) => state.user);
//   const companyId = useAuthStore((state) => state.companyId);
//   const companyName = useAuthStore((state) => state.companyName);
//   const setSessionContext = useAuthStore((state) => state.setSessionContext);
//   const setShowContextPicker = useAuthStore((state) => state.setShowContextPicker);
//   const logout = useAuthStore((state) => state.logout);
//   const yearId = useAuthStore((state) => state.yearId);
//   const userDisplayName = getUserDisplayName(user);
//   const displayCompany = getCompanyLabel(user, companyName);
//   const userInitial = user?.first_name
//     ? user.first_name.charAt(0).toUpperCase()
//     : (user?.user_name || userDisplayName).charAt(0).toUpperCase();
//   const roleLabel = getRoleLabel(user);

//   // const profileSubtitle = [displayCompany, roleLabel, yearId ? `FY ${yearId}` : null]
//   //   .filter(Boolean)
//   //   .join(" · ");

//   const profileSubtitle = "";

//   useEffect(() => {
//     if (!companyId || companyName) return undefined;

//     let cancelled = false;
//     api
//       .get('/master/company', { params: { id: companyId, limit: 1, offset: 0 } })
//       .then((res) => {
//         if (cancelled) return;
//         const name = res.data?.Data?.[0]?.name;
//         if (name) setSessionContext({ companyName: name });
//       })
//       .catch(() => { });

//     return () => {
//       cancelled = true;
//     };
//   }, [companyId, companyName, setSessionContext]);

//   const handleLogout = () => {
//     setOpen(false);
//     Modal.confirm({
//       title: 'Are you sure you want to logout?',
//       icon: <ExclamationCircleOutlined />,
//       content: 'Your session will be cleared.',
//       okText: 'Logout',
//       okType: 'danger',
//       cancelText: 'Cancel',
//       async onOk() {
//         await logout();
//         navigate('/auth/login');
//       },
//     });
//   };

//   const handleSwitchContext = () => {
//     setOpen(false);
//     setShowContextPicker(true);
//   };

//   return (
//     <Dropdown
//       open={open}
//       onOpenChange={setOpen}
//       trigger={['click']}
//       placement="bottomRight"
//       classNames={{ root: styles.popupRoot }}
//       popupRender={() => (
//         <ProfileMenuPanel
//           userDisplayName={userDisplayName}
//           displayCompany={displayCompany}
//           roleLabel={roleLabel}
//           yearId={yearId}
//           userInitial={userInitial}
//           profileImage={user?.profile_image}
//           onSwitchContext={handleSwitchContext}
//           onLogout={handleLogout}
//           onNavigate={() => setOpen(false)}
//         />
//       )}
//     >
//       <a
//         onClick={(e) => e.preventDefault()}
//         className={`profile-dropdown-link ${styles.profileLink} ${open ? styles.profileLinkActive : ''}`}
//         aria-expanded={open}
//       >
//         <Avatar
//           className={styles.avatar}
//           src={user?.profile_image ? resolveUploadUrl(user.profile_image) : null}
//           size={40}
//         >
//           {!user?.profile_image && userInitial}
//         </Avatar>

//         {/* <span className={styles.profileText}>
//           <span className={styles.companyName} title={userDisplayName}>
//             {userDisplayName}
//           </span>
//           <span className={styles.roleName} title={profileSubtitle}>
//             {profileSubtitle}
//           </span>
//         </span> */}

//         <span className={styles.profileText}>
//           <span className={styles.companyName} title={userDisplayName}>
//             {userDisplayName}
//           </span>
//         </span>

//         <ChevronDown
//           size={14}
//           className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
//         />
//       </a>
//     </Dropdown>
//   );
// };

// export default React.memo(ProfileDropdown);






















import React, { useEffect, useState } from 'react';
import { Dropdown, Avatar, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import {
  User,
  Settings,
  Building2,
  LogOut,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Gem,
  Sparkles,
} from 'lucide-react';
import useAuthStore from '../../store/Auth.Store';
import { api } from '../../api/axiosInstance';
import { Link, useNavigate } from 'react-router-dom';
import { resolveUploadUrl } from '../../utils/uploadBaseUrl';
import { formatLastActive } from '../../utils/relativeTime';
import styles from '../../assets/scss/components/profileDropdown.module.scss';

const LAST_ACTIVE_REFRESH_MS = 30 * 1000;

const getRoleLabel = (user) => {
  if (!user) return 'Admin';
  if (user.role_name) return user.role_name;
  if (Number(user.roll) === 1 || user.role === 'super_admin') return 'Super Admin';
  if (user.role === 'admin') return 'Admin';
  return user.role || 'User';
};

const getUserDisplayName = (user) => {
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  if (user?.user_name) return user.user_name;
  if (user?.username) return user.username;
  if (user?.name) return user.name;
  return "User";
};

const getCompanyLabel = (user, companyName) => {
  if (companyName) return companyName;
  if (user?.company_name) return user.company_name;
  return null;
};

const preventDropdownClose = (event) => {
  event.preventDefault();
  event.stopPropagation();
};

const ProfileMenuPanel = ({
  userDisplayName,
  displayCompany,
  roleLabel,
  yearId,
  userInitial,
  profileImage,
  lastActiveLabel,
  onSwitchContext,
  onLogout,
  onNavigate,
}) => (
  <div
    className={styles.panel}
    data-activity-ignore="true"
    onMouseDown={preventDropdownClose}
    onClick={(e) => e.stopPropagation()}
  >
    <div className={styles.panelHero}>
      <div className={styles.heroGlow} aria-hidden="true" />
      <div className={styles.heroDots} aria-hidden="true" />
      <div className={styles.heroShine} aria-hidden="true" />

      <div className={styles.heroContent}>
        <div className={styles.heroAvatarWrap}>
          <span className={styles.heroAvatarRing} aria-hidden="true" />
          <Avatar
            className={styles.heroAvatar}
            src={profileImage ? resolveUploadUrl(profileImage) : null}
            size={64}
          >
            {!profileImage && userInitial}
          </Avatar>
          <span className={styles.heroBadge} aria-hidden="true">
            <Gem size={12} strokeWidth={2.2} />
          </span>
        </div>

        <div className={styles.heroText}>
          <span className={styles.heroEyebrow}>
            <Sparkles size={12} />
            Signed in as
          </span>
          <h3 className={styles.heroTitle}>{userDisplayName}</h3>
          <p className={styles.heroMeta}>
            {displayCompany ? (
              <span className={styles.companyChip} title={displayCompany}>
                <Building2 size={12} strokeWidth={2} className={styles.chipIcon} />
                {displayCompany}
              </span>
            ) : null}
            {/* <span className={styles.roleChip}>{roleLabel}</span> */}
            {/* {yearId ? <span className={styles.yearChip}>FY {yearId}</span> : null} */}
          </p>
        </div>
      </div>
    </div>

    <nav className={styles.menuList} aria-label="Profile menu">
      <Link
        to="/my-account"
        className={styles.menuItem}
        onClick={() => onNavigate?.()}
      >
        <span className={`${styles.menuIcon} ${styles.menuIconAccount}`}>
          <User size={17} strokeWidth={2} />
        </span>
        <span className={styles.menuCopy}>
          <span className={styles.menuLabel}>My Account</span>
          <span className={styles.menuHint}>Profile & preferences</span>
        </span>
        <ChevronRight size={16} className={styles.menuArrow} />
      </Link>

      <Link
        to="/settings"
        className={styles.menuItem}
        onClick={() => onNavigate?.()}
      >
        <span className={`${styles.menuIcon} ${styles.menuIconSettings}`}>
          <Settings size={17} strokeWidth={2} />
        </span>
        <span className={styles.menuCopy}>
          <span className={styles.menuLabel}>Settings</span>
          <span className={styles.menuHint}>System configuration</span>
        </span>
        <ChevronRight size={16} className={styles.menuArrow} />
      </Link>

      <button
        type="button"
        className={styles.menuItem}
        onClick={onSwitchContext}
      >
        <span className={`${styles.menuIcon} ${styles.menuIconContext}`}>
          <Building2 size={17} strokeWidth={2} />
        </span>
        <span className={styles.menuCopy}>
          <span className={styles.menuLabel}>Switch Company / Year</span>
          <span className={styles.menuHint}>Change active session</span>
        </span>
        <ChevronRight size={16} className={styles.menuArrow} />
      </button>
    </nav>

    <div className={styles.panelFooter}>
      <button type="button" className={styles.logoutBtn} onClick={onLogout}>
        <span className={styles.logoutIcon}>
          <LogOut size={16} strokeWidth={2} />
        </span>
        <span>Sign Out</span>
      </button>
    </div>

    <div className={styles.sessionNote}>
      <ShieldCheck size={13} strokeWidth={2} className={styles.sessionIcon} />
      <span>Secure session</span>
      {lastActiveLabel ? (
        <>
          <span className={styles.sessionDot}>•</span>
          <span>
            Last active <span className={styles.sessionValue}>{lastActiveLabel}</span>
          </span>
        </>
      ) : null}
    </div>
  </div>
);

const ProfileDropdown = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const companyId = useAuthStore((state) => state.companyId);
  const companyName = useAuthStore((state) => state.companyName);
  const setSessionContext = useAuthStore((state) => state.setSessionContext);
  const setShowContextPicker = useAuthStore((state) => state.setShowContextPicker);
  const logout = useAuthStore((state) => state.logout);
  const yearId = useAuthStore((state) => state.yearId);
  const [lastActiveLabel, setLastActiveLabel] = useState(null);
  const userDisplayName = getUserDisplayName(user);
  const displayCompany = getCompanyLabel(user, companyName);
  const userInitial = user?.first_name
    ? user.first_name.charAt(0).toUpperCase()
    : (user?.user_name || userDisplayName).charAt(0).toUpperCase();
  const roleLabel = getRoleLabel(user);

  // const profileSubtitle = [displayCompany, roleLabel, yearId ? `FY ${yearId}` : null]
  //   .filter(Boolean)
  //   .join(" · ");

  const profileSubtitle = "";

  useEffect(() => {
    if (!open) return undefined;

    const refresh = () =>
      setLastActiveLabel(formatLastActive(useAuthStore.getState().lastActiveAt));

    refresh();
    const timer = window.setInterval(refresh, LAST_ACTIVE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (!companyId || companyName) return undefined;

    let cancelled = false;
    api
      .get('/master/company', { params: { id: companyId, limit: 1, offset: 0 } })
      .then((res) => {
        if (cancelled) return;
        const name = res.data?.Data?.[0]?.name;
        if (name) setSessionContext({ companyName: name });
      })
      .catch(() => { });

    return () => {
      cancelled = true;
    };
  }, [companyId, companyName, setSessionContext]);

  const handleLogout = () => {
    setOpen(false);
    Modal.confirm({
      icon: <ExclamationCircleOutlined />,
      content: (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(0, 0, 0, 0.88)', marginBottom: 8 }}>
            Are you sure you want to logout?
          </div>
          <div>Your session will be cleared.</div>
        </div>
      ),
      okText: 'Logout',
      okType: 'danger',
      cancelText: 'Cancel',
      cancelButtonProps: {
        type: 'default',
        danger: false,
        // style: { background: 'transparent', color: '#333', borderColor: '#d9d9d9' },
        style: {
          background: '#ffffff !important',
          backgroundColor: '#ffffff !important',
          color: '#000000 !important',
          borderColor: '#dfdbdb !important',
        },
      },
      async onOk() {
        await logout();
        navigate('/auth/login');
      },
    });
  };

  const handleSwitchContext = () => {
    setOpen(false);
    setShowContextPicker(true);
  };

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={['click']}
      placement="bottomRight"
      classNames={{ root: styles.popupRoot }}
      popupRender={() => (
        <ProfileMenuPanel
          userDisplayName={userDisplayName}
          displayCompany={displayCompany}
          roleLabel={roleLabel}
          yearId={yearId}
          userInitial={userInitial}
          profileImage={user?.profile_image}
          lastActiveLabel={lastActiveLabel}
          onSwitchContext={handleSwitchContext}
          onLogout={handleLogout}
          onNavigate={() => setOpen(false)}
        />
      )}
    >
      <a
        onClick={(e) => e.preventDefault()}
        className={`profile-dropdown-link ${styles.profileLink} ${open ? styles.profileLinkActive : ''}`}
        aria-expanded={open}
        data-activity-ignore="true"
      >
        <Avatar
          className={styles.avatar}
          src={user?.profile_image ? resolveUploadUrl(user.profile_image) : null}
          size={40}
        >
          {!user?.profile_image && userInitial}
        </Avatar>

        {/* <span className={styles.profileText}>
          <span className={styles.companyName} title={userDisplayName}>
            {userDisplayName}
          </span>
          <span className={styles.roleName} title={profileSubtitle}>
            {profileSubtitle}
          </span>
        </span> */}

        <span className={styles.profileText}>
          <span className={styles.companyName} title={userDisplayName}>
            {userDisplayName}
          </span>
        </span>

        <ChevronDown
          size={14}
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
        />
      </a>
    </Dropdown>
  );
};

export default React.memo(ProfileDropdown);