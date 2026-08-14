import { Form, Input, Button, Typography } from 'antd';
// import loginImage from "../../assets/signin_logo.jpg";
import loginImage from "../../assets/Gemini_Generated_Image.png";
import brandLockup from "../../assets/Brand_Logo/oneline_logo.png";
import styles from '../../assets/scss/pages/login.module.scss';
import { toastApiError } from '../../utils/apiToast';
import { useNavigate } from 'react-router-dom';
import { usePostApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../constants/endpoints';
import useAuthStore from '../../store/Auth.Store';
import { getPostLoginPath } from '../../routes/Routes';

const { Title, Text } = Typography;

const Login = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const setShowContextPicker = useAuthStore((state) => state.setShowContextPicker);
  const { mutate: loginUser, isPending } = usePostApiRequest(ENDPOINTS.auth.login, null, { showToast: false });

  const onFinish = (values) => {
    if (isPending) return;

    loginUser(values, {
      onSuccess: (data) => {
        if (data?.token) {
          login(data.user, data.token, {});
          setShowContextPicker(true);
          navigate(getPostLoginPath(useAuthStore.getState().user));
        }
      },
      onError: (err) => {
        toastApiError(err);
      }
    });
  };

  return (
    <div className={styles.authFluid}>
      <div className={styles.authFluidRight}>
        <div
          className={styles.bgImageHolder}
          style={{ backgroundImage: `url(${loginImage})` }}
        >
          <div className={styles.overlay}></div>
        </div>
      </div>

      <div className={styles.authFluidFormBox}>
        <div className={styles.formInner}>
          <div className={styles.logoWrapper}>
            <img
              src={brandLockup}
              alt="Smart DIA"
              className={styles.logoIcon}
              decoding="sync"
              fetchPriority="high"
            />
            <span className={styles.brandTagline}>
              Diamond Inventory &amp; Account Solution
            </span>
          </div>
          <Title level={3} className={styles.loginTitle}>Sign In</Title>
          <Text className={styles.loginSubtitle}>
            {/* Login with <b>admin@erp.com</b> / <b>admin123</b> */}
            Login with <b>Email or UserName</b>
          </Text>

          <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              label="Username / Email"
              name="username"
              rules={[{ required: true, message: 'Please enter username' }]}
            >
              <Input placeholder="Enter your username or email" className={styles.customInput} />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: 'Please enter password' }]}
            >
              <Input.Password placeholder="Enter your password" className={styles.customInput} />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              className={styles.signInBtn}
              block
              loading={isPending}
              disabled={isPending}
            >
              Sign In
            </Button>
          </Form>

          <footer className={styles.footerText}>
            <Text type="secondary">2026 © Smart DIA. All rights reserved. Developed by 3ni Infotech.</Text>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Login;