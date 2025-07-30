import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Phone, Edit2, ShieldCheck, AlertTriangle, ArrowLeft, Camera, Check, X as CancelIcon } from 'lucide-react';
import Styles from '../../Styles/AccountSettStyle/AccountSettings.module.css';
import AlertsContext from '../../utils/AlertsContext';

const AccountSettings = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // Get the logging functions from the global context in App.jsx
    const { onProfileUpdate, onPasswordChange } = useContext(AlertsContext);

    // --- STATE MANAGEMENT ---

    /**
     * @state {string} activeTab - Tracks the currently visible tab ('profile' or 'password').
     */
    const [activeTab, setActiveTab] = useState('profile');

    /**
     * @state {object} currentUser - Holds the user's current data. In a real app, this would be fetched from an API.
     */
    const [currentUser, setCurrentUser] = useState({
        username: 'TestAccount123',
        fullName: 'Juan Dela Cruz',
        phone: '+639812234812',
        profilePic: `https://placehold.co/128x128/4f46e5/ffffff?text=J`,
    });

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
    const [phoneNumber, setPhoneNumber] = useState(currentUser.phone);

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
        // This check is only relevant when in edit mode.
        if (isEditingPhone) {
            setIsPhoneDirty(phoneNumber !== currentUser.phone);
        } else {
            // If not in edit mode, the form is not considered dirty.
            setIsPhoneDirty(false);
        }
    }, [phoneNumber, currentUser.phone, isEditingPhone]);

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
    const handleSaveProfilePic = (newPicDataUrl) => {
        onProfileUpdate({ profilePic: true });
        setCurrentUser(prev => ({ ...prev, profilePic: newPicDataUrl }));
        setSuccessMessage("Profile picture updated successfully!");
        setNewProfilePic(null);
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
    const handleSave = () => {
        setErrorMessage('');
        const phPhoneRegex = /^\+639\d{9}$/;
        if (!phPhoneRegex.test(phoneNumber)) {
            setErrorMessage("Please enter a valid Philippine phone number (e.g., +639123456789).");
            return;
        }
        onProfileUpdate({ phone: { old: currentUser.phone, new: phoneNumber } });
        setCurrentUser(prev => ({ ...prev, phone: phoneNumber }));
        setIsEditingPhone(false);
        setSuccessMessage("Phone number updated successfully!");
    };

    /**
     * Cancels any ongoing edits for the phone number. It reverts the phone number
     * field to its original value and exits the edit mode.
     */
    const handleCancel = () => {
        setIsEditingPhone(false);
        setPhoneNumber(currentUser.phone);
        setErrorMessage('');
    };

    /**
     * Handles the password change form submission. It validates that the new
     * passwords match and meet security requirements. On success, it logs the
     * action, clears the form fields, and shows a success message.
     * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
     */
    const handleChangePassword = (e) => {
        e.preventDefault();
        setErrorMessage('');
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            setErrorMessage("Password does not meet the strength requirements.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setErrorMessage("New passwords do not match.");
            return;
        }
        onPasswordChange();
        setSuccessMessage("Password changed successfully!");
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    };
    
    // --- RENDER ---
    
    const profilePicToShow = newProfilePic || currentUser.profilePic;

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
                        <h2 className={Styles['profileName']}>{currentUser.fullName}</h2>
                        <p className={Styles['profilePhone']}>@{currentUser.username}</p>
                        <p className={Styles['profilePhone']}>{currentUser.phone}</p>
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
                                <button onClick={handleCancel} className={`${Styles['button']} ${Styles['buttonSecondary']}`}>Cancel</button>
                                <button onClick={handleSave} className={`${Styles['button']} ${Styles['buttonPrimary']}`} disabled={!isPhoneDirty}>Save</button>
                            </div>
                        )}
                    </div>

                    {/* This is the main content area that now correctly renders the cards */}
                    {activeTab === 'profile' && (
                        <div className={Styles['card']}>
                            <div className={Styles['cardBody']}>
                                <div className={Styles['cardRow']}>
                                    <p className={Styles['rowLabel']}>Full Name</p>
                                    <div className={Styles['rowDetails']}><p className={Styles['rowValue']}>{currentUser.fullName}</p></div>
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
                                                <p className={Styles['helperText']}>Must be a valid PH number (e.g., +639xxxxxxxxx) for SMS alerts.</p>
                                            </div>
                                        ) : (
                                            <p className={Styles['rowValue']}>{currentUser.phone}</p>
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
