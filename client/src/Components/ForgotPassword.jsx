import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, KeyRound, Lock, Eye, EyeClosed, ArrowLeft, CheckCircle2 } from 'lucide-react';
import loginStyle from '../Styles/loginStyle.module.css'; // Reusing your existing styles
import Logo from '../assets/Logo.png';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function ForgotPassword() {
    const navigate = useNavigate();
    
    // Steps: 1=Email, 2=ConfirmAccount, 3=OTP, 4=NewPassword, 5=Success
    const [step, setStep] = useState(1);
    
    // Form State
    const [email, setEmail] = useState('');
    const [foundUsername, setFoundUsername] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // UI State
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // --- Handlers ---

    // Step 1: Find Account
    const handleFindAccount = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        try {
            const res = await axios.post(`${API_BASE_URL}/api/auth/forgot-password/find`, { email });
            setFoundUsername(res.data.username);
            setStep(2); // Move to "Is this you?"
        } catch (err) {
            setIsError(true);
            setMessage(err.response?.data?.message || "Account not found");
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: Confirm Identity & Send OTP
    const handleConfirmAccount = async () => {
        setIsLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/api/auth/forgot-password/send-otp`, { email });
            setStep(3); // Move to OTP Input
            setIsError(false);
            setMessage("Code sent to your email.");
        } catch (err) {
            setIsError(true);
            setMessage("Failed to send code. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Step 3: Verify OTP locally (visual only) then move to Password
    const handleVerifyOtpInput = (e) => {
        e.preventDefault();
        if(otp.length === 6) {
            setStep(4); // Move to Password Reset Form
            setMessage("Please create a new password.");
            setIsError(false);
        } else {
            setIsError(true);
            setMessage("Code must be 6 digits.");
        }
    };

    // Step 4: Reset Password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if(newPassword !== confirmPassword) {
            setIsError(true);
            setMessage("Passwords do not match.");
            return;
        }

        setIsLoading(true);
        try {
            // We send OTP again here to verify it on the server one last time before changing data
            const res = await axios.post(`${API_BASE_URL}/api/auth/forgot-password/reset`, {
                email,
                otp,
                newPassword,
                confirmPassword
            });
            setStep(5); // Success
            setMessage(res.data.message);
        } catch (err) {
            setIsError(true);
            setMessage(err.response?.data?.message || "Failed to reset password.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={loginStyle['Wrapper']}>
            <div className={loginStyle['Container']}>
                {/* Logo Section */}
                <div className={loginStyle['logo']}>
                    <img src={Logo} alt="WaterGuard Logo" />
                    <span>
                        <p className={loginStyle['p1']}>Water</p>
                        <p className={loginStyle['p2']}>Guard</p>
                    </span>
                </div>

                {/* Header Text */}
                <h3 style={{ textAlign: 'center', margin: '0 0 20px 0', color: '#333' }}>
                    {step === 5 ? "Password Reset!" : "Account Recovery"}
                </h3>

                {/* Message Box */}
                {message && (
                    <div className={`${loginStyle['message-box']} ${isError ? loginStyle['error'] : ''}`}>
                        <p>{message}</p>
                    </div>
                )}

                {/* --- Step 1: Input Email --- */}
                {step === 1 && (
                    <form onSubmit={handleFindAccount} className={loginStyle['FormContainer']}>
                        <div className={loginStyle['input-box']}>
                            <span className={loginStyle['user']}><Mail size={20} /></span>
                            <input 
                                type="email" 
                                placeholder="Enter your email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                required 
                            />
                        </div>
                        <div className={loginStyle['button-box']}>
                            <button type="submit" disabled={isLoading}>
                                {isLoading ? "Searching..." : "Find Account"}
                            </button>
                        </div>
                    </form>
                )}

                {/* --- Step 2: Confirm Account --- */}
                {step === 2 && (
                    <div style={{ textAlign: 'center', width: '100%' }}>
                        <div style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                            <User size={40} color="#007bff" style={{ marginBottom: '10px' }} />
                            <p style={{ margin: '5px 0', fontWeight: 'bold', color: '#333' }}>{foundUsername}</p>
                            <p style={{ margin: '0', fontSize: '0.9rem', color: '#666' }}>Is this your account?</p>
                        </div>
                        <div className={loginStyle['button-box']} style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button 
                                type="button" 
                                onClick={() => setStep(1)} 
                                style={{ backgroundColor: '#6c757d' }}
                            >
                                No, return
                            </button>
                            <button 
                                type="button" 
                                onClick={handleConfirmAccount}
                                disabled={isLoading}
                            >
                                {isLoading ? "Sending..." : "Yes, send code"}
                            </button>
                        </div>
                    </div>
                )}

                {/* --- Step 3: Input OTP --- */}
                {step === 3 && (
                    <form onSubmit={handleVerifyOtpInput} className={loginStyle['FormContainer']}>
                        <p style={{textAlign: 'center', fontSize: '0.9rem', marginBottom: '20px', color: '#666'}}>
                            We sent a 6-digit code to <strong>{email}</strong>
                        </p>
                        <div className={loginStyle['input-box']}>
                            <span className={loginStyle['user']}><KeyRound size={20} /></span>
                            <input 
                                type="text" 
                                placeholder="Enter 6-digit Code" 
                                value={otp} 
                                onChange={(e) => setOtp(e.target.value)} 
                                maxLength="6"
                                required 
                            />
                        </div>
                        <div className={loginStyle['button-box']}>
                            <button type="submit">Verify Code</button>
                        </div>
                        <button 
                            type="button" 
                            onClick={() => setStep(1)}
                            style={{ background: 'none', border: 'none', color: '#666', marginTop: '15px', cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                            Start Over
                        </button>
                    </form>
                )}

                {/* --- Step 4: New Password --- */}
                {step === 4 && (
                    <form onSubmit={handleResetPassword} className={loginStyle['FormContainer']}>
                         <div className={loginStyle['input-box']}>
                            <input 
                                type={showPassword ? 'text' : 'password'} 
                                placeholder="New Password" 
                                value={newPassword} 
                                onChange={(e) => setNewPassword(e.target.value)} 
                                required 
                            />
                             <button type="button" onClick={() => setShowPassword(!showPassword)} className={loginStyle['eye-button']}>
                                {showPassword ? <Eye size={20}/> : <EyeClosed size={20}/>}
                            </button>
                        </div>
                        <div className={loginStyle['input-box']}>
                            <input 
                                type={showPassword ? 'text' : 'password'} 
                                placeholder="Confirm New Password" 
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)} 
                                required 
                            />
                        </div>
                        <div className={loginStyle['button-box']}>
                            <button type="submit" disabled={isLoading}>
                                {isLoading ? "Updating..." : "Reset Password"}
                            </button>
                        </div>
                    </form>
                )}

                {/* --- Step 5: Success --- */}
                {step === 5 && (
                    <div style={{ textAlign: 'center' }}>
                        <CheckCircle2 size={60} color="#22c55e" style={{ marginBottom: '20px' }} />
                        <p style={{ marginBottom: '30px' }}>Your password has been successfully reset.</p>
                        <div className={loginStyle['button-box']}>
                            <button onClick={() => navigate('/')}>Go to Login</button>
                        </div>
                    </div>
                )}

                {/* Back to Login Link (Only for steps 1 and 3) */}
                {(step === 1) && (
                     <div style={{ marginTop: '20px', textAlign: 'center' }}>
                        <span 
                            onClick={() => navigate('/')} 
                            style={{ color: '#007bff', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                        >
                            <ArrowLeft size={16} /> Back to Login
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ForgotPassword;