import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Trash2, Download, ListFilter, X, Check, User, ChevronDown, Undo, Clock } from 'lucide-react';
import { formatDateTime } from '../../utils/formatDateTime';
import styles from '../../Styles/AlertsHistory.module.css';

// The component now accepts onDeleteHistoryAlerts and onRestoreHistoryAlerts
const AlertsHistory = ({ historyAlerts = [], onDeleteHistoryAlerts, onRestoreHistoryAlerts, assigneeList = [] }) => {
    // --- All existing filter state is unchanged ---
    const [filters, setFilters] = useState({
        status: [],
        severity: [],
        type: [],
        assignee: 'All',
        action: [],
    });
    const [draftFilters, setDraftFilters] = useState(filters);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [typeSearchTerm, setTypeSearchTerm] = useState('');
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
    
    // --- NEW: State for managing the delete UI structure ---
    const [deleteMode, setDeleteMode] = useState('off'); // 'off', 'all', 'select'
    const [selectedToDelete, setSelectedToDelete] = useState([]);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showUndoToast, setShowUndoToast] = useState(false);
    const lastDeleted = useRef([]); // Use a ref to hold the last deleted items for the undo action
    const undoTimerRef = useRef(null);

    // --- All existing refs and memos are unchanged ---
    const filterPanelRef = useRef(null);
    const typeDropdownRef = useRef(null);
    const assigneeDropdownRef = useRef(null);

    // --- NEW: State to manage which alert detail panel is open ---
    const [expandedAlertId, setExpandedAlertId] = useState(null);

    const uniqueAlertTypes = useMemo(() => {
        const types = new Set(historyAlerts.map(alert => alert.type.replace(/\s\(.+\)/, '')));
        return Array.from(types);
    }, [historyAlerts]);

    // ADDED: Create the assignees list for the dropdown, ensuring 'All' is always first.
    const assignees = useMemo(() => ['All', ...assigneeList], [assigneeList]);


    //Filter logics
    const filteredDisplayAlerts = useMemo(() => {
        return historyAlerts.filter(alert => {
            const baseType = alert.type.replace(/\s\(.+\)/, '');
            const statusMatch = filters.status.length === 0 || filters.status.includes(alert.status);
            const severityMatch = filters.severity.length === 0 || filters.severity.includes(alert.severity);
            const typeMatch = filters.type.length === 0 || filters.type.some(t => baseType.toLowerCase().includes(t.toLowerCase()));
            // MODIFIED: This logic now correctly checks the nested 'acknowledgedBy.name' property.
            const assigneeMatch = filters.assignee === 'All' || (alert.acknowledgedBy && alert.acknowledgedBy.name === filters.assignee);
            const actionMatch = filters.action.length === 0 ||
                (filters.action.includes('Acknowledged') && alert.acknowledged === true) ||
                (filters.action.includes('Unacknowledged') && (alert.acknowledged === false || alert.acknowledged === undefined));
            const alertDate = new Date(alert.dateTime);
            const startDate = filters.startDate ? new Date(filters.startDate) : null;
            const endDate = filters.endDate ? new Date(filters.endDate) : null;
            if (startDate) { startDate.setHours(0, 0, 0, 0); }
            if (endDate) { endDate.setHours(23, 59, 59, 999); }
            const dateMatch = (!startDate || alertDate >= startDate) && (!endDate || alertDate <= endDate);
            return statusMatch && severityMatch && typeMatch && assigneeMatch && actionMatch && dateMatch;
        }).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
    }, [historyAlerts, filters]);

    // --- All existing useEffects are unchanged ---
    useEffect(() => { if (isFilterOpen) { setDraftFilters(filters); } }, [isFilterOpen]);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterPanelRef.current && !filterPanelRef.current.contains(event.target) && !event.target.closest(`.${styles['icon-button']}`)) { setIsFilterOpen(false); }
            if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) { setIsTypeDropdownOpen(false); }
            if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target)) { setIsAssigneeDropdownOpen(false); }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- NEW: This useEffect handles the 10-second timer for the Undo toast ---
    useEffect(() => {
        if (showUndoToast) {
            undoTimerRef.current = setTimeout(() => {
                setShowUndoToast(false);
                lastDeleted.current = []; // Clear the undo buffer
            }, 10000);
        }
        return () => {
            if (undoTimerRef.current) {
                clearTimeout(undoTimerRef.current);
            }
        };
    }, [showUndoToast]);

    // --- NEW: Handlers for the entire delete functionality structure ---
    const handleToggleDeleteMode = () => {
        setDeleteMode(prev => (prev === 'off' ? 'all' : 'off'));
        setSelectedToDelete([]); // Reset selection when toggling
    };

    const handleCheckboxChange = (alertId) => {
        const newSelection = new Set(selectedToDelete);
        if (newSelection.has(alertId)) {
            newSelection.delete(alertId);
        } else {
            newSelection.add(alertId);
        }
        setSelectedToDelete(Array.from(newSelection));
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedToDelete(filteredDisplayAlerts.map(alert => alert.id));
        } else {
            setSelectedToDelete([]);
        }
    };
    
    const handleDeleteClick = () => {
        if ((deleteMode === 'all' && filteredDisplayAlerts.length > 0) || (deleteMode === 'select' && selectedToDelete.length > 0)) {
            setShowConfirmModal(true);
        }
    };

    const handleConfirmDelete = () => {
        const idsToDelete = deleteMode === 'all' ? new Set(filteredDisplayAlerts.map(a => a.id)) : new Set(selectedToDelete);
        const alertsBeingDeleted = historyAlerts.filter(a => idsToDelete.has(a.id));
        
        lastDeleted.current = alertsBeingDeleted; // Store the full objects for undo
        onDeleteHistoryAlerts(idsToDelete); // Call the function from App.jsx

        // Reset UI
        setShowConfirmModal(false);
        setDeleteMode('off');
        setSelectedToDelete([]);
        setShowUndoToast(true); // Show the undo toast
    };

    const handleUndo = () => {
        if (lastDeleted.current.length > 0) {
            // NOTE: The example used onRestore(lastDeleted.current), but your App.jsx is designed to restore from its own state.
            // Calling the handler without arguments is correct for your setup.
            onRestoreHistoryAlerts(); 
        }
        setShowUndoToast(false);
        lastDeleted.current = [];
        if (undoTimerRef.current) {
            clearTimeout(undoTimerRef.current);
        }
    };

    // --- All existing filter handlers are unchanged ---
    const handlePillSelect = (filterType, value) => { setDraftFilters(prev => ({ ...prev, [filterType]: prev[filterType].includes(value) ? prev[filterType].filter(v => v !== value) : [...prev[filterType], value] })); };
    const handleDateChange = (e) => { setDraftFilters(prev => ({ ...prev, [e.target.name]: e.target.value })); };
    const handleTypeSelect = (type) => { if (!draftFilters.type.includes(type)) { setDraftFilters(prev => ({ ...prev, type: [...prev.type, type] })); } setTypeSearchTerm(''); setIsTypeDropdownOpen(false); };
    const removeSelectedType = (typeToRemove) => { setDraftFilters(prev => ({ ...prev, type: prev.type.filter(t => t !== typeToRemove) })); };
    const handleAssigneeSelect = (assignee) => { setDraftFilters(prev => ({ ...prev, assignee })); setIsAssigneeDropdownOpen(false); };
    const applyFilters = () => { setFilters(draftFilters); setIsFilterOpen(false); };
    const clearFilters = () => { setDraftFilters({ status: [], severity: [], type: [], assignee: 'All', action: [], startDate: '', endDate: '' }); setTypeSearchTerm(''); };
    
    // --- All utility functions are unchanged ---
    const getSeverityClass = (severity) => {
        switch (severity.toLowerCase()) {
            case 'critical': return styles['severity-critical'];
            case 'warning': return styles['severity-warning'];
            default: return styles['severity-normal'];
        }
    };

     // --- NEW: Handler to toggle the expanded/collapsed state of a row ---
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
                    {/* --- Conditionally render delete controls or normal controls --- */}
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
                            <Download className={styles['download-icon']} size={18} />
                        </>
                    )}
                    
                    {isFilterOpen && (
                        // --- FIX: Restored the full filter panel JSX ---
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
                                    <label className={styles['filter-label']}>Alarm status list</label>
                                    <div className={styles['filter-control']}>
                                        <div className={styles['pill-group']}>
                                            {['Resolved', 'Escalated', 'Cleared'].map(status => (
                                                <button key={status} onClick={() => handlePillSelect('status', status)} className={`${styles['filter-pill']} ${draftFilters.status.includes(status) ? styles.selected : ''}`}>
                                                    {draftFilters.status.includes(status) && <Check size={14} />}
                                                    {status}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className={styles['filter-row']}>
                                    <label className={styles['filter-label']}>Alarm action list</label>
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
                                    <label className={styles['filter-label']}>Alarm severity list</label>
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
                                    <label className={styles['filter-label']}>Alarm type list</label>
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
                                <div className={styles['filter-row']} ref={assigneeDropdownRef}>
                                    <label className={styles['filter-label']}>Assignee</label>
                                    <div className={styles['filter-control']}>
                                        <div className={styles['custom-dropdown']} onClick={() => setIsAssigneeDropdownOpen(o => !o)}>
                                            <div className={styles['dropdown-header']}>
                                                <User size={16} />
                                                <span>{draftFilters.assignee}</span>
                                                <ChevronDown size={16} className={styles['dropdown-chevron']} />
                                            </div>
                                            {isAssigneeDropdownOpen && (
                                                <div className={styles['assignee-dropdown-list']}>
                                                    {assignees.map(name => (
                                                        <div 
                                                            key={name} 
                                                            className={styles['dropdown-item']} 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAssigneeSelect(name);
                                                            }}
                                                        >
                                                            {name}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
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

            <div className={styles['alerts-table']}>
                 <div className={`${styles['alerts-header-row']} ${deleteMode === 'select' ? styles['select-delete-grid'] : ''}`}>
                    <div>Date/Time</div>
                    <div>Origin</div>
                    <div>Type</div>
                    <div>Severity</div>
                    <div>Status</div>
                    <div>Action</div>
                    {deleteMode === 'select' && (
                        <div className={styles['checkbox-cell-header']}>
                            {/* --- MODIFIED: Replaced input with custom checkbox structure --- */}
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
                <div className={styles['alerts-body']}>
                    {historyAlerts.length > 0 ? (
                        filteredDisplayAlerts.length > 0 ? (
                            filteredDisplayAlerts.map(alert => {
                                // --- NEW: These constants help manage the new UI state ---
                                const hasAcknowledgement = alert.acknowledged && alert.acknowledgedBy;
                                const isExpanded = expandedAlertId === alert.id;

                                return (
                                    // --- MODIFIED: Use React.Fragment to group the row and its details panel ---
                                    <React.Fragment key={alert.id}>
                                        <div 
                                            // --- MODIFIED: Added class for row highlighting ---
                                            className={`${styles['alerts-row']} ${deleteMode === 'select' ? styles['select-delete-grid'] : ''} ${hasAcknowledgement ? styles['clickable-row'] : ''} ${selectedToDelete.includes(alert.id) ? styles['selected-for-deletion'] : ''}`}
                                            onClick={() => handleRowClick(alert.id, hasAcknowledgement)}
                                        >
                                            {/* --- MODIFIED: Added data-label attributes for responsiveness --- */}
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
                                            
                                            {/* --- MODIFIED: Replaced input with custom checkbox structure --- */}
                                            {deleteMode === 'select' && (
                                                <div className={styles['checkbox-cell']}>
                                                    <label className={styles['custom-checkbox-container']}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedToDelete.includes(alert.id)} 
                                                            onClick={(e) => e.stopPropagation()} 
                                                            onChange={() => handleCheckboxChange(alert.id)} 
                                                        />
                                                        <span className={styles['checkmark']}></span>
                                                    </label>
                                                </div>
                                            )}
                                        </div>

                                        {/* --- NEW: The slide-out details panel --- */}
                                        {hasAcknowledgement && (
                                            <div className={`${styles['details-panel']} ${isExpanded ? styles['expanded'] : ''}`}>
                                                <div className={styles['details-content']}>
                                                    <div className={styles['detail-item']}>
                                                        <User size={16} />
                                                        <span>Acknowledged by: <strong>{alert.acknowledgedBy.name}</strong></span>
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
                            })
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

            <div className={`${styles['undo-toast']} ${showUndoToast ? styles.show : ''}`}>
                <span>{lastDeleted.current.length} alert(s) deleted.</span>
                <button onClick={handleUndo}><Undo size={16}/> Undo</button>
            </div>
        </div>
    );
};

export default AlertsHistory;