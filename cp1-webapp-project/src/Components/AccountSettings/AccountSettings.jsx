import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Phone, Image as ImageIcon, Edit2, ShieldCheck, AlertTriangle, ArrowLeft } from 'lucide-react';
import Styles from '../../Styles/AccountSettStyle/AccountSettings.module.css';

const AccountSettings = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // --- STATE MANAGEMENT ---
    const [activeTab, setActiveTab] = useState('profile');
    const [currentUser, setCurrentUser] = useState({
        username: 'TestAccount123',
        phone: '+639812234812',
        profilePic: `https://placehold.co/128x128/4f46e5/ffffff?text=T`,
    });

    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [isEditingPhoto, setIsEditingPhoto] = useState(false);

    const [phoneNumber, setPhoneNumber] = useState(currentUser.phone);
    const [newProfilePic, setNewProfilePic] = useState(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [isProfileDirty, setIsProfileDirty] = useState(false);

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
        const hasChanged = 
            phoneNumber !== currentUser.phone || 
            newProfilePic !== null;
        setIsProfileDirty(hasChanged);
    }, [phoneNumber, newProfilePic, currentUser]);

    // --- HANDLERS ---
    const handleBack = () => navigate(-1);

    const handleProfilePicChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setNewProfilePic(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleCancel = () => {
        setIsEditingPhone(false);
        setIsEditingPhoto(false);
        setPhoneNumber(currentUser.phone);
        setNewProfilePic(null);
        setErrorMessage('');
    };

    const handleSave = (e) => {
        e.preventDefault();
        setErrorMessage('');
        
        const phPhoneRegex = /^\+639\d{9}$/;
        if (isEditingPhone && !phPhoneRegex.test(phoneNumber)) {
            setErrorMessage("Please enter a valid Philippine phone number (e.g., +639123456789).");
            return;
        }

        console.log("Saving profile:", { phoneNumber });
        setCurrentUser(prev => ({ ...prev, phone: phoneNumber, profilePic: newProfilePic || prev.profilePic }));
        setIsEditingPhone(false);
        setIsEditingPhoto(false);
        setNewProfilePic(null);
        setSuccessMessage("Profile updated successfully!");
    };

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
    
    const profilePicToShow = newProfilePic || currentUser.profilePic;
    const showSaveCancel = isEditingPhone || isEditingPhoto;

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
                        <img src={profilePicToShow} alt="Profile" className={Styles['profileAvatar']} />
                        <h2 className={Styles['profileName']}>{currentUser.username}</h2>
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
                                <div className={Styles['cardRow']}>
                                    <p className={Styles['rowLabel']}>Your Photo</p>
                                    <div className={Styles['rowDetails']}>
                                        <p className={Styles['rowValue']}>This will be displayed on your profile.</p>
                                        {isEditingPhoto && (
                                            <div style={{display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px'}}>
                                                <img src={profilePicToShow} alt="Profile Preview" className={Styles['profileAvatar']} />
                                                <button type="button" onClick={() => fileInputRef.current.click()} className={`${Styles['button']} ${Styles['buttonSecondary']}`}>
                                                    Upload Photo
                                                </button>
                                                <input type="file" ref={fileInputRef} onChange={handleProfilePicChange} className={Styles['hiddenInput']} accept="image/*" />
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => setIsEditingPhoto(!isEditingPhoto)} className={Styles['editButton']}><Edit2 size={16} /></button>
                                </div>

                                <div className={Styles['cardRow']}>
                                    <p className={Styles['rowLabel']}>Username</p>
                                    <div className={Styles['rowDetails']}>
                                        <p className={Styles['rowValue']}>{currentUser.username}</p>
                                    </div>
                                    {/* Username is not editable, so no edit button */}
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
                                {/* UPDATED: The button is now correctly wrapped in a cardFooter */}
                                <div className={Styles['cardFooter']}>
                                    <button type="submit" className={`${Styles['button']} ${Styles['buttonPrimary']}`} disabled={!currentPassword || !newPassword || !confirmPassword}>Set New Password</button>
                                </div>
                            </div>
                        </form>
                    )}
                </main>
            </div>

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