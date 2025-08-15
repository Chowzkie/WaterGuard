import React, { useState } from 'react';
import {  SquarePen, X, AlertTriangle, Calendar, Clock, MessageSquare } from 'lucide-react';
import '../../Styles/PumpingStatus.css';

// --- The component now accepts `stations` and `onSave` as props ---
const PumpingStatus = ({ stations, onSave }) => {
    
    const [isEditing, setIsEditing] = useState(false);
    const [draftStations, setDraftStations] = useState(null);
    const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
    
    // Form input state remains the same, as it's temporary to the modal
    const [newLabel, setNewLabel] = useState('');
    const [newLocation, setNewLocation] = useState('');
    const [newOperation, setNewOperation] = useState('On-going');
    const [error, setError] = useState('');

    // --- NEW: State for the inline maintenance/offline details form ---
    const [detailsForStationId, setDetailsForStationId] = useState(null);
    const [draftDetails, setDraftDetails] = useState({ cause: '', date: '', startTime: '', endTime: '' });

    const hasUnsavedChanges = () => {
        if (!draftStations) return false;
        // Compare the draft against the 'stations' prop from the parent
        return JSON.stringify(stations) !== JSON.stringify(draftStations);
    };

    const handleOpenEditModal = () => {
        // Create a deep copy of the stations prop to edit
        setDraftStations(JSON.parse(JSON.stringify(stations)));
        setIsEditing(true);
    };

    const closeAndCleanup = () => {
        setIsEditing(false);
        setShowUnsavedPrompt(false);
        setDraftStations(null);
        setError('');
        // --- NEW: Reset details form state on close ---
        setDetailsForStationId(null);
        setDraftDetails({ cause: '', date: '', startTime: '', endTime: '' });
    };

    const handleAttemptClose = () => {
        if (hasUnsavedChanges()) {
            setShowUnsavedPrompt(true);
        } else {
            closeAndCleanup();
        }
    };

    // --- The 'Save' logic is now updated ---
    const handleSaveChanges = () => {
        // Instead of setting its own state, it calls the onSave function
        // passed down from Overview.jsx, sending the updated data back up.

          // --- MODIFIED: Prevent saving if the details form is still open ---
        if (detailsForStationId) {
            alert('Please save or cancel the details for the selected station first.');
            return;
        }

        onSave(draftStations);
        closeAndCleanup();
    };

    const handleDiscardChanges = () => {
        closeAndCleanup();
    };

    // The logic for modifying the draft list remains exactly the same
    const handleAddStationToDraft = (e) => {
        e.preventDefault();
        if (!newLabel || !newLocation) {
            setError('Please fill out all fields to add a station.');
            return;
        }
        setError('');
        const newStation = {
            id: Date.now(),
            label: newLabel,
            location: newLocation,
            operation: newOperation
        };
        setDraftStations([...draftStations, newStation]);
        setNewLabel('');
        setNewLocation('');
        setNewOperation('On-going');
    };

    const handleRemoveStationFromDraft = (id) => {
        setDraftStations(draftStations.filter(station => station.id !== id));
    };

    // --- MODIFIED: This function now triggers the details form ---
    const handleOperationChangeInDraft = (id, newOp) => {
        if (newOp === 'Maintenance' || newOp === 'Offline') {
            // Open the details form for this station
            setDetailsForStationId(id);
            // Pre-fill date with today's date
            setDraftDetails({ ...draftDetails, date: new Date().toISOString().split('T')[0] });
        } else {
             // If switching back to "On-going", clear any existing maintenance info
            setDraftStations(draftStations.map(s =>
                s.id === id ? { ...s, operation: newOp, maintenanceInfo: null } : s
            ));
        }
    };

    // --- NEW: Handler to save the maintenance/offline details ---
    const handleSaveDetails = () => {
        if (!draftDetails.cause || !draftDetails.date || !draftDetails.startTime || !draftDetails.endTime) {
            alert("Please fill in all detail fields.");
            return;
        }
        const stationToUpdate = draftStations.find(s => s.id === detailsForStationId);
        
        setDraftStations(draftStations.map(s =>
            s.id === detailsForStationId ? {
                ...s,
                // Set the operation status based on what triggered the form
                operation: stationToUpdate.operation === 'Maintenance' ? 'Maintenance' : 'Offline',
                // Attach the details
                maintenanceInfo: { ...draftDetails }
            } : s
        ));
        // Close the form
        setDetailsForStationId(null);
        setDraftDetails({ cause: '', date: '', startTime: '', endTime: '' });
    };

    return (
        <>
            {/* The JSX for displaying the list and modals remains the same. */}
            {/* It will now use the `stations` prop for display. */}
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
                            <div>Label</div><div>Location</div><div>Operation</div>
                        </div>
                        <div className="station-list-items">
                            {stations.map((s) => (
                                <div key={s.id} className="station-item">
                                    <div>{s.label}</div>
                                    <div>{s.location}</div>
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

            {/* EDIT MODE: Modal for editing stations */}
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
                            {/* Editable List */}
                            <div className="modal-list">
                                {draftStations.map(station => (
                                    <div key={station.id} className="station-item">
                                        <div>{station.label}</div>
                                        <div>{station.location}</div>
                                        <div>
                                            <select
                                                className="form-select-inline"
                                                value={station.operation}
                                                onChange={(e) => handleOperationChangeInDraft(station.id, e.target.value)}
                                            >
                                                <option>On-going</option>
                                                <option>Offline</option>
                                                <option>Maintenance</option>
                                            </select>
                                        </div>
                                        <div>
                                            <button
                                                onClick={() => handleRemoveStationFromDraft(station.id)}
                                                className="remove-button"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                        {/* --- NEW: Inline Details Form --- */}
                                        {detailsForStationId === station.id && (
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
                                                    <button className="button-secondary-small" onClick={() => setDetailsForStationId(null)}>Cancel</button>
                                                    <button className="button-primary-small" onClick={handleSaveDetails}>Set Details</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Form to add a new station */}
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
                                    <div className="form-input-group">
                                        <input
                                            type="text"
                                            placeholder="Location"
                                            value={newLocation}
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

                        {/* Modal Footer */}
                        <div className="modal-footer">
                            <button onClick={handleAttemptClose} className="button-secondary">Cancel</button>
                            <button onClick={handleSaveChanges} className="button-primary">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* UNSAVED CHANGES MODAL */}
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