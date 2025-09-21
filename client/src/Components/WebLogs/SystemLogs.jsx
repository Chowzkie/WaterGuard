import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Virtuoso } from 'react-virtuoso';
import Style from '../../Styles/LogsStyle/SystemLogs.module.css';
import { ListFilter, X, ChevronDown, Trash2, Undo, Check } from 'lucide-react';
import { PARAMETER_TO_COMPONENT_MAP } from '../../utils/logMaps';
import {formatDateTime} from '../../utils/formatDateTime'
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

function SystemLogs() {
    // --- STATE MANAGEMENT ---
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true)
    const [lastDeletedLogs, setLastDeletedLogs] = useState([]);

    useEffect(() => {
        const fetchSystemLogs = async() => {
            try{
                const response = await axios.get(`${API_BASE_URL}/logs/systemlogs`);
                setLogs(response.data.map(log => ({...log, id: log._id}))); // Update the logs state with the fetched data, adding a local 'id' field for keying.
            }catch(error){
                console.error("Error fetching system logs:", error);
            }finally{
                setLoading(false);
            }
        };
        fetchSystemLogs();
    },[]);

    const handleDeleteLogs = async (idsToDelete) => {
        const idsArray = Array.from(idsToDelete);

        try{
            // Store the full log objects of the items that will be deleted.
            const logsToRestore = logs.filter(log => idsArray.includes(log.id));
            setLastDeletedLogs(logsToRestore);

            const logsToKeep = logs.filter(log => !idsArray.includes(log.id));
            setLogs(logsToKeep);

            // Make a POST request to the backend with the array of IDs.
            await axios.post(`${API_BASE_URL}/logs/deleteSysLog`, { ids: idsArray });
        }catch(error){
            console.error("Error deleting logs:", error);
            // Revert the UI state if the API call fails.
            setLogs(prevLogs => [...prevLogs, ...lastDeletedLogs]);
            // Clear the undo state since the delete failed.
            setLastDeletedLogs([]);
        }
    }

    const handleRestoreLogs = async() => {
        if (lastDeletedLogs.length === 0) return;
        try {
            // Make a POST request to the backend to restore the logs.
            await axios.post(`${API_BASE_URL}/logs/restoreSysLog`, { logs: lastDeletedLogs });
            setLogs(prevLogs => [...prevLogs, ...lastDeletedLogs]); // Add the restored logs back to the main logs state.
            setLastDeletedLogs([]); // Clear the temporary restore state.
        } catch (error) {
            console.error("Error restoring logs:", error);
            const response = await axios.get(`${API_BASE_URL}/logs/systemlogs`); // Re-fetch all logs from the backend to ensure data consistency in case of failure.
            setLogs(response.data.map(log => ({ ...log, id: log._id })));
        }
    }

    return(
        <SystemLogsContent
            logs={logs}
            loading={loading}
            onDelete={handleDeleteLogs}
            onRestore={handleRestoreLogs}
        />
    )
}

