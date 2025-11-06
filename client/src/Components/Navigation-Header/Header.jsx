import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Bell, Settings, LogOut, ChevronRight, Logs } from 'lucide-react';
import styles from '../../Styles/Nav-Head-Style/Header.module.css'; 
import Logo from '../../assets/Logo.png'; 
import Notifications from './Notifications'; // The separate notifications component
import AlertsContext from '../../utils/AlertsContext';
import routeTitleMap from '../../utils/routeTitleMap';


function Header({
    onLogout,
    deviceLabelForHeader,
    username,
    notifications,
    unreadCount,
    onMarkNotificationAsRead,
    onMarkAllNotificationsAsRead
}) {
    const navigate = useNavigate();
    const location = useLocation();
    const { loggedInUser } = useContext(AlertsContext);
    const [subTitle, setSubTitle] = useState('WaterGuard');

    useEffect(() => {
        let currentSubTitle;
        if (deviceLabelForHeader) {
            if (location.pathname.startsWith('/configurations')) {
                currentSubTitle = `Configuration > ${deviceLabelForHeader}`;
            } else {
                currentSubTitle = `Devices > ${deviceLabelForHeader}`;
            }
        } else {
            currentSubTitle = routeTitleMap[location.pathname] || 'WaterGuard';
        }
        setSubTitle(currentSubTitle);
    }, [location.pathname, deviceLabelForHeader]);


    // State for managing the user and notification dropdowns separately ---
    const [open, setOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const userMenuRef = useRef(null);
    const notifMenuRef = useRef(null);

    const toggleMenu = () => {
        setOpen(!open);
        setNotifOpen(false); // Close notifications when opening user menu
    };

    const toggleNotif = () => {
        setNotifOpen(!notifOpen);
        setOpen(false); // Close user menu when opening notifications
    };

    // --- Logic to close dropdowns when clicking outside ---
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setOpen(false);
            }
            if (notifMenuRef.current && !notifMenuRef.current.contains(event.target)) {
                setNotifOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    
    const handleAccountSettings = () => {
        navigate('/account-settings');
        setOpen(false);
    };
    const handleLogs = () => {
        navigate('/logs');
        setOpen(false);
    }

    const profilePicToShow = loggedInUser?.profileImage || `https://placehold.co/128x128/4f46e5/ffffff?text=${loggedInUser?.username ? loggedInUser.username.charAt(0).toUpperCase() : '?'}`;

    return (
        <header className={styles.appHeader}>
            <div className={styles.headerLeft}>
                <div className={styles.headerLogo}><img src={Logo} alt="Logo" /></div>
                <div className={styles.titleWrapper}>
                    <div className={styles.headerTitle}><p>WaterGuard</p></div>
                    <div className={styles.headerSubTitle}><p>{subTitle}</p></div>
                </div>
            </div>
            <div className={styles.headerRight}>
                {/* --- Notification dropdown now uses props from App.jsx --- */}
                <div className={styles.notificationWrapper} ref={notifMenuRef}>
                    <div className={styles.notificationIconWrapper} onClick={toggleNotif}>
                        <Bell className={styles.notificationIcon} />
                        {unreadCount > 0 && (
                            <span className={styles.notificationBadge}>{unreadCount}</span>
                        )}
                    </div>
                    <Notifications
                        show={notifOpen}
                        notifications={notifications}
                        onMarkAsRead={onMarkNotificationAsRead}
                        onMarkAllAsRead={onMarkAllNotificationsAsRead}
                    />
                </div>
                {/* --- User dropdown menu with full functionality --- */}
                <div className={styles.headerDropdown} ref={userMenuRef}>
                    <button className={styles.userBtn} onClick={toggleMenu}>
                        <img className={styles.profileImg} src={profilePicToShow} alt="Profile" />
                        <p>{username} {open ? '⏶' : '⏷'}</p>
                    </button>
                    <div className={`${styles.dropdownMenu} ${open ? styles.show : ''}`}>
                        <div className={`${styles.dropdownItemU} ${styles.manageProfile}`} onClick={handleAccountSettings}>
                            <Settings size={18} color='#0fd1eb' /> <p>Account</p> <ChevronRight size={15} />
                        </div>
                        <div className={`${styles.dropdownItemU} ${styles.logs}`} onClick={handleLogs} >
                            <Logs size={17} color='#307e3c' /> <p>View Logs</p> <ChevronRight size={15} />
                        </div>
                        <div className={`${styles.dropdownItemU} ${styles.logout}`} onClick={onLogout}>
                            <LogOut size={16} color='#ec515e' /> <p>Log Out</p> <ChevronRight size={15} />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;