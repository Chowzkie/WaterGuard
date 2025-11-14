import React, { useState } from 'react';
import styles from '../../Styles/Alerts.module.css';
import { useAlerts } from '../../utils/AlertsContext';

import ActiveAlerts from '../../Components/Overview/ActiveAlerts';
import RecentAlerts from '../../Components/Overview/RecentAlerts';
import AlertsHistory from './AlertsHistory';
import TestingDevices from './TestingDevices';
import Tabs from './Tabs';

const Alerts = () => {
    // --- Get all data from the central context ---
    const {
        activeAlerts,
        recentAlerts,
        alertsHistory,
        devices,
        onAcknowledgeAlert,
        // CHANGE: Get delete and restore functions from context
        onDeleteHistoryAlerts,
        onRestoreHistoryAlerts,
        newlyAddedId,
        onAnimationComplete
    } = useAlerts();

    // Add new state to track which device is selected for viewing.
    // `null` will represent the "All Devices" view.
    const [viewedDeviceId, setViewedDeviceId] = useState(null);

    const [activeTab, setActiveTab] = useState('History');
    const tabItems = ['Active', 'Recent', 'History'];

    // This new handler will be called by the TestingDevices component.
    // It also allows deselecting a device by clicking it again.
    const handleDeviceSelect = (deviceId) => {
        setViewedDeviceId(prevId => (prevId === deviceId ? null : deviceId));
    };

    // Filter the alert lists based on the selected device before rendering.
    const filteredActiveAlerts = viewedDeviceId 
    ? activeAlerts.filter(a => a.originator.toLowerCase() === viewedDeviceId.toLowerCase()) 
    : activeAlerts;

    const filteredRecentAlerts = viewedDeviceId 
    ? recentAlerts.filter(r => r.originator.toLowerCase() === viewedDeviceId.toLowerCase()) 
    : recentAlerts;

    const filteredHistoryAlerts = viewedDeviceId 
    ? alertsHistory.filter(h => h.originator.toLowerCase() === viewedDeviceId.toLowerCase()) 
    : alertsHistory;


    const renderActiveComponent = () => {
        switch (activeTab) {
            case 'Active':
                return (
                    <ActiveAlerts
                        // Pass the pre-filtered list
                        activeAlerts={filteredActiveAlerts}
                        devices={devices}
                        onAcknowledgeAlert={onAcknowledgeAlert}
                        showFilter={false} // Correctly hides the internal filter
                        newlyAddedId={newlyAddedId}
                        onAnimationComplete={onAnimationComplete}
                    />
                );
            case 'Recent':
                return (
                    <RecentAlerts
                        // Pass the pre-filtered list
                        recentAlerts={filteredRecentAlerts}
                        devices={devices}
                        showFilter={false} // Correctly hides the internal filter
                    />
                );
            case 'History':
                return (
                    <AlertsHistory
                        // Pass the pre-filtered list
                        historyAlerts={filteredHistoryAlerts}
                        // CHANGE: Pass delete and restore functions down as props
                        onDeleteHistoryAlerts={onDeleteHistoryAlerts}
                        onRestoreHistoryAlerts={onRestoreHistoryAlerts}
                    />
                );
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
                 <div className={styles['alerts-content-wrapper']}>
                    {renderActiveComponent()}
                </div>
            </div>
            <div className={styles['devices-column']}>
                {/*Pass new props to make it a navigation menu */}
                <TestingDevices
                    devices={devices}
                    selectedDeviceId={viewedDeviceId}
                    onDeviceSelect={handleDeviceSelect}
                />
            </div>
        </div>
    );
};

export default Alerts;