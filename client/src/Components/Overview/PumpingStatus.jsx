import React, { useState } from 'react';
import {  SquarePen, X, AlertTriangle, Calendar, Clock, MessageSquare } from 'lucide-react';
import '../../Styles/PumpingStatus.css';

const PumpingStatus = ({ stations, onSave }) => {
    
    const [isEditing, setIsEditing] = useState(false);
    const [draftStations, setDraftStations] = useState(null);
    const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
    
    const [newLabel, setNewLabel] = useState('');
    const [newLocation, setNewLocation] = useState('');
    const [newOperation, setNewOperation] = useState('On-going');
    const [error, setError] = useState('');

    const [detailsForStationId, setDetailsForStationId] = useState(null);
    const [draftDetails, setDraftDetails] = useState({ cause: '', date: '', startTime: '', endTime: '' });

    // FIX: Add state to remember the station being detailed, including its original operation status.
    // This is crucial for handling the "Cancel" action correctly.
    const [stationBeingDetailed, setStationBeingDetailed] = useState(null);

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
        // FIX: Clear the station detail tracking state on close.
        setStationBeingDetailed(null);
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
        onSave(draftStations);
        closeAndCleanup();
    };

    const handleDiscardChanges = () => {
        closeAndCleanup();
    };

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

    const handleOperationChangeInDraft = (id, newOp) => {
        // FIX: The condition is now simplified to only trigger for 'Maintenance'.
        if (newOp === 'Maintenance') {
            const station = draftStations.find(s => s.id === id);
            // 1. Store the original status in case the user cancels.
            setStationBeingDetailed({ id: id, originalOp: station.operation });
            
            // 2. Update the draft state IMMEDIATELY.
            setDraftStations(draftStations.map(s => s.id === id ? { ...s, operation: newOp } : s));
            
            // 3. Open the details form.
            setDetailsForStationId(id);
            setDraftDetails({ cause: '', date: '', startTime: '', endTime: '' , date: new Date().toISOString().split('T')[0] });
        } else {
            // This block now runs for both "On-going" and "Offline".
            setDraftStations(draftStations.map(s =>
                s.id === id ? { ...s, operation: newOp, maintenanceInfo: null } : s
            ));
            
            // Hide the details form if it was open.
            setDetailsForStationId(null);
            setStationBeingDetailed(null);
            setDraftDetails({ cause: '', date: '', startTime: '', endTime: '' });
        }
    };

    // FIX: The save handler is now much simpler.
    const handleSaveDetails = () => {
        if (!draftDetails.cause || !draftDetails.date || !draftDetails.startTime || !draftDetails.endTime) {
            alert("Please fill in all detail fields.");
            return;
        }
        
        // The station's 'operation' is already correct in the draft. We just add the details.
        setDraftStations(draftStations.map(s =>
            s.id === detailsForStationId ? {
                ...s,
                maintenanceInfo: { ...draftDetails }
            } : s
        ));
        
        // Close the form and clear the tracking state.
        setDetailsForStationId(null);
        setStationBeingDetailed(null);
        setDraftDetails({ cause: '', date: '', startTime: '', endTime: '' });
    };

    // FIX: New handler for the "Cancel" button on the details form.
    const handleCancelDetails = () => {
        // Revert the station's operation back to its original value.
        setDraftStations(draftStations.map(s =>
            s.id === stationBeingDetailed.id ? { ...s, operation: stationBeingDetailed.originalOp, maintenanceInfo: null } : s
        ));
        
        // Close the form and clear tracking state.
        setDetailsForStationId(null);
        setStationBeingDetailed(null);
        setDraftDetails({ cause: '', date: '', startTime: '', endTime: '' });
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
                                                    {/* FIX: The Cancel button now correctly reverts the status change. */}
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