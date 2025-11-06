import React, { useState, useEffect } from 'react';
import { useAlerts } from '../../utils/AlertsContext';
import styles from '../../Styles/Configurations.module.css';
import DeviceSelection from './DeviceSelection';
import ConfigurationSettings from './ConfigurationSettings';
import { useParams, useNavigate } from 'react-router-dom';

const Configurations = ({ onSetHeaderDeviceLabel }) => {
    const { devices, onSaveConfiguration } = useAlerts();
    const [selectedDevice, setSelectedDevice] = useState(null);

    // Get the navigation function and URL parameters
    const navigate = useNavigate();
    const { '*': deviceId } = useParams(); // Use '*' to capture the dynamic part

    // This effect runs when the URL changes. It syncs the URL to the component's state.
    useEffect(() => {
        if (deviceId) {
            const deviceFromUrl = devices.find(d => d._id === deviceId);
            setSelectedDevice(deviceFromUrl);
        } else {
            setSelectedDevice(null);
        }
    }, [deviceId, devices]);

    // This effect runs when the selectedDevice state changes. It updates the main app header.
    useEffect(() => {
        if (onSetHeaderDeviceLabel) {
            onSetHeaderDeviceLabel(selectedDevice ? selectedDevice.label : null);
        }
        // Cleanup function to clear the header when navigating away
        return () => {
            if (onSetHeaderDeviceLabel) {
                onSetHeaderDeviceLabel(null);
            }
        };
    }, [selectedDevice, onSetHeaderDeviceLabel]);

    // This handler now updates the URL, which will trigger the effect above
    const handleSelectDevice = (device) => {
        navigate(`/configurations/${device._id}`);
    };

    // This handler now updates the URL to go back to the list view
    const handleGoBack = () => {
        navigate('/configurations');
    };

    // The JSX structure remains exactly the same as you wanted.
    return (
        <div className={styles['component-wrapper-configurations']}>
            <div className={styles['header']}>
                <h1>Configuration Settings</h1>
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