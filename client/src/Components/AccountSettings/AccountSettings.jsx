import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Phone, Edit2, ShieldCheck, AlertTriangle, ArrowLeft, Camera, Check, X as CancelIcon } from 'lucide-react';
import Styles from '../../Styles/AccountSettStyle/AccountSettings.module.css';
import AlertsContext from '../../utils/AlertsContext';
import axios from 'axios'; // Import Axios

const API_BASE_URL = 'http://localhost:8080/api'; // Define your API base URL

const AccountSettings = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // Get the logging functions and loggedInUser from the global context in App.jsx
    const { onProfileUpdate, onPasswordChange, loggedInUser } = useContext(AlertsContext);

    // --- STATE MANAGEMENT ---

    /**
     * @state {string} activeTab - Tracks the currently visible tab ('profile' or 'password').
     */
    const [activeTab, setActiveTab] = useState('profile');

    /**
     * @state {object} currentUser - Holds the user's current data. Fetched from an API.
     */
    const [currentUser, setCurrentUser] = useState(null); // Initialize as null, will be fetched

    /**
     * @state {string} successMessage - Stores the text for the success notification pop-up.
     */
    const [successMessage, setSuccessMessage] = useState('');

    /**
     * @state {string} errorMessage - Stores the text for the error notification pop-up.
     */
    const [errorMessage, setErrorMessage] = useState('');

    /**
     * @state {boolean} isEditingPhone - Toggles the edit mode for the phone number field.
     */
    const [isEditingPhone, setIsEditingPhone] = useState(false);

    /**
     * @state {string} phoneNumber - Holds the value of the phone number input field while editing.
     */
    const [phoneNumber, setPhoneNumber] = useState(''); // Initialize empty, will be set from currentUser

    /**
     * @state {string|null} newProfilePic - Holds the base64 data URL for the new profile picture preview.
     */
    const [newProfilePic, setNewProfilePic] = useState(null); 

    /**
     * @state {string} currentPassword - Holds the value for the 'Current Password' input field.
     */
    const [currentPassword, setCurrentPassword] = useState('');

    /**
     * @state {string} newPassword - Holds the value for the 'New Password' input field.
     */
    const [newPassword, setNewPassword] = useState('');

    /**
     * @state {string} confirmPassword - Holds the value for the 'Confirm New Password' input field.
     */
    const [confirmPassword, setConfirmPassword] = useState('');

    /**
     * @state {boolean} isPhoneDirty - Tracks if the phone number has been changed from its original value.
     */
    const [isPhoneDirty, setIsPhoneDirty] = useState(false);
    
    // --- useEffect Hooks ---

    /**
     * @effect - Fetches the current user's profile data on component mount or if loggedInUser changes.
     */
    const fetchUserProfile = async () => {
        // Check if the user is logged in
        if (loggedInUser?.username) {
            console.log("AccountSettings.jsx - fetchUserProfile: Attempting to fetch for username:", loggedInUser.username);
            
            // Retrieve the token from local storage or context
            const token = localStorage.getItem('token'); 
            
            if (!token) {
                console.error("AccountSettings.jsx - fetchUserProfile: No token found, cannot fetch user profile.");
                setErrorMessage("Authentication failed. Please log in again.");
                return; // Exit the function if no token exists
            }

            try {
                // Add the Authorization header with the Bearer token
                const response = await axios.get(`${API_BASE_URL}/auth/user`, {
                    headers: {
                        'Authorization': `Bearer ${token}` 
                    }
                });

                // Handle the successful response as you were before
                setCurrentUser(response.data);
                setPhoneNumber(response.data.contact);
                console.log("AccountSettings.jsx - fetchUserProfile: Successfully fetched currentUser:", response.data);
            } catch (error) {
                console.error("AccountSettings.jsx - fetchUserProfile: Failed to fetch user profile:", error.response?.data?.message || error.message);
                // Check for specific 401 Unauthorized error
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


    /**
     * @effect - Automatically clears success or error messages after a 4-second delay.
     */
    useEffect(() => {
        if (successMessage || errorMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage('');
                setErrorMessage('');
            }, 4000);
            return () => clearTimeout(timer); // Cleanup timer on component unmount or if message changes
        }
    }, [successMessage, errorMessage]);

    /**
     * @effect - Checks if the phone number form is "dirty" (has changes) to enable/disable the save button.
     */
    useEffect(() => {
        // Only set dirty if currentUser is loaded and phone number is different
        if (currentUser && isEditingPhone) {
            setIsPhoneDirty(phoneNumber !== currentUser.contact);
        } else {
            setIsPhoneDirty(false);
        }
    }, [phoneNumber, currentUser, isEditingPhone]);

    // --- HANDLERS ---

    /**
     * Navigates the user to the previous page in their browser history.
     */
    const handleBack = () => navigate('/overview');

    /**
     * A dedicated function to instantly save the new profile picture.
     * It is called immediately after a new image is selected. It logs the action,
     * updates the main user state, shows a success message, and clears the preview state.
     * @param {string} newPicDataUrl - The base64 data URL of the new image.
     */
    const handleSaveProfilePic = async (newPicDataUrl) => {
        // In a real app, this would involve uploading to a storage service and updating user record in DB
        // For now, we simulate success and log the action.
        const result = await onProfileUpdate({ profilePic: { new: newPicDataUrl } });
        if (result.success) {
            setCurrentUser(prev => ({ ...prev, profilePic: newPicDataUrl }));
            setSuccessMessage("Profile picture updated successfully!");
            setNewProfilePic(null);
        } else {
            setErrorMessage(result.message);
        }
    };

    /**
     * The file selection handler triggers the auto-save for the profile picture.
     * It reads the selected file, converts it to a data URL, and then calls
     * the dedicated save function to complete the update.
     * @param {React.ChangeEvent<HTMLInputElement>} e - The file input change event.
     */
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

    /**
     * Saves the changes made to the user's phone number. This function is called
     * by the "Save" button in the header. It validates the phone number format,
     * logs the change to the audit trail, updates the main user state, exits
     * edit mode, and displays a success notification.
     */
    const handleSavePhone = async () => {
        setErrorMessage('');
        
        // Trim whitespace from phone number
        const cleanedPhoneNumber = phoneNumber.trim();

        // Regex for 11 digits starting with "09" or 13 digits starting with "+639"
        const regex09 = /^09\d{9}$/; // 09 + 9 digits = 11 digits
        const regexPlus63 = /^\+639\d{9}$/; // +639 + 9 digits = 13 digits

        if (!regex09.test(cleanedPhoneNumber) && !regexPlus63.test(cleanedPhoneNumber)) {
            setErrorMessage("Please enter a valid Philippine phone number. It must be 11 digits starting with '09' (e.g., 09xxxxxxxxx) or 13 digits starting with '+639' (e.g., +639xxxxxxxxx).");
            return;
        }

        // Prevent saving if no actual change
        if (cleanedPhoneNumber === currentUser.contact) {
            setErrorMessage("Phone number is the same as current. No changes to save.");
            setIsEditingPhone(false);
            return;
        }

        try {
            const result = await onProfileUpdate({ phone: { old: currentUser.contact, new: cleanedPhoneNumber } });
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

    /**
     * Cancels any ongoing edits for the phone number. It reverts the phone number
     * field to its original value and exits the edit mode.
     */
    const handleCancelPhone = () => {
        setIsEditingPhone(false);
        setPhoneNumber(currentUser.contact); // Revert to original phone number
        setErrorMessage('');
    };

    /**
     * Handles the password change form submission. It validates that the new
     * passwords match and meet security requirements, and also verifies the current password.
     * On success, it logs the action, clears the form fields, and shows a success message.
     * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
     */
    const handleChangePassword = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        // Client-side validation for password strength
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        
        if (!currentPassword) {
            setErrorMessage("Please enter your current password.");
            return;
        }
        if (!newPassword) {
            setErrorMessage("Please enter a new password.");
            return;
        }
        if (!confirmPassword) {
            setErrorMessage("Please confirm your new password.");
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
            // Call the API via the context function
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
    
    // Show loading or fallback if currentUser is not yet loaded
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
                        <p className={Styles['profilePhone']}>{currentUser.contact}</p> {/* Display current phone */}
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

                {/* --- Main Content (Layout Corrected) --- */}
                <main className={Styles['mainContent']}>
                    <div className={Styles['contentHeader']}>
                        <h1 className={Styles['contentTitle']}>
                            {activeTab === 'profile' ? 'Personal Information' : 'Password & Security'}
                        </h1>
                        {/* The header Save/Cancel buttons now only appear when editing the phone number */}
                        {isEditingPhone && activeTab === 'profile' && (
                            <div className={Styles['headerActions']}>
                                <button onClick={handleCancelPhone} className={`${Styles['button']} ${Styles['buttonSecondary']}`}>Cancel</button>
                                <button onClick={handleSavePhone} className={`${Styles['button']} ${Styles['buttonPrimary']}`} disabled={!isPhoneDirty}>Save</button>
                            </div>
                        )}
                    </div>

                    {/* This is the main content area that now correctly renders the cards */}
                    {activeTab === 'profile' && (
                        <div className={Styles['card']}>
                            <div className={Styles['cardBody']}>
                                <div className={Styles['cardRow']}>
                                    <p className={Styles['rowLabel']}>Full Name</p>
                                    <div className={Styles['rowDetails']}><p className={Styles['rowValue']}>{currentUser.name}</p></div> 
                                </div>
                                <div className={Styles['cardRow']}>
                                    <p className={Styles['rowLabel']}>Username</p>
                                    <div className={Styles['rowDetails']}><p className={Styles['rowValue']}>@{currentUser.username}</p></div>
                                </div>
                                <div className={Styles['cardRow']}>
                                    <p className={Styles['rowLabel']}>Phone Number</p>
                                    <div className={Styles['rowDetails']}>
                                        {isEditingPhone ? (
                                            <div>
                                                <input id="phone" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className={Styles['input']} />
                                                <p className={Styles['helperText']}>Must be 11 digits (e.g., 09xxxxxxxxx) or 13 digits (e.g., +639xxxxxxxxx) for SMS alerts.</p>
                                            </div>
                                        ) : (
                                            <p className={Styles['rowValue']}>{currentUser.contact}</p> 
                                        )}
                                    </div>
                                    {/* The simple edit icon is used again, and inline buttons are removed */}
                                    {!isEditingPhone && (
                                        <button onClick={() => setIsEditingPhone(true)} className={Styles['editButton']}><Edit2 size={16} /></button>
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