import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Phone, Edit2, ShieldCheck, AlertTriangle, ArrowLeft, Camera, Check, X as CancelIcon } from 'lucide-react';
import Styles from '../../Styles/AccountSettStyle/AccountSettings.module.css';
import AlertsContext from '../../utils/AlertsContext';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const AccountSettings = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const { onProfileUpdate, onPasswordChange, loggedInUser } = useContext(AlertsContext);

    // --- STATE MANAGEMENT ---
    const [activeTab, setActiveTab] = useState('profile');
    const [currentUser, setCurrentUser] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // State for Phone Number editing
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isPhoneDirty, setIsPhoneDirty] = useState(false);

    // Corrected state variables for Full Name
    const [isEditingFullname, setIsEditingFullname] = useState(false);
    const [fullname, setFullname] = useState('');

    // Corrected state variables for Username
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [username, setUsername] = useState('');

    const [newProfilePic, setNewProfilePic] = useState(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // --- useEffect Hooks ---
    const fetchUserProfile = async () => {
        if (loggedInUser?.username) {
            console.log("AccountSettings.jsx - fetchUserProfile: Attempting to fetch for username:", loggedInUser.username);
            const token = localStorage.getItem('token');

            if (!token) {
                console.error("AccountSettings.jsx - fetchUserProfile: No token found, cannot fetch user profile.");
                setErrorMessage("Authentication failed. Please log in again.");
                return;
            }

            try {
                const response = await axios.get(`${API_BASE_URL}/auth/user`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                setCurrentUser(response.data);
                // Initialize all state variables with fetched data
                setFullname(response.data.name);
                setUsername(response.data.username);
                setPhoneNumber(response.data.contact);

                console.log("AccountSettings.jsx - fetchUserProfile: Successfully fetched currentUser:", response.data);
            } catch (error) {
                console.error("AccountSettings.jsx - fetchUserProfile: Failed to fetch user profile:", error.response?.data?.message || error.message);
                if (error.response?.status === 401) {
                    setErrorMessage("Your session has expired. Please log in again.");
                } else {
                    setErrorMessage("Failed to load user profile.");
                }
                setCurrentUser(null);
            }
        } else {
            console.log("AccountSettings.jsx - fetchUserProfile: loggedInUser or username is missing, not fetching.");
        }
    };
    useEffect(() => {
        fetchUserProfile();
    }, [loggedInUser]);

    useEffect(() => {
        if (successMessage || errorMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage('');
                setErrorMessage('');
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, errorMessage]);

    useEffect(() => {
        if (currentUser && isEditingPhone) {
            setIsPhoneDirty(phoneNumber !== currentUser.contact);
        } else {
            setIsPhoneDirty(false);
        }
    }, [phoneNumber, currentUser, isEditingPhone]);

    // --- HANDLERS ---
    const handleBack = () => navigate('/overview');

    const handleSaveProfilePic = async (newPicDataUrl) => {
        const result = await onProfileUpdate({ profilePic: { new: newPicDataUrl } });
        if (result.success) {
            setCurrentUser(prev => ({ ...prev, profilePic: newPicDataUrl }));
            setSuccessMessage("Profile picture updated successfully!");
            setNewProfilePic(null);
        } else {
            setErrorMessage(result.message);
        }
    };

    const handleProfilePicChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newPicDataUrl = reader.result;
                setNewProfilePic(newPicDataUrl);
                handleSaveProfilePic(newPicDataUrl);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleEditFullname = () => {
        setIsEditingFullname(true);
        setFullname(currentUser.name);
    };

    const handleSaveFullname = async () => {
        setErrorMessage('');
        const trimmedFullname = fullname.trim();

        if (trimmedFullname.length < 3) {
            setErrorMessage("Full name must be at least 3 characters long.");
            return;
        }

        if (trimmedFullname === currentUser.name) {
            setErrorMessage("Full name is the same as current. No changes to save.");
            setIsEditingFullname(false);
            return;
        }

        try {
            const result = await onProfileUpdate({ name: { old: currentUser.name, new: trimmedFullname } });
            if (result.success) {
                setCurrentUser(prev => ({ ...prev, name: trimmedFullname }));
                setIsEditingFullname(false);
                setSuccessMessage(result.message || "Full name updated successfully!");
            } else {
                setErrorMessage(result.message || "Failed to update full name.");
            }
        } catch (error) {
            setErrorMessage("An unexpected error occurred while saving the full name.");
            console.error("Error saving full name:", error);
        }
    };

    const handleCancelFullname = () => {
        setIsEditingFullname(false);
        setFullname(currentUser.name);
        setErrorMessage('');
    };

    const handleEditUsername = () => {
        setIsEditingUsername(true);
        setUsername(currentUser.username);
    };

    const handleSaveUsername = async () => {
        setErrorMessage('');
        const trimmedUsername = username.trim();

        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(trimmedUsername)) {
            setErrorMessage("Username must be 3-20 characters and contain only letters, numbers, and underscores.");
            return;
        }

        if (trimmedUsername === currentUser.username) {
            setErrorMessage("Username is the same as current. No changes to save.");
            setIsEditingUsername(false);
            return;
        }

        try {
            const result = await onProfileUpdate({ username: { old: currentUser.username, new: trimmedUsername } });
            if (result.success) {
                setCurrentUser(prev => ({ ...prev, username: trimmedUsername }));
                setIsEditingUsername(false);
                setSuccessMessage(result.message || "Username updated successfully!");
            } else {
                setErrorMessage(result.message || "Failed to update username. It might already be taken.");
            }
        } catch (error) {
            setErrorMessage("An unexpected error occurred while saving the username.");
            console.error("Error saving username:", error);
        }
    };

    const handleCancelUsername = () => {
        setIsEditingUsername(false);
        setUsername(currentUser.username);
        setErrorMessage('');
    };

    const handleSavePhone = async () => {
        setErrorMessage('');
        const cleanedPhoneNumber = phoneNumber.trim();

        const regex09 = /^09\d{9}$/;
        const regexPlus63 = /^\+639\d{9}$/;

        if (!regex09.test(cleanedPhoneNumber) && !regexPlus63.test(cleanedPhoneNumber)) {
            setErrorMessage("Please enter a valid Philippine phone number. It must be 11 digits starting with '09' (e.g., 09xxxxxxxxx) or 13 digits starting with '+639' (e.g., +639xxxxxxxxx).");
            return;
        }

        if (cleanedPhoneNumber === currentUser.contact) {
            setErrorMessage("Phone number is the same as current. No changes to save.");
            setIsEditingPhone(false);
            return;
        }

        try {
            const result = await onProfileUpdate({ contact: { old: currentUser.contact, new: cleanedPhoneNumber } });
            if (result.success) {
                setCurrentUser(prev => ({ ...prev, contact: cleanedPhoneNumber }));
                setIsEditingPhone(false);
                setSuccessMessage(result.message || "Phone number updated successfully!");
            } else {
                setErrorMessage(result.message || "Failed to update phone number.");
            }
        } catch (error) {
            setErrorMessage("An unexpected error occurred while saving the phone number.");
            console.error("Error saving phone number:", error);
        }
    };

    const handleCancelPhone = () => {
        setIsEditingPhone(false);
        setPhoneNumber(currentUser.contact);
        setErrorMessage('');
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if (!currentPassword || !newPassword || !confirmPassword) {
            setErrorMessage("All password fields are required.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setErrorMessage("New passwords do not match.");
            return;
        }
        if (newPassword === currentPassword) {
            setErrorMessage("New password cannot be the same as the current password.");
            return;
        }
        if (!passwordRegex.test(newPassword)) {
            setErrorMessage("New password does not meet the strength requirements. It must be at least 8 characters long, include one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).");
            return;
        }

        try {
            const result = await onPasswordChange(currentPassword, newPassword);
            if (result.success) {
                setSuccessMessage(result.message);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                setErrorMessage(result.message);
            }
        } catch (error) {
            setErrorMessage("An unexpected error occurred while changing the password.");
            console.error("Error changing password:", error);
        }
    };

    // --- RENDER ---
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
                        {errorMessage &&
                            <div className={`${Styles['alert']} ${Styles['alertError']}`}>
                                <AlertTriangle size={20}/>
                                {errorMessage}
                            </div>
                        }
                    </main>
                </div>
            </div>
        );
    }

    const profilePicToShow = newProfilePic || currentUser.profilePic || `https://placehold.co/128x128/4f46e5/ffffff?text=${currentUser.username ? currentUser.username.charAt(0).toUpperCase() : '?'}`;

    return (
        <div className={Styles['pageWrapper']}>
            <div className={Styles['layoutGrid']}>
                {/* Left Sidebar */}
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
                        <p className={Styles['profilePhone']}>{currentUser.contact}</p>
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

                {/* Main Content */}
                <main className={Styles['mainContent']}>
                    <div className={Styles['contentHeader']}>
                        <h1 className={Styles['contentTitle']}>
                            {activeTab === 'profile' ? 'Personal Information' : 'Password & Security'}
                        </h1>
                    </div>

                    {activeTab === 'profile' && (
                        <div className={Styles['card']}>
                            <div className={Styles['cardBody']}>
                                {/* Full Name Row */}
                                <div className={Styles['cardRow']}>
                                    <p className={Styles['rowLabel']}>Full Name</p>
                                    <div className={Styles['rowDetails']}>
                                        {isEditingFullname ? (
                                            <div className={Styles['inlineEdit']}>
                                                <input
                                                    type="text"
                                                    value={fullname}
                                                    onChange={(e) => setFullname(e.target.value)}
                                                    className={Styles['input']}
                                                />
                                                <button onClick={handleSaveFullname} className={`${Styles['button']} ${Styles['iconButton']}`} disabled={fullname.trim() === currentUser.name}>
                                                    <Check size={16} />
                                                </button>
                                                <button onClick={handleCancelFullname} className={`${Styles['button']} ${Styles['iconButton']}`}>
                                                    <CancelIcon size={16} />
                                                </button>
                                            </div>
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

                                {/* Username Row */}
                                <div className={Styles['cardRow']}>
                                    <p className={Styles['rowLabel']}>Username</p>
                                    <div className={Styles['rowDetails']}>
                                        {isEditingUsername ? (
                                            <div className={Styles['inlineEdit']}>
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
                                                    <CancelIcon size={16} />
                                                </button>
                                            </div>
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

                                {/* Phone Number Row */}
                                <div className={Styles['cardRow']}>
                                    <p className={Styles['rowLabel']}>Phone Number</p>
                                    <div className={Styles['rowDetails']}>
                                        {isEditingPhone ? (
                                            <div className={Styles['inlineEdit']}>
                                                <input id="phone" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className={Styles['input']} />
                                                <p className={Styles['helperText']}>Must be 11 digits (e.g., 09xxxxxxxxx) or 13 digits (e.g., +639xxxxxxxxx) for SMS alerts.</p>
                                            </div>
                                        ) : (
                                            <p className={Styles['rowValue']}>{currentUser.contact}</p>
                                        )}
                                    </div>
                                    {!isEditingPhone && (
                                        <button onClick={() => setIsEditingPhone(true)} className={Styles['editButton']}>
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'password' && (
                        <form onSubmit={handleChangePassword}>
                            <div className={Styles['card']}>
                                <div className={Styles['cardBody']}>
                                    <div className={Styles['cardRow']}>
                                        <label htmlFor="current-password" className={Styles['rowLabel']}>Current Password</label>
                                        <input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={Styles['input']} required />
                                    </div>
                                    <div className={Styles['cardRow']}>
                                        <label htmlFor="new-password" className={Styles['rowLabel']}>New Password</label>
                                        <div>
                                            <input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={Styles['input']} required />
                                            <ul className={Styles['passwordRequirements']}>
                                                <li>At least 8 characters</li>
                                                <li>One uppercase & one lowercase letter</li>
                                                <li>One number & one special character (@$!%*?&)</li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div className={Styles['cardRow']}>
                                        <label htmlFor="confirm-password" className={Styles['rowLabel']}>Confirm New Password</label>
                                        <input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={Styles['input']} required />
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

            {/* Hidden file input and notifications */}
            <input type="file" ref={fileInputRef} onChange={handleProfilePicChange} className={Styles['hiddenInput']} accept="image/*" />
            {successMessage &&
                <div className={`${Styles['alert']} ${Styles['alertSuccess']}`}>
                    <ShieldCheck size={20}/>
                    {successMessage}
                </div>
            }
            {errorMessage &&
                <div className={`${Styles['alert']} ${Styles['alertError']}`}>
                    <AlertTriangle size={20}/>
                    {errorMessage}
                </div>
            }
        </div>
    );
};

export default AccountSettings;