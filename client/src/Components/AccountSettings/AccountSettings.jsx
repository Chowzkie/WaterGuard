// AccountSettings.jsx
import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
// Imported specific icons for the UI and the Toast notification system
import { User, Lock, Edit2, ArrowLeft, Camera, Check, X, Eye, EyeOff, CheckCircle2, ShieldAlert } from 'lucide-react';
import Styles from '../../Styles/AccountSettStyle/AccountSettings.module.css';
import AlertsContext from '../../utils/AlertsContext';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Internal component for handling slide-in notifications
// This component manages its own exit animation before unmounting
const NotificationToast = ({ message, type, onClose }) => {
    const [isExiting, setIsExiting] = useState(false);

    // Automatically close the toast after a set duration
    useEffect(() => {
        const timer = setTimeout(() => {
            handleClose();
        }, 4000);
        return () => clearTimeout(timer);
    }, []);

    // Triggers the exit animation and waits for it to finish before removing the component
    const handleClose = () => {
        setIsExiting(true);
        setTimeout(onClose, 300);
    };

    const isSuccess = type === 'success';
    const title = isSuccess ? 'Success' : 'Error';
    const Icon = isSuccess ? CheckCircle2 : ShieldAlert;

    // Dynamically assign classes based on message type and animation state
    return (
        <div
            className={`
                ${Styles.toast}
                ${isSuccess ? Styles.toastSuccess : Styles.toastError}
                ${isExiting ? Styles.toastOutRight : Styles.toastIn}
            `}
        >
            <Icon className={Styles.toastIcon} size={22} />
            <div className={Styles.toastContent}>
                <h4>{title}</h4>
                <p>{message}</p>
                <button onClick={handleClose} className={Styles.toastClose}>
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};

const AccountSettings = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const { loggedInUser, onUserUpdate } = useContext(AlertsContext);

    // Manage which settings tab is currently visible
    const [activeTab, setActiveTab] = useState('profile');
    const [currentUser, setCurrentUser] = useState(null);
    
    // Centralized state for handling toast notifications
    const [toast, setToast] = useState(null); 

    // REFACTOR: State for Email Address editing (Replaces Phone Number)
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [email, setEmail] = useState('');

    // State variables for Full Name editing
    const [isEditingFullname, setIsEditingFullname] = useState(false);
    const [fullname, setFullname] = useState('');

    // State variables for Username editing
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [username, setUsername] = useState('');

    // State variables for Password management
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // State for password input visibility toggles
    const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] = useState(false);
    const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

    // Helper function to trigger a toast notification
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    // Fetches the latest user profile data from the API
    const fetchUserProfile = async () => {
        if (loggedInUser?.username) {
            const token = localStorage.getItem('token');

            if (!token) {
                console.error("AccountSettings.jsx: No token found, cannot fetch user profile.");
                showToast("Authentication failed. Please log in again.", 'error');
                return;
            }

            try {
                const response = await axios.get(`${API_BASE_URL}/api/auth/user`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                setCurrentUser(response.data);
                // Initialize local state with the fetched data
                setFullname(response.data.name);
                setUsername(response.data.username);
                // REFACTOR: Set email from response instead of contact
                setEmail(response.data.email || '');

            } catch (error) {
                console.error("AccountSettings.jsx: Failed to fetch user profile:", error.response?.data?.message || error.message);
                if (error.response?.status === 401) {
                    showToast("Your session has expired. Please log in again.", 'error');
                } else {
                    showToast("Failed to load user profile.", 'error');
                }
            }
        }
    };

    // Trigger data fetch when the logged-in user context changes
    useEffect(() => {
        fetchUserProfile();
    }, [loggedInUser]);

    // Navigation handler
    const handleBack = () => navigate('/overview');

    // Handles file selection and uploading for the profile picture
    const handleProfilePicChange = async (e) => {
        e.preventDefault();
        const file = e.target.files[0];
        if(!file){
            return
        }
        const formData = new FormData()
        formData.append('profileImage', file)

        const token = localStorage.getItem("token");
        const userId = currentUser._id
        
        try {
            // Show immediate feedback to the user
            showToast("Uploading new profile picture...", 'success');

            const response = await axios.put(`${API_BASE_URL}/api/auth/upload-image/${userId}`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        
            // Update global context and local state on success
            onUserUpdate(response.data.user)
            setCurrentUser(response.data.user)
            showToast("Profile picture updated successfully!", 'success');

        } catch (error) {
            console.error("Failed to upload profile picture:", error.response?.data?.message || error.message);
            showToast(error.response?.data?.message || "Failed to update profile picture.", 'error');
        }
    };

    // Enables edit mode for Full Name
    const handleEditFullname = () => {
        setIsEditingFullname(true);
        setFullname(currentUser.name);
    };

    // Submits the updated Full Name to the API
    const handleSaveFullname = async (e) => {
        e.preventDefault();
        try {
            const result = await axios.put(
                `${API_BASE_URL}/api/auth/update-name`,
                { name: fullname },
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
            );

            setCurrentUser(result.data); 
            setIsEditingFullname(false);
            showToast("Full name updated successfully!", 'success');
        } catch (err) {
            console.error(err);
            showToast(err.response?.data?.message || "Failed to update full name.", 'error');
        }
    };

    // Reverts changes to Full Name and exits edit mode
    const handleCancelFullname = () => {
        setIsEditingFullname(false);
        setFullname(currentUser.name);
    };

    // Enables edit mode for Username
    const handleEditUsername = () => {
        setIsEditingUsername(true);
        setUsername(currentUser.username);
    };

    // Submits the updated Username to the API
    const handleSaveUsername = async (e) => {
        e.preventDefault();
        try{
            const result = await axios.put(
                `${API_BASE_URL}/api/auth/update-username`, 
                {username: username}, 
                {headers : {Authorization: `Bearer ${localStorage.getItem("token")}`}}
            );
            setCurrentUser(result.data);
            setIsEditingUsername(false);
            showToast("Username Updated Successfully", 'success');

            onUserUpdate(result.data)
        }catch(err){
            console.error(err);
            showToast(err.response?.data?.message || "Failed to update Username", 'error');
        };
    };

    // Reverts changes to Username and exits edit mode
    const handleCancelUsername = () => {
        setIsEditingUsername(false);
        setUsername(currentUser.username);
    };

    // REFACTOR: Submits the updated Email to the API
    const handleSaveEmail = async (e) => {
        e.preventDefault();
        try{
            const result = await axios.put(
                `${API_BASE_URL}/api/auth/update-email`, 
                {email: email}, 
                {headers : {Authorization: `Bearer ${localStorage.getItem("token")}` }}
            );
            setCurrentUser(result.data);
            setIsEditingEmail(false);
            showToast("Email address updated successfully", 'success');
        }catch(err){
            console.error(err);
            showToast(err.response?.data?.message || "Failed to update email address", 'error');
        };
    };

    // REFACTOR: Reverts changes to Email and exits edit mode
    const handleCancelEmail = () => {
        setIsEditingEmail(false);
        setEmail(currentUser.email);
    };

    // Validates and submits password changes
    const handleChangePassword = async (e) => {
        e.preventDefault();
        try{
            const result = await axios.put(
                `${API_BASE_URL}/api/auth/update-password`,
                {currentPassword: currentPassword, newPassword: newPassword, confirmPassword: confirmPassword},
                {headers: {Authorization: `Bearer ${localStorage.getItem("token")}`}}
            );
            showToast(result.data.message, 'success');
            
            // Reset form fields upon success
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            
            // Reset visibility toggles
            setIsCurrentPasswordVisible(false);
            setIsNewPasswordVisible(false);
            setIsConfirmPasswordVisible(false);

        }catch(err){
            console.error(err);
            showToast(err.response?.data?.message || "Failed to Update Password", 'error');
        }
    };

    // Toggle functions for password field visibility
    const toggleCurrentPasswordVisibility = () => {
        setIsCurrentPasswordVisible(!isCurrentPasswordVisible);
    };

    const toggleNewPasswordVisibility = () => {
        setIsNewPasswordVisible(!isNewPasswordVisible);
    };

    const toggleConfirmPasswordVisibility = () => {
        setIsConfirmPasswordVisible(!isConfirmPasswordVisible);
    };

    // Renders a loading state if user data is not yet available
    if (!currentUser) {
        return (
            <div className={Styles['pageWrapper']}>
                <div className={Styles['layoutGrid']}>
                    <aside className={Styles['sidebar']}>
                        <button onClick={handleBack} className={Styles['backButton']}>
                            <ArrowLeft size={16} /> Back
                        </button>
                        <div className={Styles['profileHeader']}>Loading profile...</div>
                    </aside>
                    <main className={Styles['mainContent']}>
                        <h1 className={Styles['contentTitle']}>Loading...</h1>
                    </main>
                </div>
                
                {/* Displays a toast if an error occurred during loading */}
                {toast && (
                    <div className={Styles.toastContainerWrapper}>
                        <NotificationToast 
                            message={toast.message} 
                            type={toast.type} 
                            onClose={() => setToast(null)} 
                        />
                    </div>
                )}
            </div>
        );
    }

    // Determines which profile picture to display (uploaded or placeholder)
    const profilePicToShow = currentUser.profileImage || `https://placehold.co/128x128/4f46e5/ffffff?text=${currentUser.username ? currentUser.username.charAt(0).toUpperCase() : '?'}`;

    return (
        <div className={Styles['pageWrapper']}>
            <div className={Styles['layoutGrid']}>
                {/* Sidebar containing profile summary and navigation tabs */}
                <aside className={Styles['sidebar']}>
                    <button onClick={handleBack} className={Styles['backButton']}>
                        <ArrowLeft size={16} /> Back
                    </button>
                    <div className={Styles['profileHeader']}>
                        <div className={Styles['profileAvatarWrapper']} onClick={() => fileInputRef.current.click()}>
                            <img src={profilePicToShow} alt="Profile" className={Styles['profileAvatar']} />
                            <div className={Styles['avatarOverlay']}>
                                <Camera size={24} />
                            </div>
                        </div>
                        <h2 className={Styles['profileName']}>{currentUser.name}</h2>
                        <p className={Styles['profilePhone']}>@{currentUser.username}</p>
                        {/* REFACTOR: Changed contact to email */}
                        <p className={Styles['profilePhone']}>{currentUser.email}</p>
                    </div>
                    <nav className={Styles['sidebarNav']}>
                        <button onClick={() => setActiveTab('profile')} className={`${Styles['navLink']} ${activeTab === 'profile' ? Styles['navLinkActive'] : ''}`}>
                            <User size={18} /> Profile
                        </button>
                        <button onClick={() => setActiveTab('password')} className={`${Styles['navLink']} ${activeTab === 'password' ? Styles['navLinkActive'] : ''}`}>
                            <Lock size={18} /> Password & Security
                        </button>
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className={Styles['mainContent']}>
                    <div className={Styles['contentHeader']}>
                        <h1 className={Styles['contentTitle']}>
                            {activeTab === 'profile' ? 'Personal Information' : 'Password & Security'}
                        </h1>
                    </div>

                    {activeTab === 'profile' && (
                        <div className={Styles['card']}>
                            <div className={Styles['cardBody']}>
                                {/* Full Name Section */}
                                <div className={Styles['cardRow']}>
                                    <p className={Styles['rowLabel']}>Full Name</p>
                                    <div className={Styles['rowDetails']}>
                                        {isEditingFullname ? (
                                            <form onSubmit={handleSaveFullname} className={Styles['inlineEdit']}>
                                                <input
                                                    type="text"
                                                    value={fullname}
                                                    onChange={(e) => setFullname(e.target.value)}
                                                    className={Styles['input']}
                                                />
                                                <button className={`${Styles['button']} ${Styles['iconButton']}`} disabled={fullname.trim() === currentUser.name}>
                                                    <Check size={16} />
                                                </button>
                                                <button onClick={handleCancelFullname} className={`${Styles['button']} ${Styles['iconButton']}`}>
                                                    <X size={16} />
                                                </button>
                                            </form>
                                        ) : (
                                            <p className={Styles['rowValue']}>{currentUser.name}</p>
                                        )}
                                    </div>
                                    {!isEditingFullname && (
                                        <button onClick={handleEditFullname} className={Styles['editButton']}>
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* Username Section */}
                                <div className={Styles['cardRow']}>
                                    <p className={Styles['rowLabel']}>Username</p>
                                    <div className={Styles['rowDetails']}>
                                        {isEditingUsername ? (
                                            <form className={Styles['inlineEdit']}>
                                                <input
                                                    type="text"
                                                    value={username}
                                                    onChange={(e) => setUsername(e.target.value)}
                                                    className={Styles['input']}
                                                />
                                                <button onClick={handleSaveUsername} className={`${Styles['button']} ${Styles['iconButton']}`} disabled={username.trim() === currentUser.username}>
                                                    <Check size={16} />
                                                </button>
                                                <button onClick={handleCancelUsername} className={`${Styles['button']} ${Styles['iconButton']}`}>
                                                    <X size={16} />
                                                </button>
                                            </form>
                                        ) : (
                                            <p className={Styles['rowValue']}>@{currentUser.username}</p>
                                        )}
                                    </div>
                                    {!isEditingUsername && (
                                        <button onClick={handleEditUsername} className={Styles['editButton']}>
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* REFACTOR: Email Address Section (Replaces Phone Number) */}
                                <div className={Styles['cardRow']}>
                                    <p className={Styles['rowLabel']}>Email Address</p>
                                    <div className={Styles['rowDetails']}>
                                        {isEditingEmail ? (
                                            <form className={Styles['inlineEdit']}>
                                                <input 
                                                    id="email" 
                                                    type="email" 
                                                    value={email} 
                                                    onChange={(e) => setEmail(e.target.value)} 
                                                    className={Styles['input']}
                                                    placeholder="user@example.com"
                                                />
                                                <button onClick={handleSaveEmail} className={`${Styles['button']} ${Styles['iconButton']}`}>
                                                    <Check size={16} />
                                                </button>
                                                <button onClick={handleCancelEmail} className={`${Styles['button']} ${Styles['iconButton']}`}>
                                                    <X size={16} />
                                                </button>
                                            </form>
                                        ) : (
                                            <p className={Styles['rowValue']}>{currentUser.email || "No email set"}</p>
                                        )}
                                    </div>
                                    {!isEditingEmail && (
                                        <button onClick={() => setIsEditingEmail(true)} className={Styles['editButton']}>
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Password Management Section */}
                    {activeTab === 'password' && (
                        <form onSubmit={handleChangePassword}>
                            <div className={Styles['card']}>
                                <div className={Styles['cardBody']}>
                                    <div className={Styles['cardRow']}>
                                        <label htmlFor="current-password" className={Styles['rowLabel']}>Current Password</label>
                                        <div className={Styles['inputContainer']}>
                                            <input id="current-password" type={isCurrentPasswordVisible? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={Styles['input']} required />
                                            <button type='button' onClick={toggleCurrentPasswordVisibility} className={Styles['toggleButton']} aria-label={isCurrentPasswordVisible ? 'Hide password' : 'Show password'}> 
                                                {isCurrentPasswordVisible? <Eye /> : <EyeOff />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className={Styles['cardRow']}>
                                        <label htmlFor="new-password" className={Styles['rowLabel']}>New Password</label>
                                        <div>
                                            <div className={Styles['inputContainer']}>
                                                <input id="new-password" type={isNewPasswordVisible? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={Styles['input']} required />
                                                <button type='button' onClick={toggleNewPasswordVisibility} className={Styles['toggleButton']} aria-label={isNewPasswordVisible ? 'Hide password' : 'Show password'}> 
                                                    {isNewPasswordVisible? <Eye /> : <EyeOff />}
                                                </button>
                                            </div>
                                            <ul className={Styles['passwordRequirements']}>
                                                <li>At least 8 characters</li>
                                                <li>One uppercase & one lowercase letter</li>
                                                <li>One number & one special character (@$!%*?&)</li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div className={Styles['cardRow']}>
                                        <label htmlFor="confirm-password" className={Styles['rowLabel']}>Confirm New Password</label>
                                        <div className={Styles['inputContainer']}>
                                            <input id="confirm-password" type={isConfirmPasswordVisible? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={Styles['input']} required />
                                            <button type='button' onClick={toggleConfirmPasswordVisibility} className={Styles['toggleButton']} aria-label={isConfirmPasswordVisible ? 'Hide password' : 'Show password'}> 
                                                {isConfirmPasswordVisible? <Eye /> : <EyeOff />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className={Styles['cardFooter']}>
                                    <button type="submit" className={`${Styles['button']} ${Styles['buttonPrimary']}`} disabled={!currentPassword || !newPassword || !confirmPassword}>Set New Password</button>
                                </div>
                            </div>
                        </form>
                    )}
                </main>
            </div>

            {/* Hidden file input used for profile picture selection */}
            <input type="file" ref={fileInputRef} onChange={handleProfilePicChange} className={Styles['hiddenInput']} accept="image/*" />
            
            {/* Renders the notification toast if a message exists */}
            {toast && (
                <div className={Styles.toastContainerWrapper}>
                    <NotificationToast 
                        message={toast.message} 
                        type={toast.type} 
                        onClose={() => setToast(null)} 
                    />
                </div>
            )}
        </div>
    );
};

export default AccountSettings;