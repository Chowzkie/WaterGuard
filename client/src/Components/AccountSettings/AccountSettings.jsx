import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Phone, Edit2, ShieldCheck, AlertTriangle, ArrowLeft, Camera, Check, X as CancelIcon } from 'lucide-react';
import { Eye, EyeOff } from 'lucide-react';
import Styles from '../../Styles/AccountSettStyle/AccountSettings.module.css';
import AlertsContext from '../../utils/AlertsContext';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AccountSettings = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const { loggedInUser, onUserUpdate } = useContext(AlertsContext);

    // --- STATE MANAGEMENT ---
    const [activeTab, setActiveTab] = useState('profile');
    const [currentUser, setCurrentUser] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // State for Phone Number editing
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');

    // Corrected state variables for Full Name
    const [isEditingFullname, setIsEditingFullname] = useState(false);
    const [fullname, setFullname] = useState('');

    // Corrected state variables for Username
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [username, setUsername] = useState('');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // State for password visibility
    const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] = useState(false);
    const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

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
                const response = await axios.get(`${API_BASE_URL}/api/auth/user`, {
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
                //setCurrentUser(null);
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

    // --- HANDLERS ---
    const handleBack = () => navigate('/overview');



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
        setSuccessMessage("Uploading new profile picture...");
        setErrorMessage("");


        const response = await axios.put(`${API_BASE_URL}/api/auth/upload-image/${userId}`, formData, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    
        onUserUpdate(response.data.user)
        setCurrentUser(response.data.user)
        setSuccessMessage("Profile picture updated successfully!");

        } catch (error) {
            console.error("Failed to upload profile picture:", error.response?.data?.message || error.message);
            setErrorMessage(error.response?.data?.message || "Failed to update profile picture.");
        }
    };

    const handleEditFullname = () => {
        setIsEditingFullname(true);
        setFullname(currentUser.name);
    };

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
            setSuccessMessage("Full name updated successfully!");
        } catch (err) {
            console.error(err);
            setErrorMessage(err.response?.data?.message ||"Failed to update full name.");
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
            setSuccessMessage("Username Updated Successfully");

            onUserUpdate(result.data)
        }catch(err){
            console.error(err);
            setErrorMessage( err.response?.data?.message ||"Failed to update Username");
        };
    };

    const handleCancelUsername = () => {
        setIsEditingUsername(false);
        setUsername(currentUser.username);
        setErrorMessage('');
    };

    const handleSavePhone = async (e) => {
        e.preventDefault();
        try{
            const result = await axios.put(
                `${API_BASE_URL}/auth/update-contact`, 
                {contact: phoneNumber}, 
                {headers : {Authorization: `Bearer ${localStorage.getItem("token")}` }}
            );
            setCurrentUser(result.data);
            setIsEditingPhone(false);
            setSuccessMessage("Phone number updated Successfully")
        }catch(err){
            console.error(err);
            setErrorMessage(err.response?.data?.message ||"Failed to Update Contact Number");
        };
    };

    const handleCancelPhone = () => {
        setIsEditingPhone(false);
        setPhoneNumber(currentUser.contact);
        setErrorMessage('');
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        try{
            const result = await axios.put(
                `${API_BASE_URL}/api/auth/update-password`,
                {currentPassword: currentPassword, newPassword: newPassword, confirmPassword: confirmPassword},
                {headers: {Authorization: `Bearer ${localStorage.getItem("token")}`}}
            );
            setSuccessMessage(result.data.message);
            //it will be back the state into default
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            //make the eye button to close
            setIsCurrentPasswordVisible(false);
            setIsNewPasswordVisible(false);
            setIsConfirmPasswordVisible(false);

        }catch(err){
            console.error(err);
            setErrorMessage(err.response?.data?.message || "Failed to Update Password")
        }
    };

    // Toggle functions for each password field
    const toggleCurrentPasswordVisibility = () => {
        setIsCurrentPasswordVisible(!isCurrentPasswordVisible);
    };

    const toggleNewPasswordVisibility = () => {
        setIsNewPasswordVisible(!isNewPasswordVisible);
    };

    const toggleConfirmPasswordVisibility = () => {
        setIsConfirmPasswordVisible(!isConfirmPasswordVisible);
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

    const profilePicToShow = currentUser.profileImage || `https://placehold.co/128x128/4f46e5/ffffff?text=${currentUser.username ? currentUser.username.charAt(0).toUpperCase() : '?'}`;

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
                                                    <CancelIcon size={16} />
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

                                {/* Username Row */}
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
                                                    <CancelIcon size={16} />
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

                                {/* Phone Number Row */}
                                <div className={Styles['cardRow']}>
                                    <p className={Styles['rowLabel']}>Phone Number</p>
                                    <div className={Styles['rowDetails']}>
                                        {isEditingPhone ? (
                                            <form className={Styles['inlineEdit']}>
                                                <input id="phone" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className={Styles['input']} />
                                                <p className={Styles['helperText']}>Must be 11 digits (e.g., 09xxxxxxxxx) or 13 digits (e.g., +639xxxxxxxxx) for SMS alerts.</p>
                                                <button onClick={handleSavePhone} className={`${Styles['button']} ${Styles['iconButton']}`}>
                                                    <Check size={16} />
                                                </button>
                                                <button onClick={handleCancelPhone} className={`${Styles['button']} ${Styles['iconButton']}`}>
                                                    <CancelIcon size={16} />
                                                </button>
                                            </form>
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
                        {/** Password */}
                    {activeTab === 'password' && (
                        <form onSubmit={handleChangePassword}>
                            <div className={Styles['card']}>
                                <div className={Styles['cardBody']}>
                                    <div className={Styles['cardRow']}>
                                        <label htmlFor="current-password" className={Styles['rowLabel']}>Current Password</label>
                                        <div className={Styles['inputContainer']}>
                                            <input id="current-password" type={isCurrentPasswordVisible? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={Styles['input']} required />
                                            <button type='button' onClick={toggleCurrentPasswordVisibility} className={Styles['toggleButton']} aria-label={isCurrentPasswordVisible ? 'Hide confirm password' : 'Show confirm password'}> 
                                                {isCurrentPasswordVisible? <Eye /> : <EyeOff />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className={Styles['cardRow']}>
                                        <label htmlFor="new-password" className={Styles['rowLabel']}>New Password</label>
                                        <div>
                                            <div className={Styles['inputContainer']}>
                                                <input id="new-password" type={isNewPasswordVisible? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={Styles['input']} required />
                                                <button type='button' onClick={toggleNewPasswordVisibility} className={Styles['toggleButton']} aria-label={isNewPasswordVisible ? 'Hide confirm password' : 'Show confirm password'}> 
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
                                            <button type='button' onClick={toggleConfirmPasswordVisibility} className={Styles['toggleButton']} aria-label={isConfirmPasswordVisible ? 'Hide confirm password' : 'Show confirm password'}> 
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