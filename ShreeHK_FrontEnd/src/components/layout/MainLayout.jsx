import { Outlet } from "react-router-dom";
import Header from "./Header";
import SideBar from "./SideBar";
import Footer from "./Footer";
import RoleAccessGuard from "./RoleAccessGuard";
import styles from "../../assets/scss/layout/mainLayout.module.scss";

const MainLayout = () => {
  return (
    <div className={styles.layoutmain}>
      <div className={styles.appContainer}>
        <Header />

        <div className={styles.appBody}>
          <SideBar />
          <main className={`${styles.appContent} app-page-root`}>
            <RoleAccessGuard>
              <div className={styles.pageOutlet}>
                <Outlet />
              </div>
            </RoleAccessGuard>
          </main>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default MainLayout;