import React, { useState } from 'react';
import styles from '../../Styles/Alerts.module.css';
import { useAlerts } from '../../utils/AlertsContext';

import ActiveAlerts from '../../Components/Overview/ActiveAlerts';
import RecentAlerts from '../../Components/Overview/RecentAlerts';
import AlertsHistory from './AlertsHistory';
import TestingDevices from './TestingDevices';
import Tabs from './Tabs';

const Alerts = () => {
    // --- UPDATED --- Destructure alertsHistory from the context
    const {
        activeAlerts,
        recentAlerts,
        alertsHistory, // <-- Get here
        devices,
        activeFilterDevice,
        handleActiveFilterChange,
        recentFilterDevice,
        handleRecentFilterChange,
        onAcknowledgeAlert
    } = useAlerts();

    const [activeTab, setActiveTab] = useState('Active');
    const tabItems = ['Active', 'Recent', 'History'];

    const renderActiveComponent = () => {
        switch (activeTab) {
            case 'Active':
                return ( <ActiveAlerts activeAlerts={activeAlerts} devices={devices} selectedDevice={activeFilterDevice} onDeviceFilterChange={handleActiveFilterChange} onAcknowledgeAlert={onAcknowledgeAlert} showFilter={false} /> );
            case 'Recent':
                return ( <RecentAlerts recentAlerts={recentAlerts} devices={devices} selectedDevice={recentFilterDevice} onDeviceFilterChange={handleRecentFilterChange} showFilter={false} /> );
            case 'History':
                // --- UPDATED --- Pass the history data as a prop
                return <AlertsHistory historyAlerts={alertsHistory} />;
            default:
                return null;
        }
    };

    return (
        <div className={styles['component-wrapper-alerts']}>
            <div className={styles['alerts-column']}>
                <Tabs
                    tabs={tabItems}
                    activeTab={activeTab}
                    onTabClick={setActiveTab}
                />
                {renderActiveComponent()}
            </div>
            <div className={styles['devices-column']}>
                <TestingDevices devices={devices} />
            </div>
        </div>
    );
};

export default Alerts;