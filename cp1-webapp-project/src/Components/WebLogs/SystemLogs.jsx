import React, { useState, useMemo, useEffect, useRef } from 'react';
import Style from '../../Styles/LogsStyle/SystemLogs.module.css';
import { ListFilter, Download, X, ChevronDown } from 'lucide-react';

function SystemLogs({ logs }) {
    // State for applied filters
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        deviceId: [], // deviceId supports multi-select
    });

    // State for filters being edited in the filter panel (draft state)
    const [draftFilters, setDraftFilters] = useState(filters);

    // UI state for filter panel and dropdowns
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [deviceIdSearchTerm, setDeviceIdSearchTerm] = useState('');
    const [isDeviceIdDropdownOpen, setIsDeviceIdDropdownOpen] = useState(false);

    // Refs for detecting clicks outside of elements
    const filterPanelRef = useRef(null);
    const deviceIdDropdownRef = useRef(null);

    // Memoize unique device IDs to prevent recalculation on every render
    const uniqueDeviceIds = useMemo(() => {
        const ids = new Set(logs.map(log => log.deviceId));
        return Array.from(ids).sort(); // Sort alphabetically for better UX
    }, [logs]);

    // Memoize the filtered and sorted logs for display
    const filteredDisplayLogs = useMemo(() => {
        return logs.filter(log => {
            const logDate = new Date(log.dateTime);
            const startDate = filters.startDate ? new Date(filters.startDate) : null;
            const endDate = filters.endDate ? new Date(filters.endDate) : null;

            // Normalize dates to ensure the entire day is included in the range
            if (startDate) { startDate.setHours(0, 0, 0, 0); }
            if (endDate) { endDate.setHours(23, 59, 59, 999); }

            // Check if the log date falls within the selected range
            const dateMatch = (!startDate || logDate >= startDate) && (!endDate || logDate <= endDate);

            // Check if the log's deviceId is in the selected list (or if no devices are selected)
            const deviceIdMatch = filters.deviceId.length === 0 || filters.deviceId.includes(log.deviceId);

            return dateMatch && deviceIdMatch;
        }).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime)); // Sort logs by most recent first
    }, [logs, filters]); // Re-run only when logs or applied filters change

    // Effect to sync draft filters when the filter panel is opened
    useEffect(() => {
        if (isFilterOpen) {
            setDraftFilters(filters);
        }
    }, [isFilterOpen, filters]);

    // Effect for handling clicks outside the filter panel and device ID dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Close filter panel if the click is outside
            if (filterPanelRef.current && !filterPanelRef.current.contains(event.target) && !event.target.closest(`.${Style['menu']}`)) {
                setIsFilterOpen(false);
            }
            // Close device ID dropdown if the click is outside
            if (deviceIdDropdownRef.current && !deviceIdDropdownRef.current.contains(event.target)) {
                setIsDeviceIdDropdownOpen(false);
                setDeviceIdSearchTerm('');
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handler for updating date filters in the draft state
    const handleDateChange = (e) => {
        setDraftFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Handler for selecting/deselecting a device ID
    const handleDeviceIdSelect = (deviceId) => {
        setDraftFilters(prev => {
            const currentDevices = new Set(prev.deviceId);
            if (currentDevices.has(deviceId)) {
                currentDevices.delete(deviceId);
            } else {
                currentDevices.add(deviceId);
            }
            return { ...prev, deviceId: Array.from(currentDevices) };
        });
        setDeviceIdSearchTerm(''); // Clear search after selection for better UX
    };
    
    // Handler to apply the draft filters to the main view
    const applyFilters = () => {
        setFilters(draftFilters);
        setIsFilterOpen(false);
    };

    // Handler to reset all filters in the draft state
    const clearFilters = () => {
        setDraftFilters({ startDate: '', endDate: '', deviceId: [] });
        setDeviceIdSearchTerm('');
    };

    // Helper function to format date/time strings for display
    const formatDateTime = (dateTimeStr) => {
        const date = new Date(dateTimeStr);
        if (isNaN(date)) return dateTimeStr; // Return original string if invalid
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
        return date.toLocaleString('en-US', options);
    };

    return (
        <div className={Style['container']}>
            <div className={Style['tableTitle']}>
                <p>System Logs</p>
                <div className={Style['icons']}>
                    <div className={Style['menu']} onClick={() => setIsFilterOpen(o => !o)}>
                        <ListFilter size={16}/>
                    </div>
                    <div className={Style['download']}>
                        <Download size={16}/>
                    </div>

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

                                {/* Device ID Filter */}
                                <div className={Style['filter-row']} ref={deviceIdDropdownRef}>
                                    <label className={Style['filter-label']}>Device ID</label>
                                    <div className={Style['filter-control']}>
                                        <div className={`${Style['custom-dropdown']} ${isDeviceIdDropdownOpen ? Style['open'] : ''}`} onClick={() => setIsDeviceIdDropdownOpen(o => !o)}>
                                            <div className={Style['dropdown-header']}>
                                                {draftFilters.deviceId.length > 0 ? (
                                                    <div className={Style['selected-pills-summary']}>
                                                        {draftFilters.deviceId.map(id => (
                                                            <span key={id} className={Style['summary-pill']}>{id}</span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span>Any Device ID</span>
                                                )}
                                                <ChevronDown size={16} className={Style['dropdown-chevron']} />
                                            </div>
                                            {isDeviceIdDropdownOpen && (
                                                <div className={Style['type-dropdown-list']}>
                                                    <div className={Style['search-input-wrapper']}>
                                                        <input
                                                            type="text"
                                                            placeholder="Search Device IDs..."
                                                            className={Style['dropdown-search-input']}
                                                            value={deviceIdSearchTerm}
                                                            onChange={(e) => { e.stopPropagation(); setDeviceIdSearchTerm(e.target.value); }}
                                                            onClick={(e) => e.stopPropagation()} // Prevent dropdown from closing
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div className={Style['selected-pills-display']}>
                                                        {draftFilters.deviceId.length > 0 && <div className={Style['selected-header']}>Selected:</div>}
                                                        {draftFilters.deviceId.map(id => (
                                                            <div key={`selected-${id}`} className={Style['type-pill-dropdown']}>
                                                                <span>{id}</span>
                                                                <button onClick={(e) => { e.stopPropagation(); handleDeviceIdSelect(id); }}><X size={12}/></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {draftFilters.deviceId.length > 0 && <hr className={Style['dropdown-separator']} />}
                                                    <div className={Style['available-items-scroll']}>
                                                        {uniqueDeviceIds
                                                            .filter(id =>
                                                                id.toLowerCase().includes(deviceIdSearchTerm.toLowerCase()) &&
                                                                !draftFilters.deviceId.includes(id)
                                                            )
                                                            .map(id => (
                                                                <div key={id} className={Style['type-dropdown-item']} onClick={(e) => { e.stopPropagation(); handleDeviceIdSelect(id); }}>
                                                                    {id}
                                                                </div>
                                                            ))}
                                                        {uniqueDeviceIds.filter(id => id.toLowerCase().includes(deviceIdSearchTerm.toLowerCase()) && !draftFilters.deviceId.includes(id)).length === 0 && (
                                                            <div className={Style['no-results']}>No matching Device IDs</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
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

            {/* Table Header: Remains fixed at the top */}
            <div className={Style['tableHeader']}>
                <div className={Style['headerItem']}>Date & Time</div>
                <div className={Style['headerItem']}>Device ID</div>
                <div className={Style['headerItem']}>Event</div>
                <div className={Style['headerItem']}>Location</div>
                <div className={Style['headerItem']}>Status</div>
            </div>

            {/* A dedicated 'tableBody' container that is scrollable */}
            <div className={Style['tableBody']}>
                {filteredDisplayLogs.length > 0 ? (
                    filteredDisplayLogs.map((log) => (
                        <div className={Style['tableRow']} key={log.id}>
                            <div className={Style['tableCell']} data-label="Date & Time">{formatDateTime(log.dateTime)}</div>
                            <div className={Style['tableCell']} data-label="Device ID">{log.deviceId}</div>
                            <div className={Style['tableCell']} data-label="Event">{log.event}</div>
                            <div className={Style['tableCell']} data-label="Location">{log.location}</div>
                            <div className={`${Style['tableCell']} ${
                                log.status === 'Warning' ? Style['warningStatus'] :
                                log.status === 'Success' ? Style['successStatus'] :
                                log.status === 'Error' ? Style['errorStatus'] :
                                log.status === 'Info' ? Style['infoStatus'] : ''
                            }`} data-label="Status">
                                {log.status}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className={Style['noData']}>
                        {logs.length === 0 
                            ? "No system logs available." 
                            : "No system logs match the current filters."
                        }
                    </div>
                )}
            </div>
        </div>
    );
}

export default SystemLogs;