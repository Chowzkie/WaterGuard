import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, AlertCircle, Info, CheckCircle, Settings, LogOut, ChevronRight } from 'lucide-react';
import styles from '../../Styles/Header.module.css';
import ProfilePic from '../../assets/ProfilePic.png';
import Logo from '../../assets/Logo.png';

function Header({ onLogout }) { // <-- Accept the onLogout function

  const navigate = useNavigate(); // <-- Add navigation for logout
  const location = useLocation();

  // Route-to-title mapping
  const routeTitleMap = {
    '/overview': 'Overview',
    '/dashboard': 'Dashboard',
    '/alerts': 'Alerts',
    '/devices': 'Devices',
    '/configurations': 'Configuration'
  };

  // Get current sub-title based on pathname
  const subTitle = routeTitleMap[location.pathname] || 'WaterGuard';

  // Dynamically change the browser tab title
  React.useEffect(() => {
    document.title = `WaterGuard | ${subTitle}`;
  }, [subTitle]);

  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const toggleMenu = () => {
    setOpen(!open);
    setNotifOpen(false);
  };

  const toggleNotif = () => {
    setNotifOpen(!notifOpen);
    setOpen(false);
  };

  const [notifications, setNotifications] = useState([
    { message: "Sensor 1 reported high pH level", type: "critical", time: "1 min ago", read: false },
    { message: "Sensor 2 is offline", type: "critical", time: "5 min ago", read: false },
    { message: "Weekly water quality report generated", type: "info", time: "30 min ago", read: false },
    { message: "New firmware available", type: "info", time: "1 hour ago", read: false },
    { message: "Sensor 3 is now online", type: "success", time: "2 hours ago", read: false },
    { message: "System backup completed", type: "success", time: "5 hours ago", read: false }
  ]);

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, read: true }))
    );
  };

  const markAsRead = (index) => {
    const updated = [...notifications];
    updated[index].read = true;
    setNotifications(updated);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'critical': return <AlertCircle className={`${styles.notifIcon} ${styles.critical}`} />;
      case 'success': return <CheckCircle className={`${styles.notifIcon} ${styles.success}`} />;
      default: return <Info className={`${styles.notifIcon} ${styles.info}`} />;
    }
  };

  const handleLogout = () => {
    onLogout();           // Clear the auth state in App.jsx
    navigate('/login');   // Redirect to login
  };

  return (
    <header className={styles.appHeader}>
      <div className={styles.headerLeft}>
        <div className={styles.headerLogo}>
          <img src={Logo} alt="Logo" />
        </div>
        <div className={styles.titleWrapper}>
          <div className={styles.headerTitle}><p>WaterGuard</p></div>
          <div className={styles.headerSubTitle}><p>{subTitle}</p></div>
        </div>
      </div>

      <div className={styles.headerRight}>
        <div className={styles.notificationWrapper}>
          <div className={styles.notificationIconWrapper} onClick={toggleNotif}>
            <Bell className={styles.notificationIcon} />
            {notifications.some(n => !n.read) && (
              <span className={styles.notificationBadge}>
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </div>

          <div className={`${styles.notifDropdown} ${notifOpen ? styles.show : ''}`}>
            <div className={styles.dropdownHeader}>
              <span className={styles.dropdownTitle}>Notifications</span>
              <span className={styles.notificationHeaderBadge}>
                {notifications.filter(n => !n.read).length}
              </span>
              <button className={styles.markAllBtn} onClick={markAllAsRead}>Mark all as read</button>
            </div>
            <div className={styles.dropdownWrapper}>
              {notifications.length === 0 ? (
                <span className={styles.noNotifs}>No notifications</span>
              ) : (
                notifications.map((notif, index) => (
                  <div
                    className={`${styles.dropdownItemN} ${styles[notif.type]} ${notif.read ? styles.read : ''}`}
                    key={index}
                  >
                    <div className={styles.itemLeft}>{getIcon(notif.type)}</div>
                    <div className={styles.itemRight}>
                      <span>{notif.message}</span>
                      <div className={styles.meta}>
                        <small>{notif.time}</small>
                        {!notif.read && (
                          <button onClick={() => markAsRead(index)}><i>Mark as read</i></button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className={styles.headerDropdown}>
          <button className={styles.userBtn} onClick={toggleMenu}>
            <img className={styles.profileImg} src={ProfilePic} alt="Profile" />
            <p>Username {open ? '⏶' : '⏷'}</p>
          </button>
          <div className={`${styles.dropdownMenu} ${open ? styles.show : ''}`}>
            <div className={`${styles.dropdownItemU} ${styles.manageProfile}`}>
              <Settings size={18} /> <p>Settings</p> <ChevronRight size={15} />
            </div>
            {/* Log Out Option */}
            <div className={`${styles.dropdownItemU} ${styles.logout}`} onClick={handleLogout}>
              <LogOut size={16} /> <p>Log Out</p> <ChevronRight size={15} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
