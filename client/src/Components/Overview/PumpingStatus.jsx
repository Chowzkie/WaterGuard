import React, { useState, useMemo } from 'react'; // Import useMemo
import {  SquarePen, X, AlertTriangle, Calendar, Clock, MessageSquare } from 'lucide-react';
import '../../Styles/PumpingStatus.css';

// --- Accept 'devices' prop ---
const PumpingStatus = ({ stations, onSave, devices = [] }) => { // Default devices to empty array
    
    const [isEditing, setIsEditing] = useState(false);
    const [draftStations, setDraftStations] = useState(null);
    const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
    
    const [newLabel, setNewLabel] = useState('');
    // --- 'newLocation' is now auto-filled ---
    const [newLocation, setNewLocation] = useState('');
    // --- State to track the selected device ID ---
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [newOperation, setNewOperation] = useState('On-going');
    const [error, setError] = useState('');

    const [detailsForStationId, setDetailsForStationId] = useState(null);
    const [draftDetails, setDraftDetails] = useState({ cause: '', date: '', startTime: '', endTime: '' });
    const [stationBeingDetailed, setStationBeingDetailed] = useState(null);

    // ---Memoized list of available devices ---
    // This now depends on 'draftStations' to update the dropdown
    // as you add new stations in the modal.
    const availableDevices = useMemo(() => {
        // If the modal isn't open, draftStations is null. Don't bother.
        if (!draftStations) return []; 
        
        // Get all device IDs assigned in the *current draft*
        const assignedDeviceIds = new Set(
            draftStations.map(s => s.deviceId?._id || s.deviceId).filter(Boolean)
        );
        
        // Return devices that are NOT in the assigned set
        return devices.filter(d => !assignedDeviceIds.has(d._id));
    }, [devices, draftStations]); // <-- UPDATED DEPENDENCY

    // --- Handler for the device dropdown ---
    const handleDeviceSelectChange = (e) => {
        const deviceId = e.target.value;
        setSelectedDeviceId(deviceId);

        if (deviceId) {
            // Find the selected device and auto-fill the location
            const selectedDevice = devices.find(d => d._id === deviceId);
            if (selectedDevice) {
                setNewLocation(selectedDevice.location);
            }
        } else {
            // Clear location if "Select a Device" is chosen
            setNewLocation('');
        }
    };

    const hasUnsavedChanges = () => {
        if (!draftStations) return false;
        return JSON.stringify(stations) !== JSON.stringify(draftStations);
    };

    const handleOpenEditModal = () => {
        setDraftStations(JSON.parse(JSON.stringify(stations)));
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
        // --- Reset new station fields on close ---
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

    const handleSaveChanges = () => {
        if (detailsForStationId) {
            alert('Please save or cancel the details for the selected station first.');
            return;
        }
        
        // --- Prepare stations for saving ---
        // Ensure deviceId is just the ID string, not the populated object
        const stationsToSave = draftStations.map(s => ({
            ...s,
            // If deviceId is an object (from populate), just send its _id.
            // If it's a string (from new add), send it as is.
            deviceId: s.deviceId?._id || s.deviceId || null,
        }));
        
        onSave(stationsToSave);
        closeAndCleanup();
    };

    const handleDiscardChanges = () => {
        closeAndCleanup();
    };

    const handleAddStationToDraft = (e) => {
        e.preventDefault();
        // --- Validation check ---
        if (!newLabel || !selectedDeviceId) {
            setError('Please fill out Label and select a Device.');
            return;
        }
        setError('');
        
        // ---  New station object ---
        const newStation = {
            tempId: Date.now(),
            label: newLabel,
            location: newLocation, // The auto-filled location
            deviceId: selectedDeviceId, // Store the ID. We'll look up the label for display
            operation: newOperation
        };
        setDraftStations([...draftStations, newStation]);
        
        // --- Reset fields ---
        setNewLabel('');
        setNewLocation('');
        setSelectedDeviceId('');
        setNewOperation('On-going');
    };

    const handleRemoveStationFromDraft = (idToRemove) => {
        setDraftStations(draftStations.filter(station => (station._id || station.tempId) !== idToRemove));
    };

    // ... (handleOperationChangeInDraft, handleSaveDetails, handleCancelDetails remain the same) ...
    // ...
    const handleOperationChangeInDraft = (idToChange, newOp) => {
        const station = draftStations.find(s => (s._id || s.tempId) === idToChange);
        if (!station) return;

        if (newOp === 'Maintenance') {
            // 1. Store the original status in case the user cancels.
            setStationBeingDetailed({ id: idToChange, originalOp: station.operation });
            
            // 2. Update the draft state IMMEDIATELY.
            setDraftStations(draftStations.map(s => 
                (s._id || s.tempId) === idToChange ? { ...s, operation: newOp } : s
            ));
            
            // 3. Open the details form.
            setDetailsForStationId(idToChange);
            setDraftDetails({ cause: '', date: new Date().toISOString().split('T')[0], startTime: '', endTime: '' });
        } else {
            // This block now runs for both "On-going" and "Offline".
            setDraftStations(draftStations.map(s =>
                (s._id || s.tempId) === idToChange ? { ...s, operation: newOp, maintenanceInfo: null } : s
            ));
            
            // Hide the details form if it was open.
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
    // ...
    
    // ---Helper to get device label for display ---
    // Handles both populated objects (from DB) and string IDs (newly added)
    const getDeviceLabel = (deviceId) => {
        if (!deviceId) return 'N/A';
        
        // If it's an object (populated from DB), return its label
        if (typeof deviceId === 'object' && deviceId.label) {
            return deviceId.label;
        }
        
        // If it's a string ID (newly added in modal), find it in the 'devices' prop
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
                        <h2>Pumping Stations Status</h2>
                        <button onClick={handleOpenEditModal} className="edit-toggle-button">
                            <SquarePen size={18} />
                        </button>
                    </div>
                    <div className="station-list">
                        <div className="station-list-header">
                            {/* --- Added Device column --- */}
                            <div>Label</div><div>Location</div><div>Device</div><div>Operation</div>
                        </div>
                        <div className="station-list-items">
                            {stations.map((s) => (
                                <div key={s._id} className="station-item">
                                    <div>{s.label}</div>
                                    <div>{s.location}</div>
                                    {/* --- Display device label --- */}
                                    {/* s.deviceId is populated by the backend as { _id: '...', label: '...' } */}
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
                                        {/* --- Display device label --- */}
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

                            {/* --- Add Station Form --- */}
                            <form className="add-station-form" onSubmit={handleAddStationToDraft} noValidate>
                                <h4 className="form-title">Add New Station</h4>
                                <div className="form-inputs">
                                    <div className="form-input-group">
                                        <input
                                            type="text"
                                            placeholder="Station Label"
                                            value={newLabel}
                                            onChange={e => setNewLabel(e.target.value)}
                                            className="form-input"
                                        />
                                    </div>
                                    
                                    {/* --- Device Dropdown --- */}
                                    <div className="form-input-group">
                                        <select
                                            value={selectedDeviceId}
                                            onChange={handleDeviceSelectChange}
                                            className="form-select"
                                        >
                                            <option value="">Select a Device</option>
                                            {/* We use 'availableDevices' to only show unassigned devices */}
                                            {availableDevices.map(device => (
                                                <option key={device._id} value={device._id}>
                                                    {device.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* --- Location Input (Auto-filled) --- */}
                                    <div className="form-input-group">
                                        <input
                                            type="text"
                                            placeholder="Location (from device)"
                                            value={newLocation}
                                            // You can make this readOnly if you never want the user to change it
                                            // readOnly
                                            // Or allow them to edit it:
                                            onChange={e => setNewLocation(e.target.value)}
                                            className="form-input"
                                        />
                                    </div>
                                    
                                    <div className="form-input-group">
                                        <select
                                            value={newOperation}
                                            onChange={e => setNewOperation(e.target.value)}
                                            className="form-select"
                                        >
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
        </>
    );
};

export default PumpingStatus;