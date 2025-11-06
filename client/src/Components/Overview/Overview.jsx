import PumpingStatus from './PumpingStatus';
import InteractiveMap from './InteractiveMap';
import ActiveAlerts from './ActiveAlerts';
import RecentAlerts from './RecentAlerts';
import styles from '../../Styles/Overview.module.css';
import { useAlerts } from '../../utils/AlertsContext';

const Overview = () => {
    const {
        activeAlerts,
        recentAlerts,
        devices,
        pumpingStations,
        selectedMapDeviceId,
        refocusTrigger,
        activeFilterDevice,
        handleActiveFilterChange,
        recentFilterDevice,
        handleRecentFilterChange,
        onAcknowledgeAlert,
        onSelectMapDevice,
        onAddDevice,
        onDeleteDevice,
        onSaveStations,
        newlyAddedId,
        onAnimationComplete
    } = useAlerts();

    return (
        <div className={styles['component-wrapper-overview']}>
            <InteractiveMap
                devices={devices}
                selectedDeviceId={selectedMapDeviceId}
                onSelectDevice={onSelectMapDevice}
                onAddDevice={onAddDevice}
                onDeleteDevice={onDeleteDevice}
                refocusTrigger={refocusTrigger}
            />
            <ActiveAlerts
                activeAlerts={activeAlerts}
                devices={devices}
                selectedDevice={activeFilterDevice}
                onDeviceFilterChange={handleActiveFilterChange}
                onAcknowledgeAlert={onAcknowledgeAlert}
                showFilter={true}
                newlyAddedId={newlyAddedId} 
                onAnimationComplete={onAnimationComplete}
            />
            <PumpingStatus
                stations={pumpingStations}
                onSave={onSaveStations}
                devices={devices}
            />
            <RecentAlerts
                recentAlerts={recentAlerts}
                devices={devices}
                selectedDevice={recentFilterDevice}
                onDeviceFilterChange={handleRecentFilterChange}
                showFilter={true}
            />
        </div>
    );
};

export default Overview;