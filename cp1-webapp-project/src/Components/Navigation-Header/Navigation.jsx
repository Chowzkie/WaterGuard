import { NavLink } from 'react-router-dom';
import styles from "../../Styles/Navigation.module.css";

function Navigation() {
    return (
        <div className={styles['component-wrapper-navigation']}>

            <NavLink 
                to="/overview" 
                className={({ isActive }) =>
                    `${styles['nav-link']} ${isActive ? styles.active : ''}`
                }
            >
                <div className={styles.navigation}>Overview</div>
            </NavLink>

            <NavLink 
                to="/dashboard" 
                className={({ isActive }) =>
                    `${styles['nav-link']} ${isActive ? styles.active : ''}`
                }
            >
                <div className={styles.navigation}>Dashboard</div>
            </NavLink>

            <NavLink 
                to="/alerts" 
                className={({ isActive }) =>
                    `${styles['nav-link']} ${isActive ? styles.active : ''}`
                }
            >
                <div className={styles.navigation}>Alerts</div>
            </NavLink>

            <NavLink 
                to="/devices" 
                className={({ isActive }) =>
                    `${styles['nav-link']} ${isActive ? styles.active : ''}`
                }
            >
                <div className={styles.navigation}>Devices</div>
            </NavLink>

            <NavLink 
                to="/settings" 
                className={({ isActive }) =>
                    `${styles['nav-link']} ${isActive ? styles.active : ''}`
                }
            >
                <div className={styles.navigation}>Settings</div>
            </NavLink>

        </div>
    );
}

export default Navigation;
