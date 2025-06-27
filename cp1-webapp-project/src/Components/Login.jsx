import LoginForm from './LoginForm';
import Style from '../Styles/loginStyle.module.css';

function Login({ onLogin }) {
  return (
    <div className={Style['Wrapper']}>
      <LoginForm onLogin={onLogin} />
    </div>
  );
}

export default Login;
