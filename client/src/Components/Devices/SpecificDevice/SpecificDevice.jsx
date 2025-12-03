import React, { useEffect, useState, useContext, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ParamChart from './ParamChart';
import SpecificReadings from './SpecificReadings';
import ControlPanel from './controlPanel';
import Style from '../../../Styles/SpecificDeviceStyle/Specific.module.css';
import ToastStyle from '../../../Styles/ToastStyle/Toast.module.css'
import AlertsContext from '../../../utils/AlertsContext';
import { 
    CheckCircle2, ShieldAlert, Waves, Thermometer, TestTube2, Gauge, X, 
    HelpCircle, ClipboardCheck, BookOpen 
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// --- Toast Component ---
const NotificationToast = ({ message, type, status, onClose }) => {
    const handleAnimationEnd = (e) => {
        e.stopPropagation(); 
        if (status === 'exiting') {
            onClose();
        }
    };

    const isSuccess = type === 'success';
    const title = isSuccess ? 'Success' : 'Error';
    const Icon = isSuccess ? CheckCircle2 : ShieldAlert;

    return (
        <div
            className={`
                ${ToastStyle.toast}
                ${isSuccess ? ToastStyle.toastSuccess : ToastStyle.toastError}
                ${status === 'exiting' ? ToastStyle.toastOutRight : ToastStyle.toastIn}
            `}
            onAnimationEnd={handleAnimationEnd}
        >
            <Icon className={ToastStyle.toastIcon} size={22} />
            <div className={ToastStyle.toastContent}>
                <h4>{title}</h4>
                <p>{message}</p>
                <button onClick={onClose} className={ToastStyle.toastClose}>
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};

// --- INTERNAL COMPONENT: Sensor Validation Modal ---
const SensorValidationModal = ({ onClose }) => {
    return (
        <div className={Style['guidelines-overlay']} onClick={onClose}>
            <div className={Style['guidelines-modal']} onClick={e => e.stopPropagation()}>
                <div className={Style['guidelines-header']}>
                    <div className={Style['guidelines-title-wrapper']}>
                        <ClipboardCheck size={24} color="#3b82f6" />
                        <h3>Accuracy Validation Procedures</h3>
                    </div>
                    <button className={Style['modal-close-button']} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={Style['guidelines-content']}>
                    <h4 className={Style['guidelines-section-title']}>
                        <BookOpen size={18} /> Sensor Testing & Calibration
                    </h4>
                    
                    <div className={Style['definition-list']}>
                        <div className={Style['definition-item']}>
                            <strong><Gauge size={16} /> pH Sensor</strong>
                            <p>
                                The accuracy of the pH sensor was validated using standard buffer powder solutions prepared at three distinct pH levels: acidic (4.01), neutral (6.86), and alkaline (9.18). Prior to testing, the sensor probe was rinsed thoroughly with distilled water to prevent cross-contamination. The probe was first immersed in the neutral solution to establish a baseline, followed by the acidic and alkaline solutions. For each test point, the sensor settled for approximately 60 seconds. Five consecutive data points were recorded to calculate the average measured value, which was then compared against the standard buffer rating.
                            </p>
                        </div>

                        <div className={Style['definition-item']}>
                            <strong><TestTube2 size={16} /> TDS Sensor</strong>
                            <p>
                                To verify the Total Dissolved Solids (TDS) sensor, a comparative analysis was conducted using a factory-calibrated commercial handheld TDS meter as the ground truth reference. Testing involved three distinct samples: distilled water, tap water, and a high-salinity solution. For each sample, the TDS meter was first used to obtain the reference reading. Immediately following this, the IoT TDS sensor was submerged in the same sample. This simultaneous measurement approach ensured that temperature variations or particulate settling did not affect the comparison.
                            </p>
                        </div>

                        <div className={Style['definition-item']}>
                            <strong><Waves size={16} /> Turbidity Sensor</strong>
                            <p>
                                The turbidity sensor was calibrated for high sensitivity within the critical low-turbidity range (0–10 NTU). Due to the hazardous nature of standard Formazine solutions, a relative calibration method was used. First, a baseline reading of 0 NTU was established using clear distilled water. Second, to validate the upper detection limit, a sediment-rich "muddy" water sample was used to exceed the system's saturation point, ensuring the sensor correctly identified high turbidity and capped the reading at the maximum limit of 10 NTU.
                            </p>
                        </div>

                        <div className={Style['definition-item']}>
                            <strong><Thermometer size={16} /> Temperature Sensor</strong>
                            <p>
                                <em>Validation procedure details will be added upon completion of thermal calibration testing.</em>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Sensor Status Panel ---
function SensorStatusPanel({ device }) {
    const [showValidation, setShowValidation] = useState(false);
    const sensorStatus = device?.currentState?.sensorStatus;

    const formatSensorName = (name) => name.charAt(0) + name.slice(1).toLowerCase();

    const iconMap = {
        TURBIDITY: <Waves size={20} className={Style['sensor-icon']} />,
        TEMP: <Thermometer size={20} className={Style['sensor-icon']} />,
        TDS: <TestTube2 size={20} className={Style['sensor-icon']} />,
        PH: <Gauge size={20} className={Style['sensor-icon']} />
    };

    const getStatusClass = (status) => {
        return status === 'Online' ? Style.statusOnline : Style.statusOffline;
    };

    if (!sensorStatus) {
        return (
            <div className={Style['details-card']}>
                <h3 className={Style['card-title']}>Sensor Status</h3>
                <p>Sensor status data is not available.</p>
            </div>
        );
    }

    return (
        <>
            <div className={Style['details-card']}>
                <div className={Style['card-header-wrapper']}>
                    <h3 className={Style['card-title']}>Sensor Status</h3>
                    {/* Help Icon added here before the title */}
                    <HelpCircle 
                        size={16} 
                        className={Style['guidelines-icon']} 
                        onClick={() => setShowValidation(true)} 
                    />
                </div>
                
                <div className={Style['sensor-grid']}>
                    {Object.entries(sensorStatus).map(([sensor, data]) => (
                        <div key={sensor} className={Style['sensor-card']}>
                            <div className={Style['sensor-card-header']}>
                                {iconMap[sensor]}
                                <span className={Style['sensor-name']}>{formatSensorName(sensor)}</span>
                            </div>
                            <div className={Style['status-indicator']}>
                                <span className={`${Style['status-dot']} ${getStatusClass(data.status)}`}></span>
                                <span>{data.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Render Internal Modal */}
            {showValidation && (
                <SensorValidationModal onClose={() => setShowValidation(false)} />
            )}
        </>
    );
}

// --- Details Panel ---
function DetailsPanel({ device }) {
    return (
        <div className={Style['details-card']}>
            <div className={Style['card-header-wrapper']}>
                <h3 className={Style['card-title']}>Device Details</h3>
            </div>
            <div className={Style['device-info']}>
                <p><strong>Label:</strong> {device.label}</p>
                <p><strong>Status:</strong> {device.currentState?.status || 'N/A'}</p>
                <p><strong>Location:</strong> {device.location}</p>
            </div>
        </div>
    );
}

// --- Main Component ---
function SpecificDevice({ onSetHeaderDeviceLabel, userID }) {
    const { devices } = useContext(AlertsContext);
    const { deviceId } = useParams();
    const navigate = useNavigate();
    
    const [currentDevice, setCurrentDevice] = useState(null);
    const [toasts, setToasts] = useState([]);
    
    const toastTimeouts = useRef({});

    const [historicalData, setHistoricalData] = useState([]);
    const [isChartLoading, setIsChartLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('7d'); 

    const removeToast = useCallback((id) => {
        setToasts((curr) => curr.filter(t => t.id !== id));
        if (toastTimeouts.current[id]) {
            clearTimeout(toastTimeouts.current[id]);
            delete toastTimeouts.current[id];
        }
    }, []);

    const startToastExit = useCallback((id) => {
        setToasts(curr => curr.map(t => t.id === id ? { ...t, status: 'exiting' } : t));
    }, []);

    const addToast = useCallback((message, type = 'success') => {
        const id = Date.now();
        const exitTimer = 5000; 
        
        setToasts(curr => [
            ...curr.map(t => ({ ...t, status: 'exiting' })), 
            { id, message, type, status: 'entering' }
        ]);
        
        toastTimeouts.current[id] = setTimeout(() => startToastExit(id), exitTimer);
    }, [startToastExit]);

    const handleValveToggle = async (deviceId, isNowOpen) => {
        const newCommandValue = isNowOpen ? 'OPEN' : 'CLOSED';
        try {
            await axios.put(`${API_BASE_URL}/api/devices/${deviceId}/command`, {
                commandValue: newCommandValue,
                userID
            });
            addToast(`Command to ${newCommandValue.toLowerCase()} valve sent!`, 'success');
        } catch (error) {
            console.error('Failed to send valve command:', error);
            addToast('Error: Could not send command to device.', 'error');
        }
    };

    const handlePumpToggle = async (deviceId, isNowOn) => {
        const newCommandValue = isNowOn ? 'FILL' : 'IDLE';
        try {
            await axios.put(`${API_BASE_URL}/api/devices/${deviceId}/pumpCommand`, {
                commandValue: newCommandValue,
                userID
            });
            addToast(`Pump command ${newCommandValue.toLowerCase()} sent!`, 'success');
        } catch (error) {
            console.error('Failed to send pump command:', error);
            addToast('Error: Could not send pump command to device.', 'error');
        }
    };

    useEffect(() => {
        const foundDevice = devices.find(d => d._id === deviceId);
        setCurrentDevice(foundDevice);

        if (onSetHeaderDeviceLabel) {
            onSetHeaderDeviceLabel(foundDevice ? foundDevice.label : 'Device Details');
        }
    }, [deviceId, devices, onSetHeaderDeviceLabel]);

    useEffect(() => {
        if (deviceId) {
            const fetchHistoricalData = async () => {
                setIsChartLoading(true);
                try {
                    const response = await axios.get(`${API_BASE_URL}/api/historical-readings/${deviceId}?range=${timeRange}`);
                    setHistoricalData(response.data);
                } catch (error) {
                    console.error(`Failed to fetch historical data for ${deviceId} with range ${timeRange}:`, error);
                    setHistoricalData([]);
                } finally {
                    setIsChartLoading(false);
                }
            };
            fetchHistoricalData();
        }
    }, [deviceId, timeRange]);

    const handleGoBack = () => navigate('/devices');

    if (!currentDevice) {
        return <div className={Style['loading-container']}>Loading device data or Device not found...</div>;
    }

    return (
        <>
             <div className={Style['page-container']}>
                <ParamChart
                    historicalData={historicalData}
                    isLoading={isChartLoading}
                    onGoBack={handleGoBack}
                    timeRange={timeRange}
                    setTimeRange={setTimeRange}
                    deviceStatus={currentDevice.currentState?.status}
                />
                <SpecificReadings
                    deviceReadings={currentDevice.latestReading}
                    deviceId={deviceId}
                    deviceStatus={currentDevice.currentState?.status}
                    thresholds={currentDevice.configurations?.thresholds}
                />
                <div className={Style['bottom-left-wrapper']}>
                    <SensorStatusPanel device={currentDevice} />
                    <DetailsPanel device={currentDevice} />
                </div>
                <ControlPanel
                    deviceId={deviceId}
                    deviceStatus={currentDevice.currentState?.status}
                    valveState={currentDevice.currentState?.valve}
                    pumpState={currentDevice.currentState?.pump || 'OFF'} 
                    pumpCycle={currentDevice.currentState?.pumpCycle}
                    onValveToggle={handleValveToggle}
                    onPumpToggle={handlePumpToggle}
                    addToast={addToast}
                />
            </div>

            <div className={ToastStyle.toastContainerWrapper}>
                <div className={ToastStyle.toastContainer}>
                    {toasts.map(t => (
                        <NotificationToast 
                            key={t.id} 
                            {...t} 
                            onClose={() => removeToast(t.id)} 
                        />
                    ))}
                </div>
            </div>
        </>
    );
}

export default SpecificDevice;