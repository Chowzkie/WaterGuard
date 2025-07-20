import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Phone, Edit2, ShieldCheck, AlertTriangle, ArrowLeft, Camera } from 'lucide-react';
import Styles from '../../Styles/AccountSettStyle/AccountSettings.module.css';

const AccountSettings = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

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
    
    // Note: isEditingFullName and isEditingPhoto are removed as per the latest design changes.

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
     * @state {boolean} isProfileDirty - Tracks if any changes have been made in the profile form to enable/disable the save button.
     */
    const [isProfileDirty, setIsProfileDirty] = useState(false);

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
     * @effect - Checks if the profile form is "dirty" (has changes).
     * This is used to enable or disable the main "Save" button.
     */
    useEffect(() => {
        const hasChanged = 
            phoneNumber !== currentUser.phone || 
            newProfilePic !== null;
        setIsProfileDirty(hasChanged);
    }, [phoneNumber, newProfilePic, currentUser]);

    // --- HANDLERS ---

    /**
     * Navigates the user to the previous page in their browser history.
     */
    const handleBack = () => navigate(-1);

    /**
     * Handles the file selection for the profile picture.
     * Reads the selected file and converts it to a base64 data URL for preview.
     * @param {React.ChangeEvent<HTMLInputElement>} e - The file input change event.
     */
    const handleProfilePicChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setNewProfilePic(reader.result);
            reader.readAsDataURL(file);
        }
    };

    /**
     * Cancels any ongoing edits in the profile section.
     * Resets edit modes and form fields to their original state.
     */
    const handleCancel = () => {
        setIsEditingPhone(false);
        setPhoneNumber(currentUser.phone);
        setNewProfilePic(null);
        setErrorMessage('');
    };

    /**
     * Saves the changes made to the user's profile.
     * Validates all editable fields before proceeding.
     * On success, it updates the main user state and shows a success message.
     * @param {React.FormEvent<HTMLButtonElement>} e - The button click event.
     */
    const handleSave = (e) => {
        e.preventDefault();
        setErrorMessage('');
        
        const phPhoneRegex = /^\+639\d{9}$/;
        if (!phPhoneRegex.test(phoneNumber)) {
            setErrorMessage("Please enter a valid Philippine phone number (e.g., +639123456789).");
            return;
        }

        console.log("Saving profile:", { phoneNumber });
        setCurrentUser(prev => ({ 
            ...prev, 
            phone: phoneNumber, 
            profilePic: newProfilePic || prev.profilePic 
        }));
        setIsEditingPhone(false);
        setNewProfilePic(null);
        setSuccessMessage("Profile updated successfully!");
    };

    /**
     * Handles the password change form submission.
     * Validates that the new passwords match and meet the strength requirements.
     * On success, it clears the form fields and shows a success message.
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

        console.log("Changing password...");
        setSuccessMessage("Password changed successfully!");
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    };
    
    /**
     * @variable {string} profilePicToShow - Determines which profile picture to display (the new preview or the current one).
     */
    const profilePicToShow = newProfilePic || currentUser.profilePic;

    /**
     * @variable {boolean} showSaveCancel - Determines if the main Save/Cancel buttons should be visible.
     * It checks if any profile field is in edit mode OR a new photo is staged, AND the profile tab is active.
     */
    const showSaveCancel = (isEditingPhone || newProfilePic) && activeTab === 'profile';

    // --- RENDER ---
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
                        <p className={Styles['profilePhone']}>{currentUser.username}</p>
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

                {/* Main Content */}
                <main className={Styles['mainContent']}>
                    <div className={Styles['contentHeader']}>
                        <h1 className={Styles['contentTitle']}>
                            {activeTab === 'profile' ? 'Personal Information' : 'Password & Security'}
                        </h1>
                        {showSaveCancel && (
                            <div className={Styles['headerActions']}>
                                <button onClick={handleCancel} className={`${Styles['button']} ${Styles['buttonSecondary']}`}>Cancel</button>
                                <button onClick={handleSave} className={`${Styles['button']} ${Styles['buttonPrimary']}`} disabled={!isProfileDirty}>Save</button>
                            </div>
                        )}
                    </div>

                    {activeTab === 'profile' && (
                        <div className={Styles['card']}>
                            <div className={Styles['cardBody']}>
                                {/* Full Name Row - NOT EDITABLE */}
                                <div className={Styles['cardRow']}>
                                    <p className={Styles['rowLabel']}>Full Name</p>
                                    <div className={Styles['rowDetails']}>
                                        <p className={Styles['rowValue']}>{currentUser.fullName}</p>
                                    </div>
                                    {/* Full Name is not editable, so no edit button */}
                                </div>

                                {/* Username Row - NOT EDITABLE */}
                                <div className={Styles['cardRow']}>
                                    <p className={Styles['rowLabel']}>Username</p>
                                    <div className={Styles['rowDetails']}>
                                        <p className={Styles['rowValue']}>{currentUser.username}</p>
                                    </div>
                                    {/* Username is not editable, so no edit button */}
                                </div>

                                {/* Phone Number Row */}
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
                                    <button onClick={() => setIsEditingPhone(!isEditingPhone)} className={Styles['editButton']}><Edit2 size={16} /></button>
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
            
            {/* This hidden file input is triggered by the clickable avatar in the sidebar */}
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