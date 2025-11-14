import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';
// Import icons for the UI, delete actions, and toast notifications
import { 
    Trash2, 
    ListFilter, 
    X, 
    Check, 
    User, 
    ChevronDown, 
    Undo, 
    Clock, 
    CheckCircle2, 
    ShieldAlert 
} from 'lucide-react';
import { formatDateTime } from '../../utils/formatDateTime';
import styles from '../../Styles/AlertsHistory.module.css';

/**
 * NotificationToast Component
 * A reusable component for displaying slide-in success or error notifications.
 * It handles its own appearance, auto-dismissal, and exit animation.
 */
const NotificationToast = ({ message, type, onClose }) => {
    // State to manage the exit animation
    const [isExiting, setIsExiting] = useState(false);
    // Ref to hold the auto-dismiss timer
    const timerRef = useRef(null);

    /**
     * Triggers the exit animation and calls the parent's onClose function
     * after the animation duration.
     */
    const handleClose = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setIsExiting(true);
        setTimeout(onClose, 300); // Wait for CSS animation to finish
    };

    // Set up an auto-close timer when the toast is mounted
    useEffect(() => {
        timerRef.current = setTimeout(handleClose, 4000); // 4-second duration
        
        // Clear the timer if the component is unmounted early
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []); // Empty dependency array ensures this runs only once on mount

    // Determine the title and icon based on the 'type' prop
    const isSuccess = type === 'success';
    const title = isSuccess ? 'Success' : 'Error';
    const Icon = isSuccess ? CheckCircle2 : ShieldAlert;

    return (
        <div
            className={`
                ${styles.toast}
                ${isSuccess ? styles.toastSuccess : styles.toastError}
                ${isExiting ? styles.toastOutRight : styles.toastIn}
            `}
        >
            <Icon className={styles.toastIcon} size={22} />
            <div className={styles.toastContent}>
                <h4>{title}</h4>
                <p>{message}</p>
            </div>
            <button onClick={handleClose} className={styles.toastClose}>
                <X size={18} />
            </button>
        </div>
    );
};

/**
 * AlertsHistory Component
 * Displays a filterable, virtualized list of all non-active alert records.
 * Includes functionality for deleting, multi-selecting, and undoing deletions.
 */
