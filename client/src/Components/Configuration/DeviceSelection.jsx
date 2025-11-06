import NoDevicesFound from '../NoDevFound/noDevicesFound'; //import nodevfound
import { ChevronRight, Cpu } from 'lucide-react';
import styles from '../../Styles/DeviceSelection.module.css';

const DeviceSelection = ({ devices, onSelectDevice }) => {
    return (
        <div className={styles['selection-container']}>
            {devices.length === 0 ? (
                <div className={styles['no-devices']}>
                    <NoDevicesFound/>
                </div>
            ) : ( 
            <>
                <h2>Select a Device to Configure</h2>
                <p>Choose a device from the list below to view or edit its specific settings and alert thresholds.</p>
                <div className={styles['device-list']}>
                    {devices.map(device => {
                    // Safely access the status from the new, nested schema
                    const status = device.currentState?.status || 'Offline';
                        return (
                            <button 
                                key={device._id} // Use _id for the key
                                className={styles['device-card']} 
                                onClick={() => onSelectDevice(device)}
                            >
                                <div className={styles['card-header']}>
                                    <div className={styles['card-title-group']}>
                                        <div className={styles['card-icon']}><Cpu size={28} /></div>
                                        <h3>{device.label}</h3>
                                    </div>
                                    {/* Use the new status variable */}
                                    <div className={`${styles['status-indicator']} ${styles[status.toLowerCase()]}`}>
                                        <div className={styles['status-dot']}></div>
                                        <span>{status}</span>
                                    </div>
                                </div>
                                <div className={styles['card-content']}>
                                    <span>{device.location}</span>
                                </div>
                                <div className={styles['card-footer']}>
                                    <ChevronRight size={20} />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </>
            )}
        </div>
    );
};

export default DeviceSelection;