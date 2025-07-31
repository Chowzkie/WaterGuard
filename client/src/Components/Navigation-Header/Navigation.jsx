import { NavLink } from 'react-router-dom';
import styles from "../../Styles/Navigation.module.css";
import { useState } from 'react';
import {Menu, X} from 'lucide-react'

function Navigation() {
    const [isOpen, setIsOpen] = useState(false);
    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };
    const closeMenu = () => {
        setIsOpen(false);
    };


    return (
        <nav className={styles['main-nav-wrapper']}>
            <button className={styles['hamburger-menu']} onClick={toggleMenu}>
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className={`${styles['component-wrapper-navigation']} ${isOpen ? styles['open'] : ''}`}>
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
                    <div className={styles.navigation}>Readings</div>
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
                    to="/configurations" 
                    className={({ isActive }) =>
                        `${styles['nav-link']} ${isActive ? styles.active : ''}`
                    }
                >
                    <div className={styles.navigation}>Configuration</div>
                </NavLink>
            </div>
        </nav>
    );
}

export default Navigation;