const AlertsHistory = ({ 
    historyAlerts = [], 
    onDeleteHistoryAlerts, 
    onRestoreHistoryAlerts,  
    onPermanentDeleteAlerts,
}) => {
    // --- State for Filtering ---
    const [filters, setFilters] = useState({
        status: [],
        severity: [],
        type: [],
        action: [],
    });
    const [draftFilters, setDraftFilters] = useState(filters);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [typeSearchTerm, setTypeSearchTerm] = useState('');
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    
    // --- State for Deletion UI ---
    const [deleteMode, setDeleteMode] = useState('off'); // 'off', 'all', 'select'
    const [selectedToDelete, setSelectedToDelete] = useState([]);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    
    // --- State for Undo/Toast Functionality ---
    const [showUndoToast, setShowUndoToast] = useState(false); // For the main undo banner
    const [toast, setToast] = useState(null); // For slide-in success/error toasts
    const lastDeleted = useRef([]); // Holds alerts temporarily in case of undo
    const undoTimerRef = useRef(null); // Ref for the undo banner's 10s timer
    const wasUndoClicked = useRef(false); // Flag to prevent double-action on timeout

    // --- State for Alert Details ---
    const [expandedAlertId, setExpandedAlertId] = useState(null); // Tracks which row's details are open

    // --- Refs for Click-Outside Listeners ---
    const filterPanelRef = useRef(null);
    const typeDropdownRef = useRef(null);

    // Memoize unique alert types for the filter dropdown
    const uniqueAlertTypes = useMemo(() => {
        const types = new Set(historyAlerts.map(alert => alert.type.replace(/\s\(.+\)/, '')));
        return Array.from(types);
    }, [historyAlerts]);

    /**
     * Memoized function to filter the alerts based on the currently applied filters.
     * This runs only when the alerts list or filters object changes.
     */
    const filteredDisplayAlerts = useMemo(() => {
        return historyAlerts.filter(alert => {
            const baseType = alert.type.replace(/\s\(.+\)/, '');
            const statusMatch = filters.status.length === 0 || filters.status.includes(alert.status);
            const severityMatch = filters.severity.length === 0 || filters.severity.includes(alert.severity);
            const typeMatch = filters.type.length === 0 || filters.type.some(t => baseType.toLowerCase().includes(t.toLowerCase()));
            const actionMatch = filters.action.length === 0 ||
                (filters.action.includes('Acknowledged') && alert.acknowledged === true) ||
                (filters.action.includes('Unacknowledged') && (alert.acknowledged === false || alert.acknowledged === undefined));
            const alertDate = new Date(alert.dateTime);
            const startDate = filters.startDate ? new Date(filters.startDate) : null;
            const endDate = filters.endDate ? new Date(filters.endDate) : null;
            if (startDate) { startDate.setHours(0, 0, 0, 0); }
            if (endDate) { endDate.setHours(23, 59, 59, 999); }
            const dateMatch = (!startDate || alertDate >= startDate) && (!endDate || alertDate <= endDate);
            
            return statusMatch && severityMatch && typeMatch && actionMatch && dateMatch;
        }).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
    }, [historyAlerts, filters]);

    // Effect to copy filters to draft when panel opens
    useEffect(() => { if (isFilterOpen) { setDraftFilters(filters); } }, [isFilterOpen, filters]);

    // Effect to handle clicking outside of dropdowns/panels to close them
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterPanelRef.current && !filterPanelRef.current.contains(event.target) && !event.target.closest(`.${styles['icon-button']}`)) { setIsFilterOpen(false); }
            if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) { setIsTypeDropdownOpen(false); }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    /**
     * Handles the timeout for the "Undo" banner.
     * If the timer completes without the user clicking "Undo", it triggers
     * a permanent deletion of the alerts.
     */
    useEffect(() => {
        if (showUndoToast) {
            // Set a 10-second timer
            undoTimerRef.current = setTimeout(() => {
                // If the timer finishes and undo was NOT clicked
                if (!wasUndoClicked.current) {
                    console.log('Undo timeout. Permanently deleting alerts.');
                    // Call the permanent delete function if it exists
                    if (onPermanentDeleteAlerts && lastDeleted.current.length > 0) {
                        const idsToPermanentlyDelete = new Set(lastDeleted.current.map(a => a._id));
                        onPermanentDeleteAlerts(idsToPermanentlyDelete);
                    }
                }
                // Hide the undo bar and clear temp data regardless
                setShowUndoToast(false);
                lastDeleted.current = [];
            }, 10000); // 10-second timer
        }
        
        // Cleanup function to clear the timer
        return () => {
            if (undoTimerRef.current) {
                clearTimeout(undoTimerRef.current);
            }
        };
    }, [showUndoToast, onPermanentDeleteAlerts]);

    // --- Delete Functionality Handlers ---

    /** Toggles the main delete mode on or off */
    const handleToggleDeleteMode = () => {
        setDeleteMode(prev => (prev === 'off' ? 'all' : 'off'));
        setSelectedToDelete([]); // Reset selection when toggling
    };

    /** Handles selection/deselection of a single alert checkbox */
    const handleCheckboxChange = (alertId) => {
        const newSelection = new Set(selectedToDelete);
        if (newSelection.has(alertId)) {
            newSelection.delete(alertId);
        } else {
            newSelection.add(alertId);
        }
        setSelectedToDelete(Array.from(newSelection));
    };

    /** Handles the "Select All" checkbox in the table header */
    const handleSelectAll = (e) => {
        if (e.target.checked) {
           setSelectedToDelete(filteredDisplayAlerts.map(alert => alert._id));
        } else {
            setSelectedToDelete([]);
        }
    };
    
    /** Opens the confirmation modal before deleting */
    const handleDeleteClick = () => {
        if ((deleteMode === 'all' && filteredDisplayAlerts.length > 0) || (deleteMode === 'select' && selectedToDelete.length > 0)) {
            setShowConfirmModal(true);
        }
    };

    /**
     * Confirms the deletion, calls the parent function, and shows
     * the appropriate success/error toast AND the undo banner.
     */
    const handleConfirmDelete = () => {
        const idsToDelete = new Set(
            deleteMode === 'all' 
                ? filteredDisplayAlerts.map(a => a._id) 
                : selectedToDelete
        );
        
        lastDeleted.current = historyAlerts.filter(a => idsToDelete.has(a._id));
        
        try {
            // Call the delete function passed from props
            onDeleteHistoryAlerts(idsToDelete);
            
            // Show the slide-in success toast
            setToast({
                id: Date.now(),
                message: `${lastDeleted.current.length} alert(s) moved to trash.`,
                type: 'success'
            });

            // Show the main "Undo" banner
            setShowUndoToast(true); 
            wasUndoClicked.current = false; // Reset undo flag

        } catch (error) {
            // Show a slide-in error toast if deletion fails
            console.error("Failed to delete alerts:", error);
            setToast({
                id: Date.now(),
                message: 'An error occurred while deleting alerts.',
                type: 'error'
            });
        }

        // Reset the UI
        setShowConfirmModal(false);
        setDeleteMode('off');
        setSelectedToDelete([]);
    };

    /**
     * Handles the "Undo" button click from the main banner.
     * Restores the alerts and shows a slide-in success/error toast.
     */
    const handleUndo = () => {
        if (lastDeleted.current.length > 0) {
            try {
                onRestoreHistoryAlerts(lastDeleted.current);

                // Show slide-in success toast
                setToast({
                    id: Date.now(),
                    message: 'Deletion undone. Alerts have been restored.',
                    type: 'success'
                });

            } catch (error) {
                // Show slide-in error toast
                console.error("Failed to restore alerts:", error);
                setToast({
                    id: Date.now(),
                    message: 'An error occurred while restoring alerts.',
                    type: 'error'
                });
            }
        }
        
        // Hide the main undo banner and clear temp data
        setShowUndoToast(false);
        lastDeleted.current = [];
        if (undoTimerRef.current) {
            clearTimeout(undoTimerRef.current);
        }
        wasUndoClicked.current = true; // Set flag to prevent permanent deletion
    };

    // --- Filter Handlers ---
    const handlePillSelect = (filterType, value) => { setDraftFilters(prev => ({ ...prev, [filterType]: prev[filterType].includes(value) ? prev[filterType].filter(v => v !== value) : [...prev[filterType], value] })); };
    const handleDateChange = (e) => { setDraftFilters(prev => ({ ...prev, [e.target.name]: e.target.value })); };
    const handleTypeSelect = (type) => { if (!draftFilters.type.includes(type)) { setDraftFilters(prev => ({ ...prev, type: [...prev.type, type] })); } setTypeSearchTerm(''); setIsTypeDropdownOpen(false); };
    const removeSelectedType = (typeToRemove) => { setDraftFilters(prev => ({ ...prev, type: prev.type.filter(t => t !== typeToRemove) })); };
    const applyFilters = () => { setFilters(draftFilters); setIsFilterOpen(false); };
    const clearFilters = () => { setDraftFilters({ status: [], severity: [], type: [], action: [], startDate: '', endDate: '' }); setTypeSearchTerm(''); };
    
    /** Utility function to get the CSS class for alert severity */
    const getSeverityClass = (severity) => {
        switch (severity.toLowerCase()) {
            case 'critical': return styles['severity-critical'];
            case 'warning': return styles['severity-warning'];
            default: return styles['severity-normal'];
        }
    };

    /** Toggles the expandable detail panel for an acknowledged alert */
    const handleRowClick = (alertId, hasAcknowledgement) => {
        // Only allow expanding if the alert has been acknowledged
        if (hasAcknowledgement) {
            setExpandedAlertId(prevId => (prevId === alertId ? null : alertId));
        }
    };

    return (
        <div className={styles['alerts-section']}>
            <div className={styles['section-header']}>
                <h3>Alerts History</h3>
                <div className={styles['header-controls']}>
                    {/* Conditionally render delete controls or normal controls */}
                    {deleteMode !== 'off' ? (
                        <div className={styles['delete-controls']}>
                            <div className={styles['delete-slider']}>
                                <button onClick={() => { setDeleteMode('all'); setSelectedToDelete([]); }} className={deleteMode === 'all' ? styles.active : ''}>Delete All Filtered</button>
                                <button onClick={() => setDeleteMode('select')} className={deleteMode === 'select' ? styles.active : ''}>Select to Delete</button>
                            </div>
                            <span>
                                {deleteMode === 'all' ? filteredDisplayAlerts.length : selectedToDelete.length} selected
                            </span>
                            <button className={styles['delete-button']} onClick={handleDeleteClick}>Delete</button>
                            <button className={styles['delete-cancel-button']} onClick={handleToggleDeleteMode}><X size={16} /></button>
                        </div>
                    ) : (
                        <>
                            <Trash2 className={styles['trash-icon']} size={18} onClick={handleToggleDeleteMode} />
                            <button onClick={() => setIsFilterOpen(o => !o)} className={styles['icon-button']}>
                                <ListFilter className={styles['filter-icon']} size={18} />
                            </button>
                        </>
                    )}
                    
                    {/* Filter Panel */}
                    {isFilterOpen && (
                        <div className={styles['filter-panel']} ref={filterPanelRef}>
                            <div className={styles['filter-header']}>
                                <h4>Filter Alerts</h4>
                                <button onClick={() => setIsFilterOpen(false)} className={styles['close-filter-btn']}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className={styles['filter-body']}>
                                <div className={styles['filter-row']}>
                                    <label className={styles['filter-label']}>Date Range</label>
                                    <div className={styles['filter-control']}>
                                        <div className={styles['date-range-group']}>
                                            <input type="date" name="startDate" value={draftFilters.startDate} onChange={handleDateChange} className={styles['date-input']} />
                                            <span>to</span>
                                            <input type="date" name="endDate" value={draftFilters.endDate} onChange={handleDateChange} className={styles['date-input']} />
                                        </div>
                                    </div>
                                </div>
                                <div className={styles['filter-row']}>
                                    <label className={styles['filter-label']}>Alert status list</label>
                                    <div className={styles['filter-control']}>
                                        <div className={styles['pill-group']}>
                                            {['Resolved', 'Escalated', 'Cleared', 'Expired'].map(status => (
                                                <button key={status} onClick={() => handlePillSelect('status', status)} className={`${styles['filter-pill']} ${draftFilters.status.includes(status) ? styles.selected : ''}`}>
                                                    {draftFilters.status.includes(status) && <Check size={14} />}
                                                    {status}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className={styles['filter-row']}>
                                    <label className={styles['filter-label']}>Alert action list</label>
                                    <div className={styles['filter-control']}>
                                        <div className={styles['pill-group']}>
                                            {['Acknowledged', 'Unacknowledged'].map(action => (
                                                <button key={action} onClick={() => handlePillSelect('action', action)} className={`${styles['filter-pill']} ${draftFilters.action.includes(action) ? styles.selected : ''}`}>
                                                    {draftFilters.action.includes(action) && <Check size={14} />}
                                                    {action}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className={styles['filter-row']}>
                                    <label className={styles['filter-label']}>Alert severity list</label>
                                    <div className={styles['filter-control']}>
                                        <div className={styles['pill-group']}>
                                            {['Critical', 'Warning', 'Normal'].map(severity => (
                                                <button key={severity} onClick={() => handlePillSelect('severity', severity)} className={`${styles['filter-pill']} ${draftFilters.severity.includes(severity) ? styles.selected : ''}`}>
                                                    {draftFilters.severity.includes(severity) && <Check size={14} />}
                                                    {severity}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className={styles['filter-row']} ref={typeDropdownRef}>
                                    <label className={styles['filter-label']}>Alert type list</label>
                                    <div className={styles['filter-control']}>
                                        <div className={styles['type-input-container']} onClick={() => document.getElementById('type-input-field').focus()}>
                                            {draftFilters.type.length === 0 && !typeSearchTerm && <span className={styles['type-placeholder']}>Any type</span>}
                                            {draftFilters.type.map(type => (
                                                <div key={type} className={styles['type-pill']}>
                                                    <span>{type}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); removeSelectedType(type); }}><X size={12}/></button>
                                                </div>
                                            ))}
                                            <input id="type-input-field" type="text" className={styles['type-input-field']} value={typeSearchTerm} onChange={(e) => setTypeSearchTerm(e.target.value)} onFocus={() => setIsTypeDropdownOpen(true)} />
                                        </div>
                                        {isTypeDropdownOpen && (
                                            <div className={styles['type-dropdown-list']}>
                                                {uniqueAlertTypes.filter(t => t.toLowerCase().includes(typeSearchTerm.toLowerCase()) && !draftFilters.type.includes(t)).map(type => (
                                                    <div key={type} className={styles['type-dropdown-item']} onClick={() => handleTypeSelect(type)}>{type}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className={styles['filter-footer']}>
                                <button className={styles['clear-btn']} onClick={clearFilters}>Reset</button>
                                <button className={styles['apply-btn']} onClick={applyFilters}>Update</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Virtualized Alert Table */}
            <div className={styles['alerts-table']}>
                {/* Table Header */}
                <div className={`${styles['alerts-header-row']} ${deleteMode === 'select' ? styles['select-delete-grid'] : ''}`}>
                    <div>Date/Time</div>
                    <div>Origin</div>
                    <div>Type</div>
                    <div>Severity</div>
                    <div>Status</div>
                    <div>Action</div>
                    {/* Checkbox column header, appears only in 'select' delete mode */}
                    {deleteMode === 'select' && (
                        <div className={styles['checkbox-cell-header']}>
                            <label className={styles['custom-checkbox-container']}>
                                <input 
                                    type="checkbox" 
                                    onChange={handleSelectAll} 
                                    checked={filteredDisplayAlerts.length > 0 && selectedToDelete.length === filteredDisplayAlerts.length}
                                    disabled={filteredDisplayAlerts.length === 0}
                                />
                                <span className={styles['checkmark']}></span>
                            </label>
                        </div>
                    )}
                </div>
                
                {/* Table Body (Virtualized) */}
                <div className={styles['alerts-body']}>
                    {historyAlerts.length > 0 ? (
                        filteredDisplayAlerts.length > 0 ? (
                            <Virtuoso
                                style={{ height: '352px' }}
                                data={filteredDisplayAlerts}
                                itemContent={(index, alert) => {
                                    const hasAcknowledgement = alert.acknowledged && alert.acknowledgedBy;
                                    const isExpanded = expandedAlertId === alert._id;
                                    const isSelected = selectedToDelete.includes(alert._id);

                                    return (
                                        <React.Fragment key={alert._id}>
                                            <div 
                                                className={`
                                                    ${styles['alerts-row']} 
                                                    ${deleteMode === 'select' ? styles['select-delete-grid'] : ''} 
                                                    ${hasAcknowledgement ? styles['clickable-row'] : ''} 
                                                    ${isSelected ? styles['selected-for-deletion'] : ''}
                                                `}
                                                onClick={() => handleRowClick(alert._id, hasAcknowledgement)}
                                            >
                                                <div data-label="Date/Time">{formatDateTime(alert.dateTime)}</div>
                                                <div data-label="Origin">{alert.originator}</div>
                                                <div data-label="Type">
                                                    {alert.type}
                                                    {alert.note && <div className={styles['alert-note']}>{alert.note}</div>}
                                                </div>
                                                <div data-label="Severity">
                                                    <span className={`${styles['severity-badge']} ${getSeverityClass(alert.severity)}`}>
                                                        {alert.severity}
                                                    </span>
                                                </div>
                                                <div data-label="Status">
                                                    <span className={styles['status-acknowledged']}>{alert.status}</span>
                                                </div>
                                                <div data-label="Action">
                                                    <span className={alert.acknowledged ? styles['action-acknowledged'] : styles['action-unacknowledged']}>
                                                        {alert.acknowledged ? 'Acknowledged' : 'Unacknowledged'}
                                                    </span>
                                                </div>
                                                
                                                {/* Checkbox cell, appears only in 'select' delete mode */}
                                                {deleteMode === 'select' && (
                                                    <div className={styles['checkbox-cell']}>
                                                        <label className={styles['custom-checkbox-container']}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isSelected} 
                                                                onClick={(e) => e.stopPropagation()} // Prevent row click
                                                                onChange={() => handleCheckboxChange(alert._id)} 
                                                            />
                                                            <span className={styles['checkmark']}></span>
                                                        </label>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Expandable panel for Acknowledgment Details */}
                                            {hasAcknowledgement && (
                                                <div className={`${styles['details-panel']} ${isExpanded ? styles['expanded'] : ''}`}>
                                                    <div className={styles['details-content']}>
                                                        <div className={styles['detail-item']}>
                                                            <User size={16} />
                                                            <span>Acknowledged by: <strong>{alert.acknowledgedBy.username}</strong></span>
                                                        </div>
                                                        <div className={styles['detail-item']}>
                                                            <Clock size={16} />
                                                            <span>On: {formatDateTime(alert.acknowledgedBy.timestamp)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </React.Fragment>
                                    );
                                }}
                            />
                        ) : (
                            <div className={styles['no-alerts']} style={{ gridColumn: '1 / -1' }}>
                                No historical alerts match the current filters.
                            </div>
                        )
                    ) : (
                        <div className={styles['no-alerts']} style={{ gridColumn: '1 / -1' }}>
                            No historical alert records.
                        </div>
                    )}
                </div>
            </div>
            
            {/* Confirmation Modal for Deletion */}
            {showConfirmModal && (
                <div className={styles['modal-backdrop']}>
                    <div className={styles['confirmation-modal']}>
                        <h4>Confirm Deletion</h4>
                        <p>Are you sure you want to delete these {deleteMode === 'all' ? filteredDisplayAlerts.length : selectedToDelete.length} alert records?</p>
                        <div className={styles['modal-actions']}>
                            <button onClick={() => setShowConfirmModal(false)} className={styles['button-secondary']}>Cancel</button>
                            <button onClick={handleConfirmDelete} className={styles['button-danger']}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* The main "Undo" banner that appears at the bottom */}
            <div className={`${styles['undo-toast']} ${showUndoToast ? styles.show : ''}`}>
                <span>{lastDeleted.current.length} alert(s) deleted.</span>
                <button onClick={handleUndo}><Undo size={16}/> Undo</button>
            </div>
            
            {/* Container for slide-in success/error toasts */}
            {toast && (
                <div className={styles.toastContainerWrapper}>
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

export default AlertsHistory;