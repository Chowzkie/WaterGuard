// LoginForm.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeClosed, User } from 'lucide-react';
import loginStyle from '../Styles/loginStyle.module.css';
import Logo from '../assets/Logo.png';
import axios from 'axios';

function LoginForm({ onLogin }) {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState('Please Input your Username and Password');
    const [isError, setIsError] = useState(false);
    const [shake, setShake] = useState(false);

    // login submission to interact with the backend
    const handleSubmit = async (e) => { // Made the function async
        e.preventDefault();
        setMessage('Logging in...'); // Provide feedback to the user
        setIsError(false);
        setShake(false);

        try {
            // Send a POST request to backend's login endpoint
            const response = await axios.post('http://localhost:8080/api/auth/login', {
                username,
                password,
            });

            // Check if the response contains both the authentication token and user data
            if (response.data.token && response.data.user) {
                // Pass the token and user object to the onLogin function from App.jsx
                onLogin(response.data.token, response.data.user);
                navigate('/overview'); // Navigate to the overview page
                setMessage('Login successful!'); // display success message briefly
            } else {
                //Handle cases where the backend returns a successful response but with an unexpected format
                setMessage('Login failed. Please check your username and password.');
                setIsError(true);
                setShake(true);
            }
        } catch (error) {
            console.error('Login error:', error);
            // FIX: Use the error message from the backend response if available, otherwise use a generic message
            const errorMessage = error.response?.data?.message || 'An error occurred during login. Please try again.';
            setMessage(errorMessage);
            setIsError(true);
            setShake(true);
        } finally {
            // Stop shaking after a short delay, regardless of success or failure
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