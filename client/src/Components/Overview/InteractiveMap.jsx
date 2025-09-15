import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, ZoomControl, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { Menu, X, Plus, Trash2, AlertCircle, Info, MoreVertical } from 'lucide-react';

// Import required stylesheets
import 'leaflet/dist/leaflet.css';
import '../../Styles/InteractiveMap.css';

// --- Icon Fix ---
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadowUrl from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({ iconUrl, shadowUrl: iconShadowUrl, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// --- Helper Component: MapFocusController (No changes needed) ---
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

// --- Helper Component: Reusable Confirmation Modal (No changes needed) ---
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

// --- NEW Helper Component: Device Info Modal ---
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


// --- Helper Component: The "Add New Device" Modal Form (with number suggestion) ---
const AddDeviceModal = ({ onAddDevice, onCancel, existingDevices }) => {
    const [number, setNumber] = useState('');
    const [address, setAddress] = useState('');
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');
    const [validationError, setValidationError] = useState(null);

    // --- THIS IS THE NEW LOGIC ---
    // This effect runs once when the modal opens to suggest the next device number.
    useEffect(() => {
        if (existingDevices && existingDevices.length > 0) {
            // Extract all numbers from existing device labels (e.g., "PS01-DEV" -> 1)
            const existingNumbers = existingDevices.map(device => {
                const match = device.label.match(/PS0(\d+)-DEV/);
                return match ? parseInt(match[1], 10) : 0;
            });

            // Find the highest number currently in use
            const maxNumber = Math.max(0, ...existingNumbers);
            
            // Suggest the next number in the sequence
            setNumber(maxNumber + 1);
        } else {
            // If there are no devices, suggest "1" as the starting number
            setNumber(1);
        }
    }, [existingDevices]); // This runs only when the component is first rendered

    const handleSubmit = async (e) => {
        e.preventDefault();
        const num = parseInt(number, 10);
        const newLabel = `PS0${num}-DEV`;
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);

        // Validation checks remain the same...
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
            // This now calls the API-connected function in App.jsx
            await onAddDevice({
                // The object we send to the backend
                _id: `PS${String(num).padStart(2, '0')}-DEV`.toLowerCase(),
                label: `PS${String(num).padStart(2, '0')}-DEV`,
                position: [parseFloat(lat), parseFloat(lng)],
                location: address
            });
            onCancel(); // Close modal on success
        } catch (error) {
            // If onAddDevice throws an error, we catch it here
            if (error.response && error.response.status === 409) {
                // 409 is the "Conflict" status we set for duplicate devices
                setValidationError(error.response.data.message);
            } else {
                // For any other errors
                setValidationError("An unexpected error occurred. Please try again.");
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
                            {/* The value is now pre-filled with the suggested number */}
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
    
    const confirmDelete = () => {
        onDeleteDevice(deviceToDelete._id);
        setDeviceToDelete(null);
    };
    
    const createCustomIcon = (label, status) => L.divIcon({
        html: `<div class="marker-label">${label}</div><div class="marker-pin ${status.toLowerCase()}"></div>`,
        className: 'custom-marker',
        iconAnchor: [15, 42],
    });

    return (
        <div className="component-wrapper-mapapi">
            {isAddModalOpen && <AddDeviceModal onAddDevice={onAddDevice} onCancel={() => setIsAddModalOpen(false)} existingDevices={devices} />}
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
                <MapContainer center={[15.61, 120.6]} zoom={13} scrollWheelZoom={true} zoomControl={false}>
                    <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <ZoomControl position="topright" />
                    {devices && devices.map(device => <Marker key={device._id} position={device.position} icon={createCustomIcon(device.label, device.currentState.status)} eventHandlers={{ click: () => handleRedirect(device._id) }} />)}
                    <MapFocusController devices={devices} selectedDeviceId={selectedDeviceId} refocusTrigger={refocusTrigger} />
                </MapContainer>
            </div>
        </div>
    );
};

export default InteractiveMap;