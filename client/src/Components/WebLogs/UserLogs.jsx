import React, { useState, useMemo, useEffect, useRef } from 'react';
import Style from '../../Styles/LogsStyle/UserLogs.module.css';
import { ListFilter, Download, X, ChevronDown, Trash2, Undo, Check } from 'lucide-react';

/**
 * UserLogs Component: Displays user activity logs with filtering and deletion capabilities.
 * @param {object[]} logs - An array of log objects to display.
 * @param {function} onDelete - A function passed from the parent to handle the deletion of logs.
 * @param {function} onRestore - A function passed from the parent to handle restoring deleted logs.
 */
function UserLogs({ logs, onDelete, onRestore }) {
    // --- STATE MANAGEMENT ---
    // State for the currently applied filters
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        category: [],
        username: [],
    });

    // State for filters being edited in the filter panel, but not yet applied
    const [draftFilters, setDraftFilters] = useState(filters);
    // State to control the visibility of the filter panel
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // State for the search term within the username dropdown
    const [usernameSearchTerm, setUsernameSearchTerm] = useState('');
    // State to control the visibility of the username dropdown
    const [isUsernameDropdownOpen, setIsUsernameDropdownOpen] = useState(false);

    // --- NEW: State for the entire delete workflow ---
    // Controls the delete UI. Can be 'off', 'all' (for deleting all filtered items), or 'select'
    const [deleteMode, setDeleteMode] = useState('off');
    // An array holding the IDs of the logs selected for deletion
    const [selectedToDelete, setSelectedToDelete] = useState([]);
    // State to control the visibility of the "Are you sure?" confirmation modal
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    // State to control the visibility of the "Undo" toast notification
    const [showUndoToast, setShowUndoToast] = useState(false);
    // --- FIX: State to store the count of the last deletion, ensuring the toast shows the correct number ---
    const [lastDeletedCount, setLastDeletedCount] = useState(0);

    // --- REFS ---
    // Refs to detect clicks outside of the filter panel and dropdowns to close them
    const filterPanelRef = useRef(null);
    const usernameDropdownRef = useRef(null);
    // Ref to manage the 10-second timer for the undo toast
    const undoTimerRef = useRef(null);

    // --- MEMOIZED VALUES (for performance) ---
    // Creates a sorted list of unique usernames for the filter dropdown.
    // This only recalculates when the main 'logs' prop changes.
    const uniqueUsernames = useMemo(() => {
        const usernames = new Set(logs.map(log => log.username));
        return Array.from(usernames).sort();
    }, [logs]);

    // --- BUG FIX: The filtering logic is rewritten to be more robust and explicit ---
    const filteredDisplayLogs = useMemo(() => {
        // Start with the full list of logs
        let logsToFilter = [...logs];

        // Apply date range filter
        const { startDate, endDate } = filters;
        if (startDate || endDate) {
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (start) start.setHours(0, 0, 0, 0);
            if (end) end.setHours(23, 59, 59, 999);

            logsToFilter = logsToFilter.filter(log => {
                const logDate = new Date(log.dateTime);
                // Exclude log if it's before the start date
                if (start && logDate < start) return false;
                // Exclude log if it's after the end date
                if (end && logDate > end) return false;
                // Otherwise, include it
                return true;
            });
        }

        // Apply username filter
        const { username } = filters;
        if (username.length > 0) {
            logsToFilter = logsToFilter.filter(log => username.includes(log.username));
        }

        // Apply category filter
        const { category } = filters;
        if (category.length > 0) {
            // This ensures that only logs whose 'type' is in the selected category array are kept.
            logsToFilter = logsToFilter.filter(log => log.type && category.includes(log.type));
        }

        // Finally, sort the remaining logs by date
        return logsToFilter.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
    }, [logs, filters]);


    // --- LIFECYCLE EFFECTS ---
    // Effect to sync draft filters with active filters when the panel is opened
    useEffect(() => {
        if (isFilterOpen) {
            setDraftFilters(filters);
        }
    }, [isFilterOpen, filters]);

    // Effect to handle clicks outside of pop-up elements to close them
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterPanelRef.current && !filterPanelRef.current.contains(event.target) && !event.target.closest(`.${Style['menu']}`)) {
                setIsFilterOpen(false);
            }
            if (usernameDropdownRef.current && !usernameDropdownRef.current.contains(event.target)) {
                setIsUsernameDropdownOpen(false);
                setUsernameSearchTerm('');
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- NEW: Effect to manage the 10-second timer for the Undo toast ---
    useEffect(() => {
        if (showUndoToast) {
            // Set a timer to hide the toast after 10 seconds
            undoTimerRef.current = setTimeout(() => {
                setShowUndoToast(false);
            }, 10000);
        }
        // Cleanup function to clear the timer if the component unmounts or toast is closed early
        return () => {
            if (undoTimerRef.current) {
                clearTimeout(undoTimerRef.current);
            }
        };
    }, [showUndoToast]);


    // --- EVENT HANDLERS ---

    // --- NEW: Handlers for the entire delete functionality ---

    // Toggles the delete mode UI on and off
    const handleToggleDeleteMode = () => {
        setDeleteMode(prev => (prev === 'off' ? 'all' : 'off')); // Default to 'all' mode when turning on
        setSelectedToDelete([]); // Always reset selection when toggling
    };

    // Handles checking or unchecking a single log's checkbox
    const handleCheckboxChange = (logId) => {
        const newSelection = new Set(selectedToDelete);
        if (newSelection.has(logId)) {
            newSelection.delete(logId);
        } else {
            newSelection.add(logId);
        }
        setSelectedToDelete(Array.from(newSelection));
    };

    // Handles the "select all" checkbox in the table header
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedToDelete(filteredDisplayLogs.map(log => log.id));
        } else {
            setSelectedToDelete([]);
        }
    };

    // Shows the confirmation modal when the main "Delete" button is clicked
    const handleDeleteClick = () => {
        const hasSelection = (deleteMode === 'all' && filteredDisplayLogs.length > 0) || (deleteMode === 'select' && selectedToDelete.length > 0);
        if (hasSelection) {
            setShowConfirmModal(true);
        }
    };

    // Called when the user confirms the deletion in the modal
    const handleConfirmDelete = () => {
        // Determine which IDs to delete based on the current mode
        const idsToDelete = deleteMode === 'all'
            ? new Set(filteredDisplayLogs.map(log => log.id))
            : new Set(selectedToDelete);

        // --- FIX: Store the count of deleted items *before* they are removed ---
        setLastDeletedCount(idsToDelete.size);
        // Call the parent handler to perform the deletion
        onDelete(idsToDelete);

        // Reset the UI and show the undo toast
        setShowConfirmModal(false);
        setDeleteMode('off');
        setSelectedToDelete([]);
        setShowUndoToast(true);
    };

    // Called when the "Undo" button is clicked on the toast
    const handleUndo = () => {
        onRestore(); // Call the parent handler to restore the logs
        setShowUndoToast(false); // Hide the toast
        // Clear the timer to prevent it from running again
        if (undoTimerRef.current) {
            clearTimeout(undoTimerRef.current);
        }
    };

    // --- Existing handlers for the filter functionality ---

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

    const handleUsernameSelect = (username) => {
        setDraftFilters(prev => {
            const currentUsers = new Set(prev.username);
            if (currentUsers.has(username)) {
                currentUsers.delete(username);
            } else {
                currentUsers.add(username);
            }
            return { ...prev, username: Array.from(currentUsers) };
        });
        setUsernameSearchTerm('');
    };
    const applyFilters = () => { setFilters(draftFilters); setIsFilterOpen(false); };
    const clearFilters = () => { setDraftFilters({ startDate: '', endDate: '', category: [], username: [] }); setUsernameSearchTerm(''); };

    // --- HELPER FUNCTIONS ---

    // --- FIX: A more robust function to format date/time strings ---
    const formatDateTime = (dateTimeStr) => {
        if (!dateTimeStr) return '–'; // Return a dash if the date string is missing
        const date = new Date(dateTimeStr);
        if (isNaN(date.getTime())) return 'Invalid Date'; // Handle invalid date values
        const options = { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
        return date.toLocaleString('en-US', options);
    };

    /**
     * --- NEW: Helper function to get the CSS class for a log type ---
     * This function returns a specific CSS class based on the log's type,
     * allowing for unique color-coding for each category.
     * @param {string} logType - The 'type' property of the log object.
     * @returns {string} The corresponding CSS class name from the module.
     */
    const getTypeStyle = (logType) => {
        switch (logType) {
            case 'Configuration': return Style['type-configuration'];
            case 'Admin': return Style['type-admin'];
            case 'Account': return Style['type-account'];
            case 'Deletion': return Style['type-deletion'];
            case 'Acknowledgement': return Style['type-acknowledgement'];
            case 'Valve': return Style['type-valve'];
            default: return ''; // Return no specific class if type is unknown
        }
    };

    return (
        <div className={Style['container']}>
            <div className={Style['tableTitle']}>
                <p>User Logs</p>
                <div className={Style['icons']}>
                    {/* Conditionally render either the normal icons or the delete mode UI */}
                    {deleteMode !== 'off' ? (
                        <div className={Style['delete-controls']}>
                            {/* The slider to switch between deleting all filtered or selecting specific ones */}
                            <div className={Style['delete-slider']}>
                                <button onClick={() => { setDeleteMode('all'); setSelectedToDelete([]); }} className={deleteMode === 'all' ? Style.active : ''}>Delete All Filtered</button>
                                <button onClick={() => setDeleteMode('select')} className={deleteMode === 'select' ? Style.active : ''}>Select to Delete</button>
                            </div>
                            {/* Text showing the number of selected logs */}
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
                            <div className={Style['download']}>
                                <Download size={18}/>
                            </div>
                        </>
                    )}
                    {/* --- FIX: The full filter panel JSX is now included --- */}
                    {isFilterOpen && (
                        <div className={Style['filter-panel']} ref={filterPanelRef}>
                            <div className={Style['filter-header']}>
                                <h4>Filter Logs</h4>
                                <button onClick={() => setIsFilterOpen(false)} className={Style['close-filter-btn']}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className={Style['filter-body']}>
                                {/* Date Range Filter */}
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

                                {/* Category Filter */}
                                <div className={Style['filter-row']}>
                                    <label className={Style['filter-label']}>Category</label>
                                    <div className={Style['filter-control']}>
                                        <div className={Style['pill-group']}>
                                            {['Configuration', 'Admin', 'Account', 'Deletion', 'Acknowledgement', 'Valve'].map(category => (
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

                                {/* Username Filter */}
                                <div className={Style['filter-row']} ref={usernameDropdownRef}>
                                    <label className={Style['filter-label']}>Username</label>
                                    <div className={Style['filter-control']}>
                                        <div className={`${Style['custom-dropdown']} ${isUsernameDropdownOpen ? Style['open'] : ''}`} onClick={() => setIsUsernameDropdownOpen(o => !o)}>
                                            <div className={Style['dropdown-header']}>
                                                {draftFilters.username.length > 0 ? (
                                                    <div className={Style['selected-pills-summary']}>
                                                        {draftFilters.username.map(username => (
                                                            <span key={username} className={Style['summary-pill']}>{username}</span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span>Any Username</span>
                                                )}
                                                <ChevronDown size={16} className={Style['dropdown-chevron']} />
                                            </div>
                                            {isUsernameDropdownOpen && (
                                                <div className={Style['type-dropdown-list']}>
                                                    <div className={Style['search-input-wrapper']}>
                                                        <input
                                                            type="text"
                                                            placeholder="Search Usernames..."
                                                            className={Style['dropdown-search-input']}
                                                            value={usernameSearchTerm}
                                                            onChange={(e) => { e.stopPropagation(); setUsernameSearchTerm(e.target.value); }}
                                                            onClick={(e) => e.stopPropagation()}
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div className={Style['selected-pills-display']}>
                                                        {draftFilters.username.length > 0 && <div className={Style['selected-header']}>Selected:</div>}
                                                        {draftFilters.username.map(username => (
                                                            <div key={`selected-${username}`} className={Style['type-pill-dropdown']}>
                                                                <span>{username}</span>
                                                                <button onClick={(e) => { e.stopPropagation(); handleUsernameSelect(username); }}><X size={12}/></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {draftFilters.username.length > 0 && <hr className={Style['dropdown-separator']} />}
                                                    <div className={Style['available-items-scroll']}>
                                                        {uniqueUsernames
                                                            .filter(username =>
                                                                username.toLowerCase().includes(usernameSearchTerm.toLowerCase()) &&
                                                                !draftFilters.username.includes(username)
                                                            )
                                                            .map(username => (
                                                                <div key={username} className={Style['type-dropdown-item']} onClick={(e) => { e.stopPropagation(); handleUsernameSelect(username); }}>
                                                                    {username}
                                                                </div>
                                                            ))}
                                                        {uniqueUsernames.filter(username => username.toLowerCase().includes(usernameSearchTerm.toLowerCase()) && !draftFilters.username.includes(username)).length === 0 && (
                                                            <div className={Style['no-results']}>No matching Usernames</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className={Style['filter-footer']}>
                                {/* This onClick handler fixes the "unused function" issue */}
                                <button className={Style['clear-btn']} onClick={clearFilters}>Reset</button>
                                <button className={Style['apply-btn']} onClick={applyFilters}>Apply</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* The table header now conditionally adds a class to change its grid layout */}
            <div className={`${Style['tableHeader']} ${deleteMode === 'select' ? Style['select-delete-grid'] : ''}`}>
                <div className={Style['headerItem']}>Date & Time</div>
                <div className={Style['headerItem']}>Username</div>
                <div className={Style['headerItem']}>Fullname</div>
                <div className={Style['headerItem']}>Type</div>
                <div className={Style['headerItem']}>Action</div>
                {/* The "select all" checkbox is only rendered in select mode */}
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
            
            <div className={Style['tableBody']}>
                {filteredDisplayLogs.length > 0 ? (
                    filteredDisplayLogs.map((log) => (
                        <div 
                            className={`${Style['tableRow']} ${deleteMode === 'select' ? Style['select-delete-grid'] : ''} ${selectedToDelete.includes(log.id) ? Style['selected-for-deletion'] : ''}`} 
                            key={log.id}
                        >
                            <div className={Style['tableCell']} data-label="Date & Time">{formatDateTime(log.dateTime)}</div>
                            <div className={Style['tableCell']} data-label="Username">{log.username}</div>
                            <div className={Style['tableCell']} data-label="Fullname">{log.fullname}</div>
                            {/* --- MODIFIED: The 'Type' cell now uses a styled span for color-coding --- */}
                            <div className={Style['tableCell']} data-label="Type">
                                <span className={`${Style['type-badge']} ${getTypeStyle(log.type)}`}>
                                    {log.type}
                                </span>
                            </div>
                            <div className={Style['tableCell']} data-label="Action">{log.action}</div>
                            {/* Each row gets a checkbox, but only in select mode */}
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
                    ))
                ) : (
                    <div className={Style['noData']}>
                        {logs.length === 0 ? "No user logs available." : "No user logs match the current filters."}
                    </div>
                )}
            </div>

            {/* The confirmation modal, shown when needed */}
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
            {/* The undo toast, shown after a deletion */}
            <div className={`${Style['undo-toast']} ${showUndoToast ? Style.show : ''}`}>
                {/* --- FIX: This now uses the dedicated state for an accurate count --- */}
                <span>{lastDeletedCount} log(s) deleted.</span>
                <button onClick={handleUndo}><Undo size={16}/> Undo</button>
            </div>
        </div>
    );
}

export default UserLogs;