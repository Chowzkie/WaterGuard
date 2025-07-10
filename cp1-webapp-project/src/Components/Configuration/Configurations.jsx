import React, { useState } from 'react';
import { useAlerts } from '../../utils/AlertsContext';
import styles from '../../Styles/Configurations.module.css';
import DeviceSelection from './DeviceSelection';
import ConfigurationSettings from './ConfigurationSettings';

const Configurations = () => {
    const { devices, onSaveConfiguration } = useAlerts();
    const [selectedDevice, setSelectedDevice] = useState(null);

    const handleSelectDevice = (device) => {
        setSelectedDevice(device);
    };

    const handleGoBack = () => {
        setSelectedDevice(null);
    };

    return (
        <div className={styles['component-wrapper-configurations']}>
            <div className={styles['header']}>
                <h1>System Settings</h1>
                {selectedDevice && (
                    <span className={styles['breadcrumb']}>
                        &gt; {selectedDevice.label}
                    </span>
                )}
            </div>
            
            {selectedDevice ? (
                <ConfigurationSettings 
                    device={selectedDevice} 
                    onSave={onSaveConfiguration}
                    onBack={handleGoBack}
                />
            ) : (
                <DeviceSelection 
                    devices={devices} 
                    onSelectDevice={handleSelectDevice} 
                />
            )}
        </div>
    );
};

export default Configurations;