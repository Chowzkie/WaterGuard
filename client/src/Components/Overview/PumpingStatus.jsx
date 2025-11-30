import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SquarePen, X, AlertTriangle, Calendar, Clock, MessageSquare, CheckCircle2, ShieldAlert, HelpCircle, Activity, BookOpen } from 'lucide-react';
import '../../Styles/PumpingStatus.css';
import socket from '../../socket'; 

// --- INTERNAL COMPONENT: Pumping Guidelines Modal ---
const PumpingGuidelinesModal = ({ onClose }) => {
    return (
        <div className="guidelines-overlay" onClick={onClose}>
            <div className="guidelines-modal" onClick={e => e.stopPropagation()}>
                <div className="guidelines-header">
                    <div className="guidelines-title-wrapper">
                        <BookOpen size={24} color="#3b82f6" />
                        <h3>Pumping Station Guide</h3>
                    </div>
                    <button className="modal-close-button" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="guidelines-content">
                    <h4 className="guidelines-section-title">
                        <Activity size={18} /> Operational Status Definitions
                    </h4>
                    
                    <div className="definition-list">
                        <div className="definition-item">
                            <strong><span style={{color: '#166534'}}>●</span> On-going</strong>
                            <p>The station is fully operational and currently actively pumping water. This is the standard healthy state.</p>
                        </div>
                        
                        <div className="definition-item">
                            <strong><span style={{color: '#991b1b'}}>●</span> Offline</strong>
                            <p>The station is operationally inactive. Pumping operations have ceased, and the facility is currently idle.</p>
                        </div>
                        
                        <div className="definition-item">
                            <strong><span style={{color: '#d2a615ff'}}>●</span> Maintenance</strong>
                            <p>
                                The station is currently under repair or scheduled service. 
                                <br />
                                <span style={{fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', marginTop: '4px', display:'block'}}>
                                    * Requires logging a specific cause (e.g., "Pipe Leak"), date, and estimated time range.
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

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

const PumpingStatus = ({ stations, onSave, devices = [] }) => { 
    
    // --- 1. LOCAL STATE ---
    const [liveStations, setLiveStations] = useState(stations || []);
    const [isEditing, setIsEditing] = useState(false);
    const [draftStations, setDraftStations] = useState(null);
    const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
    
    // Form States
    const [newLabel, setNewLabel] = useState('');
    const [newLocation, setNewLocation] = useState('');
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [newOperation, setNewOperation] = useState('On-going');
    const [error, setError] = useState('');

    // Maintenance Details States
    const [detailsForStationId, setDetailsForStationId] = useState(null);
    const [draftDetails, setDraftDetails] = useState({ cause: '', date: '', startTime: '', endTime: '' });
    const [stationBeingDetailed, setStationBeingDetailed] = useState(null);
    
    const [toast, setToast] = useState(null);

    // --- NEW: Guidelines Modal State ---
    const [showGuidelines, setShowGuidelines] = useState(false);

    // --- 2. SYNC WITH PARENT PROPS ---
    useEffect(() => {
        if (stations) {
            setLiveStations(stations);
        }
    }, [stations]);

    // --- 3. SOCKET IO LISTENER ---
    useEffect(() => {
        const handleStationUpdate = (updatedList) => {
            if (updatedList && Array.isArray(updatedList)) {
                setLiveStations(updatedList);
            }
        };
        socket.on('stationsUpdate', handleStationUpdate);
        return () => {
            socket.off('stationsUpdate', handleStationUpdate);
        };
    }, []);

    // Helper to calculate available devices
    const availableDevices = useMemo(() => {
        if (!draftStations) return []; 
        const assignedDeviceIds = new Set(
            draftStations.map(s => s.deviceId?._id || s.deviceId).filter(Boolean)
        );
        return devices.filter(d => !assignedDeviceIds.has(d._id));
    }, [devices, draftStations]); 

    const handleDeviceSelectChange = (e) => {
        const deviceId = e.target.value;
        setSelectedDeviceId(deviceId);
        if (deviceId) {
            const selectedDevice = devices.find(d => d._id === deviceId);
            if (selectedDevice) setNewLocation(selectedDevice.location);
        } else {
            setNewLocation('');
        }
    };

    const hasUnsavedChanges = () => {
        if (!draftStations) return false;
        return JSON.stringify(liveStations) !== JSON.stringify(draftStations);
    };

    const handleOpenEditModal = () => {
        setDraftStations(JSON.parse(JSON.stringify(liveStations)));
        setIsEditing(true);
    };

    const closeAndCleanup = () => {
        setIsEditing(false);
        setShowUnsavedPrompt(false);
        setDraftStations(null);
        setError('');
        setDetailsForStationId(null);
        setDraftDetails({ cause: '', date: '', startTime: '', endTime: '' });
        setStationBeingDetailed(null);
        setNewLabel('');
        setNewLocation('');
        setSelectedDeviceId('');
        setNewOperation('On-going');
    };

    const handleAttemptClose = () => {
        if (hasUnsavedChanges()) {
            setShowUnsavedPrompt(true);
        } else {
            closeAndCleanup();
        }
    };

    const handleSaveChanges = async () => {
        if (detailsForStationId) {
            alert('Please save or cancel the details for the selected station first.');
            return;
        }
        
        const stationsToSave = draftStations.map(s => ({
            ...s,
            deviceId: s.deviceId?._id || s.deviceId || null,
        }));
        
        try {
            await onSave(stationsToSave);
            setToast({
                id: Date.now(),
                message: 'Pumping stations updated successfully.',
                type: 'success'
            });
            closeAndCleanup();
        } catch (error) {
            console.error("Failed to save stations:", error);
            setToast({
                id: Date.now(),
                message: 'Failed to save changes. Please try again.',
                type: 'error'
            });
        }
    };

    const handleDiscardChanges = () => {
        closeAndCleanup();
    };

    const handleAddStationToDraft = (e) => {
        e.preventDefault();
        if (!newLabel || !selectedDeviceId) {
            setError('Please fill out Label and select a Device.');
            return;
        }
        setError('');
        
        const newStation = {
            tempId: Date.now(),
            label: newLabel,
            location: newLocation,
            deviceId: selectedDeviceId,
            operation: newOperation
        };
        setDraftStations([...draftStations, newStation]);
        setNewLabel('');
        setNewLocation('');
        setSelectedDeviceId('');
        setNewOperation('On-going');
    };

    const handleRemoveStationFromDraft = (idToRemove) => {
        setDraftStations(draftStations.filter(station => (station._id || station.tempId) !== idToRemove));
    };

    const handleOperationChangeInDraft = (idToChange, newOp) => {
        const station = draftStations.find(s => (s._id || s.tempId) === idToChange);
        if (!station) return;

        if (newOp === 'Maintenance') {
            setStationBeingDetailed({ id: idToChange, originalOp: station.operation });
            setDraftStations(draftStations.map(s => 
                (s._id || s.tempId) === idToChange ? { ...s, operation: newOp } : s
            ));
            setDetailsForStationId(idToChange);
            setDraftDetails({ cause: '', date: new Date().toISOString().split('T')[0], startTime: '', endTime: '' });
        } else {
            setDraftStations(draftStations.map(s =>
                (s._id || s.tempId) === idToChange ? { ...s, operation: newOp, maintenanceInfo: null } : s
            ));
            setDetailsForStationId(null);
            setStationBeingDetailed(null);
            setDraftDetails({ cause: '', date: '', startTime: '', endTime: '' });
        }
    };

    const handleSaveDetails = () => {
        if (!draftDetails.cause || !draftDetails.date || !draftDetails.startTime || !draftDetails.endTime) {
            alert("Please fill in all detail fields.");
            return;
        }
        setDraftStations(draftStations.map(s =>
            (s._id || s.tempId) === detailsForStationId ? {
                ...s,
                maintenanceInfo: { ...draftDetails }
            } : s
        ));
        setDetailsForStationId(null);
        setStationBeingDetailed(null);
        setDraftDetails({ cause: '', date: '', startTime: '', endTime: '' });
    };

    const handleCancelDetails = () => {
        setDraftStations(draftStations.map(s =>
            (s._id || s.tempId) === stationBeingDetailed.id ? { ...s, operation: stationBeingDetailed.originalOp, maintenanceInfo: null } : s
        ));
        setDetailsForStationId(null);
        setStationBeingDetailed(null);
        setDraftDetails({ cause: '', date: '', startTime: '', endTime: '' });
    }
    
    const getDeviceLabel = (deviceId) => {
        if (!deviceId) return 'N/A';
        if (typeof deviceId === 'object' && deviceId.label) return deviceId.label;
        if (typeof deviceId === 'string') {
            const device = devices.find(d => d._id === deviceId);
            return device ? device.label : 'Unknown';
        }
        return 'N/A';
    };

    return (
        <>
            <div className="component-wrapper-pumpingstatus">
                <div className="station-status-card">
                    <div className="card-header">
                        <div className="header-with-icon">
                            <h2>Pumping Stations Status</h2>
                            {/* Help Icon triggers local modal state */}
                            <HelpCircle 
                                size={16} 
                                className="guidelines-icon" 
                                onClick={() => setShowGuidelines(true)} 
                            />
                        </div>
                        <button onClick={handleOpenEditModal} className="edit-toggle-button">
                            <SquarePen size={18} />
                        </button>
                    </div>
                    <div className="station-list">
                        <div className="station-list-header">
                            <div>Label</div><div>Location</div><div>Device</div><div>Operation</div>
                        </div>
                        <div className="station-list-items">
                            {liveStations.map((s) => (
                                <div key={s._id} className="station-item">
                                    <div>{s.label}</div>
                                    <div>{s.location}</div>
                                    <div>{s.deviceId?.label || 'N/A'}</div>
                                    <div>
                                        <span className={`status-badge ${s.operation.toLowerCase().replace('-', '_')}`}>
                                            {s.operation}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {isEditing && (
                <div className="modal-backdrop" onClick={handleAttemptClose}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Edit Stations</h3>
                            <button onClick={handleAttemptClose} className="modal-close-button">
                                <X size={22} />
                            </button>
                        </div>
                        <div className="modal-body-scroll">
                            <div className="modal-list">
                                {draftStations.map(station => (
                                    <div key={station._id || station.tempId} className="station-item">
                                        <div>{station.label}</div>
                                        <div>{station.location}</div>
                                        <div>{getDeviceLabel(station.deviceId)}</div>
                                        <div>
                                            <select
                                                className="form-select-inline"
                                                value={station.operation}
                                                onChange={(e) => handleOperationChangeInDraft(station._id || station.tempId, e.target.value)}
                                            >
                                                <option>On-going</option>
                                                <option>Offline</option>
                                                <option>Maintenance</option>
                                            </select>
                                        </div>
                                        <div>
                                            <button
                                                onClick={() => handleRemoveStationFromDraft(station._id || station.tempId)}
                                                className="remove-button"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                        {detailsForStationId === (station._id || station.tempId) && (
                                            <div className="details-form-container">
                                                <div className="details-form-header">
                                                    <h4>Details for {station.operation} Status</h4>
                                                </div>
                                                <div className="details-form-body">
                                                    <div className="details-form-input-group">
                                                        <label><MessageSquare size={14}/> Cause</label>
                                                        <input type="text" placeholder="e.g., Pipe leak, pump replacement" value={draftDetails.cause} onChange={e => setDraftDetails({...draftDetails, cause: e.target.value})} />
                                                    </div>
                                                    <div className="details-form-input-group">
                                                        <label><Calendar size={14}/> Date</label>
                                                        <input type="date" value={draftDetails.date} onChange={e => setDraftDetails({...draftDetails, date: e.target.value})} />
                                                    </div>
                                                    <div className="details-form-input-group">
                                                        <label><Clock size={14}/> Start Time</label>
                                                        <input type="time" value={draftDetails.startTime} onChange={e => setDraftDetails({...draftDetails, startTime: e.target.value})} />
                                                    </div>
                                                    <div className="details-form-input-group">
                                                        <label><Clock size={14}/> End Time</label>
                                                        <input type="time" value={draftDetails.endTime} onChange={e => setDraftDetails({...draftDetails, endTime: e.target.value})} />
                                                    </div>
                                                </div>
                                                <div className="details-form-footer">
                                                    <button className="button-secondary-small" onClick={handleCancelDetails}>Cancel</button>
                                                    <button className="button-primary-small" onClick={handleSaveDetails}>Set Details</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <form className="add-station-form" onSubmit={handleAddStationToDraft} noValidate>
                                <h4 className="form-title">Add New Station</h4>
                                <div className="form-inputs">
                                    <div className="form-input-group">
                                        <input type="text" placeholder="Station Label" value={newLabel} onChange={e => setNewLabel(e.target.value)} className="form-input" />
                                    </div>
                                    <div className="form-input-group">
                                        <select value={selectedDeviceId} onChange={handleDeviceSelectChange} className="form-select">
                                            <option value="">Select a Device</option>
                                            {availableDevices.map(device => (
                                                <option key={device._id} value={device._id}>{device.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-input-group">
                                        <input type="text" placeholder="Location (from device)" value={newLocation} onChange={e => setNewLocation(e.target.value)} className="form-input" />
                                    </div>
                                    <div className="form-input-group">
                                        <select value={newOperation} onChange={e => setNewOperation(e.target.value)} className="form-select">
                                            <option>On-going</option>
                                            <option>Offline</option>
                                            <option>Maintenance</option>
                                        </select>
                                    </div>
                                </div>
                                {error && <p className="form-error-message">{error}</p>}
                                <button type="submit" className="add-button">Add Station</button>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button onClick={handleAttemptClose} className="button-secondary">Cancel</button>
                            <button onClick={handleSaveChanges} className="button-primary">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {showUnsavedPrompt && (
                <div className="modal-backdrop confirmation-modal-backdrop">
                    <div className="modal-content confirmation-modal-content">
                        <div className="icon"><AlertTriangle size={48} /></div>
                        <h4>Unsaved Changes</h4>
                        <p>Are you sure you want to leave? Your changes will be discarded.</p>
                        <div className="modal-footer">
                            <button onClick={handleDiscardChanges} className="button-secondary">Discard</button>
                            <button onClick={handleSaveChanges} className="button-danger">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className="toastContainerWrapper">
                    <NotificationToast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />
                </div>
            )}

            {/* --- NEW: Guidelines Modal Rendered Internally --- */}
            {showGuidelines && (
                <PumpingGuidelinesModal onClose={() => setShowGuidelines(false)} />
            )}
        </>
    );
};

export default PumpingStatus;