function SystemLogsContent({logs, loading, onDelete, onRestore}){

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        component: [],
        event: [],
        deviceId: [],
    });

    const [draftFilters, setDraftFilters] = useState(filters);

    // UI state for filter panel and dropdowns
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [eventSearchTerm, setEventSearchTerm] = useState('');
    const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);
    const [deviceIdSearchTerm, setDeviceIdSearchTerm] = useState('');
    const [isDeviceIdDropdownOpen, setIsDeviceIdDropdownOpen] = useState(false);
    
    // State for the entire delete workflow
    const [deleteMode, setDeleteMode] = useState('off');
    const [selectedToDelete, setSelectedToDelete] = useState([]);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showUndoToast, setShowUndoToast] = useState(false);
    const [lastDeletedCount, setLastDeletedCount] = useState(0);

    // --- State for managing the draggable panel ---
    const [isDraggable, setIsDraggable] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    // --- FIX: Position now represents the translation offset ---
    const [position, setPosition] = useState({ x: 0, y: 0 });

    // --- REFS ---
    const filterPanelRef = useRef(null);
    const eventDropdownRef = useRef(null);
    const deviceIdDropdownRef = useRef(null);
    const undoTimerRef = useRef(null);
    // --- NEW: Ref to store the starting point of a drag ---
    const dragStartRef = useRef(null);

    // --- MEMOIZED VALUES ---
    const uniqueDeviceIds = useMemo(() => {
        const deviceIds = new Set(logs.map(log => log.deviceId));
        return Array.from(deviceIds).sort();
    }, [logs]);

    const componentTypes = ['Device', 'Valve Actuator', 'pH Sensor', 'TDS Sensor', 'Temp Sensor', 'Turbidity Sensor'];

    // Filters the logs based on the applied filter state.
    const filteredDisplayLogs = useMemo(() => {
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
                if (start && logDate < start) return false;
                if (end && logDate > end) return false;
                return true;
            });
        }
        
        // Apply component filter
        const { component } = filters;
        if (component.length > 0) {
            logsToFilter = logsToFilter.filter(log => {
                const logComponent = PARAMETER_TO_COMPONENT_MAP[log.component] || log.component;
                return component.includes(logComponent);
            });
        }
        
        // Apply event filter
        const { event } = filters;
        if (event.length > 0) {
            logsToFilter = logsToFilter.filter(log => event.includes(log.event));
        }

        // Apply device ID filter
        const { deviceId } = filters;
        if (deviceId.length > 0) {
            logsToFilter = logsToFilter.filter(log => deviceId.includes(log.deviceId));
        }

        return logsToFilter.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
    }, [logs, filters]);

    // --- useEffect to check screen size and enable/disable draggable mode ---
    useEffect(() => {
        const checkScreenSize = () => {
            const isDraggableRange = window.innerWidth > 768 && window.innerWidth <= 1400;
            setIsDraggable(isDraggableRange);
            // If screen is resized out of draggable range, reset the position
            if (!isDraggableRange) {
                setPosition({ x: 0, y: 0 });
            }
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);

        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    // --- useEffect to handle the dragging logic ---
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            setPosition({
                x: e.clientX - dragStartRef.current.x,
                y: e.clientY - dragStartRef.current.y,
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // --- LIFECYCLE EFFECTS ---
    useEffect(() => {
        if (isFilterOpen) {
            setDraftFilters(filters);
        }
    }, [isFilterOpen, filters]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterPanelRef.current && !filterPanelRef.current.contains(event.target) && !event.target.closest(`.${Style['menu']}`)) {
                setIsFilterOpen(false);
            }
            if (eventDropdownRef.current && !eventDropdownRef.current.contains(event.target)) {
                setIsEventDropdownOpen(false);
            }
            if (deviceIdDropdownRef.current && !deviceIdDropdownRef.current.contains(event.target)) {
                setIsDeviceIdDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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

     // --- MouseDown handler to initiate dragging ---
    const handleMouseDown = (e) => {
        if (!isDraggable || e.button !== 0) return;
        
        setIsDragging(true);
        // Record the starting mouse position relative to the current translation
        dragStartRef.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };
    
    // --- FIX: Function to handle closing the panel and resetting its position ---
    const handleCloseFilterPanel = () => {
        setIsFilterOpen(false);
        setPosition({ x: 0, y: 0 }); // Reset position on close
    };

    // --- EVENT HANDLERS ---
    
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
        if (undoTimerRef.current) {
            clearTimeout(undoTimerRef.current);
        }
        setShowUndoToast(false);
    };

    const handleDateChange = (e) => setDraftFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    
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

    // --- NEW: Handlers for the compact multi-select dropdowns ---
    const handleMultiSelect = (filterType, value) => {
        setDraftFilters(prev => {
            const newValues = new Set(prev[filterType]);
            if (!newValues.has(value)) {
                newValues.add(value);
            }
            return { ...prev, [filterType]: Array.from(newValues) };
        });
    };

    const removeMultiSelectItem = (filterType, value) => {
        setDraftFilters(prev => ({
            ...prev,
            [filterType]: prev[filterType].filter(item => item !== value)
        }));
    };

    const applyFilters = () => { setFilters(draftFilters); setIsFilterOpen(false); };
    const clearFilters = () => { 
        setDraftFilters({ startDate: '', endDate: '', component: [], event: [], deviceId: [] }); 
        setEventSearchTerm('');
        setDeviceIdSearchTerm('');
    };


    const getStatusStyle = (status) => {
        switch (status?.toLowerCase()) {
            case 'success': return Style.successStatus;
            case 'warning': return Style.warningStatus;
            case 'error': return Style.errorStatus;
            case 'info': return Style.infoStatus;
            default: return '';
        }
    };

    return (
        <div className={Style.container}>
            <div className={Style.tableTitle}>
                <p>System Logs</p>
                <div className={Style.icons}>
                    {deleteMode !== 'off' ? (
                        <div className={Style['delete-controls']}>
                            <div className={Style['delete-slider']}>
                                <button onClick={() => { setDeleteMode('all'); setSelectedToDelete([]); }} className={deleteMode === 'all' ? Style.active : ''}>Delete All Filtered</button>
                                <button onClick={() => setDeleteMode('select')} className={deleteMode === 'select' ? Style.active : ''}>Select to Delete</button>
                            </div>
                            <span>
                                {deleteMode === 'all' ? filteredDisplayLogs.length : selectedToDelete.length} selected
                            </span>
                            <button className={Style['delete-button']} onClick={handleDeleteClick} disabled={deleteMode === 'select' && selectedToDelete.length === 0}>Delete</button>
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
                        <div
                            ref={filterPanelRef}
                            className={Style['filter-panel']}
                            // --- FIX: Use CSS transform for smoother, more reliable dragging ---
                            style={isDraggable ? { 
                                transform: `translate(${position.x}px, ${position.y}px)`
                            } : {}}
                        >
                             <div
                                    className={`${Style['filter-header']} ${isDraggable ? Style['draggable-header'] : ''}`}
                                    onMouseDown={handleMouseDown}
                                >
                                <h4>Filter Logs</h4>
                                <button onClick={handleCloseFilterPanel} className={Style['close-filter-btn']}>
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

                                {/* Component Filter */}
                                <div className={Style['filter-row']}>
                                    <label className={Style['filter-label']}>Component</label>
                                    <div className={Style['filter-control']}>
                                        <div className={Style['pill-group']}>
                                            {componentTypes.map(component => (
                                                <button
                                                    key={component}
                                                    onClick={() => handlePillSelect('component', component)}
                                                    className={`${Style['filter-pill']} ${draftFilters.component.includes(component) ? Style.selected : ''}`}
                                                >
                                                    {draftFilters.component.includes(component) && <Check size={14} />}
                                                    {component}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* --- FIX: Device ID Filter using new compact dropdown style --- */}
                                <div className={Style['filter-row']} ref={deviceIdDropdownRef}>
                                    <label className={Style['filter-label']}>Device ID</label>
                                    <div className={Style['filter-control']}>
                                        <div className={Style['type-input-container']} onClick={() => document.getElementById('device-id-input').focus()}>
                                            {draftFilters.deviceId.length === 0 && !deviceIdSearchTerm && <span className={Style['type-placeholder']}>Any Device ID</span>}
                                            {draftFilters.deviceId.map(item => (
                                                <div key={item} className={Style['type-pill']}>
                                                    <span>{item}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); removeMultiSelectItem('deviceId', item); }}><X size={12}/></button>
                                                </div>
                                            ))}
                                            <input id="device-id-input" type="text" className={Style['type-input-field']} value={deviceIdSearchTerm} onChange={(e) => setDeviceIdSearchTerm(e.target.value)} onFocus={() => setIsDeviceIdDropdownOpen(true)} />
                                        </div>
                                        {isDeviceIdDropdownOpen && (
                                            <div className={Style['type-dropdown-list']}>
                                                {uniqueDeviceIds.filter(item => item.toLowerCase().includes(deviceIdSearchTerm.toLowerCase()) && !draftFilters.deviceId.includes(item)).map(item => (
                                                    <div key={item} className={Style['type-dropdown-item']} onClick={() => { handleMultiSelect('deviceId', item); setDeviceIdSearchTerm(''); }}>{item}</div>
                                                ))}
                                            </div>
                                        )}
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

{/* 1. The header is a separate element, so it remains fixed at the top. */}
            <div className={`${Style.tableHeader} ${deleteMode === 'select' ? Style['select-delete-grid'] : ''}`}>
                <div className={Style.headerItem}>Date & Time</div>
                <div className={Style.headerItem}>Device ID</div>
                <div className={Style.headerItem}>Component</div>
                <div className={Style.headerItem}>Details</div>
                <div className={Style.headerItem}>Status</div>
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

            {/* 2. This container uses flexbox to define the scrollable area's height. */}
            <div className={Style.tableBody}>
                {loading ? (
                    <div className={Style['loading-spinner']}>
                        <div className={Style['spinner']}></div>
                    </div>
                ) : filteredDisplayLogs.length > 0 ? (
                        <Virtuoso
                            style={{ height: '100%' }}
                            data={filteredDisplayLogs}
                            itemContent={(index, log) => (
                                <div className={`${Style.tableRow} ${deleteMode === 'select' ? Style['select-delete-grid'] : ''} ${selectedToDelete.includes(log.id) ? Style['selected-for-deletion'] : ''}`} key={log.id}>
                                    <div className={Style.tableCell} data-label="Date & Time">{formatDateTime(log.dateTime)}</div>
                                    <div className={Style.tableCell} data-label="Device ID">{log.deviceId}</div>
                                    <div className={Style.tableCell} data-label="Component">{PARAMETER_TO_COMPONENT_MAP[log.component] || log.component}</div>
                                    <div className={Style.tableCell} data-label="Details">{log.details}</div>
                                    <div className={`${Style.tableCell} ${getStatusStyle(log.stats)}`} data-label="Status">{log.stats}</div>
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
                            )}
                        />
                    ) : (
                        <div className={Style.noData}>
                            {logs.length === 0 ? "No system logs available." : "No system logs match the current filters."}
                        </div>
                    )  
                }
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

export default SystemLogs;