import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Virtuoso } from 'react-virtuoso';
import Style from '../../Styles/LogsStyle/UserLogs.module.css';
import { ListFilter, X, Trash2, Undo, Check, Calendar, Clock, MessageSquare } from 'lucide-react';
import {formatDateTime} from '../../utils/formatDateTime'
import axios from 'axios';

//Base URL of the Backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

//Main container component for userlogs page and handle all the data fetching
function UserLogs() {
    //States 
    const [logs, setLogs] = useState([]); // Hold the log fetched
    const [loading, setLoading] = useState(true); // Loading status whhen fetchiing data
    const [lastDeletedLogs, setLastDeletedLogs] = useState([]); //use to temporarily store the deleted userlogs

    //function to fetched user logs from the database
    useEffect(() => {
        const fetchUserLogs = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/logs/userlogs`); //make get request to get the data into the database
                setLogs(response.data.map(log => ({ ...log, id: log._id }))); // Update the logs state with the fetched data, adding a local 'id' field for keying.
            } catch (error) {
                console.error("Error fetching user logs:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUserLogs();
    }, []);

    //Function for deleting the logs
    const handleDeleteLogs = async (idsToDelete) => {
        const idsArray = Array.from(idsToDelete);

        try {
            // Store the full log objects of the items that will be deleted.
            const logsToRestore = logs.filter(log => idsArray.includes(log.id));
            setLastDeletedLogs(logsToRestore);

            const logsToKeep = logs.filter(log => !idsArray.includes(log.id));
            setLogs(logsToKeep);

            // Make a POST request to the backend with the array of IDs.
            await axios.post(`${API_BASE_URL}/api/logs/delete`, { ids: idsArray });
            
        } catch (error) {
            console.error("Error deleting logs:", error);
            // Revert the UI state if the API call fails.
            setLogs(prevLogs => [...prevLogs, ...lastDeletedLogs]);
            // Clear the undo state since the delete failed.
            setLastDeletedLogs([]);
        }
    };

    // Function to restore logs
    const handleRestoreLogs = async () => {
        // Do nothing if there are no logs to restore.
        if (lastDeletedLogs.length === 0) return;

        try {
            // Make a POST request to the backend to restore the logs.
            await axios.post(`${API_BASE_URL}/api/logs/restore`, { logs: lastDeletedLogs });
            setLogs(prevLogs => [...prevLogs, ...lastDeletedLogs]); // Add the restored logs back to the main logs state.
            setLastDeletedLogs([]); // Clear the temporary restore state.
        } catch (error) {
            console.error("Error restoring logs:", error);
            const response = await axios.get(`${API_BASE_URL}/api/logs/userlogs`); // Re-fetch all logs from the backend to ensure data consistency in case of failure.
            setLogs(response.data.map(log => ({ ...log, id: log._id })));
        }
    };
    // Render the presentational component, passing down data and functions as props.
    return (
        <UserLogsContent 
            logs={logs}
            loading={loading}
            onDelete={handleDeleteLogs}
            onRestore={handleRestoreLogs}
        />
    );
}

function UserLogsContent({ logs, loading, onDelete, onRestore }) {
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        category: [],
    });

    const [draftFilters, setDraftFilters] = useState(filters);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const [deleteMode, setDeleteMode] = useState('off');
    const [selectedToDelete, setSelectedToDelete] = useState([]);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showUndoToast, setShowUndoToast] = useState(false);
    const [lastDeletedCount, setLastDeletedCount] = useState(0);

    const [expandedLogId, setExpandedLogId] = useState(null);

    const filterPanelRef = useRef(null);
    const undoTimerRef = useRef(null);

    /**
     * useMemo hook to efficiently filter and sort the logs based on the current filters.
     * This prevents re-calculation unless 'logs' or 'filters' change.
     */
    const filteredDisplayLogs = useMemo(() => {
        let logsToFilter = [...logs];

        const { startDate, endDate } = filters;
        if (startDate || endDate) {
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (start) start.setHours(0, 0, 0, 0);
            if (end) end.setHours(23, 59, 59, 999);

            logsToFilter = logsToFilter.filter(log => {
                const logDate = new Date(log.dateTime);
                if (start && logDate < start) return false;
                if (end && logDate > end) return false;
                return true;
            });
        }

        const { category } = filters;
        if (category.length > 0) {
            logsToFilter = logsToFilter.filter(log => log.type && category.includes(log.type));
        }

        return logsToFilter.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
    }, [logs, filters]);

    // Funtion to reset the draft filters
    useEffect(() => {
        if (isFilterOpen) {
            setDraftFilters(filters);
        }
    }, [isFilterOpen, filters]);

    //function to show the undo toast hides in 10sec
    useEffect(() => {
        if (showUndoToast) {
            undoTimerRef.current = setTimeout(() => {
                setShowUndoToast(false);
            }, 10000);
        }
        return () => {
            if (undoTimerRef.current) {
                clearTimeout(undoTimerRef.current);
            }
        };
    }, [showUndoToast]);

    const handleToggleDeleteMode = () => {
        setDeleteMode(prev => (prev === 'off' ? 'all' : 'off'));
        setSelectedToDelete([]);
    };

    const handleCheckboxChange = (logId) => {
        const newSelection = new Set(selectedToDelete);
        if (newSelection.has(logId)) {
            newSelection.delete(logId);
        } else {
            newSelection.add(logId);
        }
        setSelectedToDelete(Array.from(newSelection));
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedToDelete(filteredDisplayLogs.map(log => log.id));
        } else {
            setSelectedToDelete([]);
        }
    };

    const handleDeleteClick = () => {
        const hasSelection = (deleteMode === 'all' && filteredDisplayLogs.length > 0) || (deleteMode === 'select' && selectedToDelete.length > 0);
        if (hasSelection) {
            setShowConfirmModal(true);
        }
    };

    const handleConfirmDelete = () => {
        const idsToDelete = deleteMode === 'all'
            ? new Set(filteredDisplayLogs.map(log => log.id))
            : new Set(selectedToDelete);

        setLastDeletedCount(idsToDelete.size);
        onDelete(idsToDelete);

        setShowConfirmModal(false);
        setDeleteMode('off');
        setSelectedToDelete([]);
        setShowUndoToast(true);
    };

    const handleUndo = () => {
        onRestore();
        setShowUndoToast(false);
        if (undoTimerRef.current) {
            clearTimeout(undoTimerRef.current);
        }
    };

    const handleDateChange = (e) => { setDraftFilters(prev => ({ ...prev, [e.target.name]: e.target.value })); };
    
    const handlePillSelect = (filterType, value) => {
        setDraftFilters(prev => {
            const currentValues = new Set(prev[filterType]);
            if (currentValues.has(value)) {
                currentValues.delete(value);
            } else {
                currentValues.add(value);
            }
            return { ...prev, [filterType]: Array.from(currentValues) };
        });
    };

    const applyFilters = () => { setFilters(draftFilters); setIsFilterOpen(false); };
    const clearFilters = () => { setDraftFilters({ startDate: '', endDate: '', category: [] }); };


    const getTypeStyle = (logType) => {
        switch (logType) {
            case 'Configuration': return Style['type-configuration'];
            case 'Login': return Style['type-login'];
            case 'Logout': return Style['type-logout']
            case 'Account': return Style['type-account'];
            case 'Deletion': return Style['type-deletion'];
            case 'Restoration': return Style['type-restoration'];
            case 'Acknowledgement': return Style['type-acknowledgement'];
            case 'Valve': return Style['type-valve'];
            case 'Pump' : return Style['type-pump'];
            case 'Maintenance': return Style['type-maintenance'];
            case 'Station': return Style['type-station'];
            case 'Device': return Style['type-device']
            default: return '';
        }
    };
    
    const handleRowClick = (log) => {
        if (log.type === 'Maintenance' && log.details) {
            setExpandedLogId(prevId => (prevId === log.id ? null : log.id));
        }
    };

    return (
        <div className={Style['container']}>
            <div className={Style['tableTitle']}>
                <p>User Logs</p>
                <div className={Style['icons']}>
                    {deleteMode !== 'off' ? (
                        <div className={Style['delete-controls']}>
                            <div className={Style['delete-slider']}>
                                <button onClick={() => { setDeleteMode('all'); setSelectedToDelete([]); }} className={deleteMode === 'all' ? Style.active : ''}>Delete All Filtered</button>
                                <button onClick={() => setDeleteMode('select')} className={deleteMode === 'select' ? Style.active : ''}>Select to Delete</button>
                            </div>
                            <span>
                                {deleteMode === 'all' ? filteredDisplayLogs.length : selectedToDelete.length} selected
                            </span>
                            <button className={Style['delete-button']} onClick={handleDeleteClick}>Delete</button>
                            <button className={Style['delete-cancel-button']} onClick={handleToggleDeleteMode}><X size={16} /></button>
                        </div>
                    ) : (
                        <>
                            <Trash2 className={Style['trash-icon']} size={18} onClick={handleToggleDeleteMode} />
                            <div className={Style['menu']} onClick={() => setIsFilterOpen(o => !o)}>
                                <ListFilter size={18}/>
                            </div>
                        </>
                    )}

                    {isFilterOpen && (
                        <div className={Style['filter-panel']} ref={filterPanelRef}>
                            <div className={Style['filter-header']}>
                                <h4>Filter Logs</h4>
                                <button onClick={() => setIsFilterOpen(false)} className={Style['close-filter-btn']}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className={Style['filter-body']}>
                                <div className={Style['filter-row']}>
                                    <label className={Style['filter-label']}>Date Range</label>
                                    <div className={Style['filter-control']}>
                                        <div className={Style['date-range-group']}>
                                            <input type="date" name="startDate" value={draftFilters.startDate} onChange={handleDateChange} className={Style['date-input']} />
                                            <span>to</span>
                                            <input type="date" name="endDate" value={draftFilters.endDate} onChange={handleDateChange} className={Style['date-input']} />
                                        </div>
                                    </div>
                                </div>

                                <div className={Style['filter-row']}>
                                    <label className={Style['filter-label']}>Category</label>
                                    <div className={Style['filter-control']}>
                                        <div className={Style['pill-group']}>
                                            {['Configuration', 'Login', 'Logout', 'Account', 'Deletion', 'Restoration','Acknowledgement', 'Valve', 'Pump','Maintenance', 'Device', 'Station'].map(category => (
                                                <button
                                                    key={category}
                                                    onClick={() => handlePillSelect('category', category)}
                                                    className={`${Style['filter-pill']} ${draftFilters.category.includes(category) ? Style.selected : ''}`}
                                                >
                                                    {draftFilters.category.includes(category) && <Check size={14} />}
                                                    {category}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className={Style['filter-footer']}>
                                <button className={Style['clear-btn']} onClick={clearFilters}>Reset</button>
                                <button className={Style['apply-btn']} onClick={applyFilters}>Apply</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

 {/* --- The static, non-scrolling header remains the same --- */}
            <div className={`${Style['tableHeader']} ${deleteMode === 'select' ? Style['select-delete-grid'] : ''}`}>
                <div className={Style['headerItem']}>Date & Time</div>
                <div className={Style['headerItem']}>Type</div>
                <div className={Style['headerItem']}>Action</div>
                {deleteMode === 'select' && (
                    <div className={Style['checkbox-cell-header']}>
                        <label className={Style['custom-checkbox-container']}>
                            <input
                                type="checkbox"
                                onChange={handleSelectAll}
                                checked={filteredDisplayLogs.length > 0 && selectedToDelete.length === filteredDisplayLogs.length}
                                disabled={filteredDisplayLogs.length === 0}
                            />
                            <span className={Style['checkmark']}></span>
                        </label>
                    </div>
                )}
            </div>
            
            {/* --- This container defines the area for the scrollable list --- */}
            <div className={Style['tableBody']}>
                {loading ? (
                    <div className={Style['loading-spinner']}>
                        <div className={Style['spinner']}></div>
                    </div>
                ) : filteredDisplayLogs.length > 0 ? (
                    // --- Virtuoso now handles the rendering of the log list ---
                    <Virtuoso
                        // Fills the available space provided by the flexbox container
                        style={{ height: '100%' }}
                        data={filteredDisplayLogs}
                        itemContent={(index, log) => {
                            const hasDetails = log.type === 'Maintenance' && log.details;
                            const isExpanded = expandedLogId === log.id;

                            // Using a <div> wrapper instead of React.Fragment to ensure stable scrolling with Virtuoso
                            return (
                                <div key={log.id}>
                                    <div 
                                        className={`${Style['tableRow']} ${hasDetails ? Style['clickable-row'] : ''} ${isExpanded ? Style['expanded-row'] : ''} ${deleteMode === 'select' ? Style['select-delete-grid'] : ''} ${selectedToDelete.includes(log.id) ? Style['selected-for-deletion'] : ''}`} 
                                        onClick={() => handleRowClick(log)}
                                    >
                                        <div className={Style['tableCell']} data-label="Date & Time">{formatDateTime(log.dateTime)}</div>
                                        <div className={Style['tableCell']} data-label="Type">
                                            <span className={`${Style['type-badge']} ${getTypeStyle(log.type)}`}>
                                                {log.type}
                                            </span>
                                        </div>
                                        <div className={Style['tableCell']} data-label="Action">{log.action}</div>
                                        {deleteMode === 'select' && (
                                            <div className={Style['checkbox-cell']}>
                                                <label className={Style['custom-checkbox-container']}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedToDelete.includes(log.id)}
                                                        onChange={() => handleCheckboxChange(log.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <span className={Style['checkmark']}></span>
                                                </label>
                                            </div>
                                        )}
                                    </div>

                                    {hasDetails && (
                                        <div className={`${Style['details-panel']} ${isExpanded ? Style['expanded'] : ''}`}>
                                            <div className={Style['details-content']}>
                                                <div className={Style['detail-item']}>
                                                    <MessageSquare size={16} />
                                                    <span>Cause: <strong>{log.details.cause}</strong></span>
                                                </div>
                                                <div className={Style['detail-item']}>
                                                    <Calendar size={16} />
                                                    <span>Date: {log.details.date}</span>
                                                </div>
                                                <div className={Style['detail-item']}>
                                                    <Clock size={16} />
                                                    <span>
                                                        {new Date(`1970-01-01T${log.details.startTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - 
                                                        {new Date(`1970-01-01T${log.details.endTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        }}
                    />
                ) : (
                    <div className={Style['noData']}>
                        {logs.length === 0 ? "No user logs available." : "No user logs match the current filters."}
                    </div>
                )}
            </div>

            {showConfirmModal && (
                <div className={Style['modal-backdrop']}>
                    <div className={Style['confirmation-modal']}>
                        <h4>Confirm Deletion</h4>
                        <p>Are you sure you want to delete these {deleteMode === 'all' ? filteredDisplayLogs.length : selectedToDelete.length} log records?</p>
                        <div className={Style['modal-actions']}>
                            <button onClick={() => setShowConfirmModal(false)} className={Style['button-secondary']}>Cancel</button>
                            <button onClick={handleConfirmDelete} className={Style['button-danger']}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}
            
            <div className={`${Style['undo-toast']} ${showUndoToast ? Style.show : ''}`}>
                <span>{lastDeletedCount} log(s) deleted.</span>
                <button onClick={handleUndo}><Undo size={16}/> Undo</button>
            </div>
        </div>
    );
}

export default UserLogs;