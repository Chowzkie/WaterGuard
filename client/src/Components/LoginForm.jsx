import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeClosed, User } from 'lucide-react';
import loginStyle from '../Styles/loginStyle.module.css';
import Logo from '../assets/Logo.png';

function LoginForm({ onLogin }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('Please Input your Username and Password');
  const [isError, setIsError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === 'Admin1234' && password === 'password1234') {
      onLogin(username);
      navigate('/overview');
      setIsError(false);
      setShake(false);
    } else {
      setMessage('Invalid Username and Password!');
      setIsError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className={loginStyle['Container']}>
      <div className={loginStyle['logo']}>
        <img src={Logo} alt="WaterGuard Logo" />
        <span>
          <p className={loginStyle['p1']}>Water</p>
          <p className={loginStyle['p2']}>Guard</p>
        </span>
      </div>

      <div className={`${loginStyle['message-box']} ${isError ? loginStyle['error'] : ''} ${shake ? loginStyle['shake'] : ''}`}>
        {message && <p>{message}</p>}
      </div>

      <form onSubmit={handleSubmit} className={loginStyle['FormContainer']}>
        <div className={loginStyle['input-box']}>
          <span className={loginStyle['user']}><User /></span>
          <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>

        <div className={loginStyle['input-box']}>
          <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className={loginStyle['eye-button']}>
            {showPassword ? <Eye /> : <EyeClosed />}
          </button>
        </div>

        <div className={loginStyle['button-box']}>
          <button type="submit">LOGIN</button>
        </div>
      </form>
    </div>
  );
}

export default LoginForm;