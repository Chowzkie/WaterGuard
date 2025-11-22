import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, ZoomControl, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { 
    Menu, 
    X, 
    Plus, 
    Trash2, 
    AlertCircle, 
    Info, 
    MoreVertical,
    CheckCircle2, 
    ShieldAlert 
} from 'lucide-react';

// Import required stylesheets
import 'leaflet/dist/leaflet.css';
import '../../Styles/InteractiveMap.css';

// --- Icon Fix ---
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadowUrl from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({ iconUrl, shadowUrl: iconShadowUrl, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// --- NotificationToast Component ---
const NotificationToast = ({ message, type, onClose }) => {
    const [isExiting, setIsExiting] = useState(false);
    const timerRef = useRef(null);

    const handleClose = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setIsExiting(true);
        setTimeout(onClose, 300);
    };

    useEffect(() => {
        timerRef.current = setTimeout(handleClose, 4000);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const isSuccess = type === 'success';
    const title = isSuccess ? 'Success' : 'Error';
    const Icon = isSuccess ? CheckCircle2 : ShieldAlert;

    return (
        <div className={`toast ${isSuccess ? 'toastSuccess' : 'toastError'} ${isExiting ? 'toastOutRight' : 'toastIn'}`}>
            <Icon className="toastIcon" size={22} />
            <div className="toastContent">
                <h4>{title}</h4>
                <p>{message}</p>
            </div>
            <button onClick={handleClose} className="toastClose">
                <X size={18} />
            </button>
        </div>
    );
};

// --- Helper Component: MapFocusController ---
const MapFocusController = ({ devices, selectedDeviceId, refocusTrigger }) => {
  const map = useMap();
  useEffect(() => {
    if (!devices) return;
    if (selectedDeviceId && selectedDeviceId !== 'all') {
      const device = devices.find(d => d._id === selectedDeviceId);
      if (device) map.flyTo(device.position, 16, { animate: true, duration: 1.0 });
    } else if (devices.length > 0) {
      const bounds = L.latLngBounds(devices.map(d => d.position));
      if (bounds.isValid()) {
        const timer = setTimeout(() => {
          map.invalidateSize();
          map.fitBounds(bounds.pad(0.1), { animate: true, duration: 1.0 });
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [devices, selectedDeviceId, refocusTrigger, map]);
  return null;
};

// --- Helper Component: Reusable Confirmation Modal ---
const ConfirmationModal = ({ title, message, confirmText, onConfirm, onCancel, isError }) => (
    <div className="modal-backdrop">
        <div className={`confirmation-modal-content ${isError ? 'error-modal' : ''}`}>
            <div className="confirmation-header">
                <AlertCircle size={32} className={isError ? 'icon-warning' : 'icon-danger'} />
                <h3>{title}</h3>
            </div>
            <p className="confirmation-message">{message}</p>
            <div className="confirmation-actions">
                {onCancel && <button onClick={onCancel} className="button-secondary">Cancel</button>}
                <button onClick={onConfirm} className={`button-primary ${isError ? 'warning-button' : 'danger-button'}`}>{confirmText}</button>
            </div>
        </div>
    </div>
);

// --- Helper Component: Device Info Modal ---
const DeviceInfoModal = ({ device, onClose }) => (
    <div className="modal-backdrop" onClick={onClose}>
        <div className="add-device-form-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
                <h3>{device.label} Details</h3>
                <button onClick={onClose} className="modal-close-button"><X size={20} /></button>
            </div>
            <div className="info-modal-body">
                <div className="info-row"><strong>Device ID:</strong><span>{device._id}</span></div>
                <div className="info-row"><strong>Label:</strong><span>{device.label}</span></div>
                <div className="info-row"><strong>Position:</strong><span>{`${device.position[0]}, ${device.position[1]}`}</span></div>
                <div className="info-row"><strong>Address:</strong><span>{device.location}</span></div>
                <div className="info-row"><strong>Status:</strong><span className={`status-text ${device.currentState.status.toLowerCase()}`}>{device.currentState.status}</span></div>
            </div>
        </div>
    </div>
);

// --- Helper Component: The "Add New Device" Modal Form ---
const AddDeviceModal = ({ onAddDevice, onCancel, existingDevices, showToast }) => {
    const [number, setNumber] = useState('');
    const [address, setAddress] = useState('');
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');
    const [validationError, setValidationError] = useState(null);

    useEffect(() => {
        if (existingDevices && existingDevices.length > 0) {
            const existingNumbers = existingDevices.map(device => {
                const match = device.label.match(/PS0(\d+)-DEV/);
                return match ? parseInt(match[1], 10) : 0;
            });
            const maxNumber = Math.max(0, ...existingNumbers);
            setNumber(maxNumber + 1);
        } else {
            setNumber(1);
        }
    }, [existingDevices]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const num = parseInt(number, 10);
        const newLabel = `PS0${num}-DEV`;
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);

        if (!number || !address || !lat || !lng) {
            setValidationError("Please fill out all fields."); return;
        }
        if (isNaN(num) || num <= 0) {
            setValidationError("Please enter a valid positive number for the device label."); return;
        }
        if (existingDevices.some(d => d.label === newLabel)) {
            setValidationError(`A device with the label "${newLabel}" already exists.`); return;
        }
        if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
            setValidationError("Latitude must be -90 to 90, and Longitude -180 to 180."); return;
        }

        try {
            await onAddDevice({
                _id: `PS${String(num).padStart(2, '0')}-DEV`.toLowerCase(),
                label: `PS${String(num).padStart(2, '0')}-DEV`,
                position: [parseFloat(lat), parseFloat(lng)],
                location: address
            });
            // --- Trigger Success Toast ---
            showToast('New device added successfully.', 'success');
            onCancel();
        } catch (error) {
            if (error.response && error.response.status === 409) {
                setValidationError(error.response.data.message);
            } else {
                // --- Trigger Error Toast for generic server errors ---
                showToast("Failed to add device. Please try again.", 'error');
                setValidationError("An unexpected error occurred.");
            }
        }
    };

    return (
        <div className="modal-backdrop" onClick={onCancel}>
            {validationError && <ConfirmationModal title="Invalid Input" message={validationError} confirmText="OK" onConfirm={() => setValidationError(null)} isError={true} />}
            <div className="add-device-form-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header"><h3>Add New Device</h3><button onClick={onCancel} className="modal-close-button"><X size={20} /></button></div>
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label htmlFor="device-number">Device Number</label>
                        <div className="input-with-prefix">
                            <span>PS0</span>
                            <input id="device-number" type="text" value={number} onChange={e => setNumber(e.target.value)} placeholder="e.g., 4" />
                            <span>-DEV</span>
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="address">Address</label>
                        <input id="address" type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g., Brgy. San Nicolas, Gerona" />
                    </div>
                    <div className="form-group">
                        <label htmlFor="lat">Latitude</label><input id="lat" type="text" value={lat} onChange={e => setLat(e.target.value)} placeholder="e.g., 15.63" />
                    </div>
                    <div className="form-group">
                        <label htmlFor="lng">Longitude</label><input id="lng" type="text" value={lng} onChange={e => setLng(e.target.value)} placeholder="e.g., 120.61" />
                    </div>
                        <div className="form-actions"><button type="button" onClick={onCancel} className="button-secondary">Cancel</button>
                        <button type="submit" className="button-primary">Add Device</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Main Component: InteractiveMap ---
const InteractiveMap = ({ devices, selectedDeviceId, onSelectDevice, onAddDevice, onDeleteDevice, refocusTrigger }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [deviceToDelete, setDeviceToDelete] = useState(null);
    const [deviceToShowInfo, setDeviceToShowInfo] = useState(null);
    const [activeKebabMenu, setActiveKebabMenu] = useState(null);
    
    // --- Toast State ---
    const [toast, setToast] = useState(null);

    const kebabMenuRef = useRef(null);
    const navigate = useNavigate();
    const handleRedirect = (deviceId) => navigate(`/devices/${deviceId}`);

    // --- Logic to close kebab menu when clicking outside ---
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (kebabMenuRef.current && !kebabMenuRef.current.contains(event.target)) {
                setActiveKebabMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [kebabMenuRef]);

    const handleSelectAndCloseSidebar = (deviceId) => {
        onSelectDevice(deviceId);
        setIsSidebarOpen(false);
    };
    
    // --- Confirm Delete to be Async and Trigger Toast ---
    const confirmDelete = async () => {
        if (!deviceToDelete) return;
        try {
            await onDeleteDevice(deviceToDelete._id);
            setToast({
                id: Date.now(),
                message: `${deviceToDelete.label} was successfully deleted.`,
                type: 'success'
            });
        } catch (error) {
            console.error(error);
            setToast({
                id: Date.now(),
                message: `Failed to delete ${deviceToDelete.label}.`,
                type: 'error'
            });
        } finally {
            setDeviceToDelete(null);
        }
    };

    // Helper to show toast from child components (like AddDeviceModal)
    const showToast = (message, type) => {
        setToast({ id: Date.now(), message, type });
    };
    
    const createCustomIcon = (label, status) => L.divIcon({
        html: `<div class="marker-label">${label}</div><div class="marker-pin ${status.toLowerCase()}"></div>`,
        className: 'custom-marker',
        iconAnchor: [15, 42],
    });

    return (
        <div className="component-wrapper-mapapi">
            {isAddModalOpen && (
                <AddDeviceModal 
                    onAddDevice={onAddDevice} 
                    onCancel={() => setIsAddModalOpen(false)} 
                    existingDevices={devices}
                    showToast={showToast} // Pass down toast trigger
                />
            )}
            {deviceToDelete && <ConfirmationModal title="Delete Device" message={`Delete ${deviceToDelete.label}?`} confirmText="Delete" onConfirm={confirmDelete} onCancel={() => setDeviceToDelete(null)} />}
            {deviceToShowInfo && <DeviceInfoModal device={deviceToShowInfo} onClose={() => setDeviceToShowInfo(null)} />}
            
            <div className="map-api-card">
                <button className="map-menu-button" onClick={() => setIsSidebarOpen(true)}><Menu size={16} /></button>
                <div className={`map-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                    <div className="sidebar-header">
                        <h3>Testing Devices</h3>
                        <button className="sidebar-close-button" onClick={() => setIsSidebarOpen(false)}><X size={20} /></button>
                    </div>
                    <div className="sidebar-content">
                        <div className="sidebar-device-list">
                            {devices && devices.map(device => (
                                <div key={device._id} className="sidebar-device-item">
                                    <button className="device-name-button" onClick={() => handleSelectAndCloseSidebar(device._id)}>{device.label}</button>
                                    <div className="kebab-menu-container" ref={activeKebabMenu === device._id ? kebabMenuRef : null}>
                                        <button className="kebab-menu-button" onClick={() => setActiveKebabMenu(activeKebabMenu === device._id ? null : device._id)}>
                                            <MoreVertical size={18} />
                                        </button>
                                        {activeKebabMenu === device._id && (
                                            <div className="kebab-menu-options">
                                                <button onClick={() => { setDeviceToShowInfo(device); setActiveKebabMenu(null); }}><Info size={14}/> Info</button>
                                                <button className="delete-option" onClick={() => { setDeviceToDelete(device); setActiveKebabMenu(null); }}><Trash2 size={14}/> Delete</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="sidebar-footer">
                            <button className="add-device-button" onClick={() => setIsAddModalOpen(true)}><Plus size={16} /> Add New Device </button>
                        </div>
                    </div>
                </div>
                <MapContainer center={[15.73, 120.57]} zoom={13} scrollWheelZoom={true} zoomControl={false}>
                    <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <ZoomControl position="topright" />
                    {devices && devices.map(device => <Marker key={device._id} position={device.position} icon={createCustomIcon(device.label, device.currentState.status)} eventHandlers={{ click: () => handleRedirect(device._id) }} />)}
                    <MapFocusController devices={devices} selectedDeviceId={selectedDeviceId} refocusTrigger={refocusTrigger} />
                </MapContainer>
            </div>

            {/* --- Render Toast Container --- */}
            {toast && (
                <div className="toastContainerWrapper">
                    <NotificationToast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                </div>
            )}
        </div>
    );
};

export default InteractiveMap;