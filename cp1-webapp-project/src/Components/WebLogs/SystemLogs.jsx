import React, { useState, useMemo, useEffect, useRef } from 'react';
import Style from '../../Styles/LogsStyle/SystemLogs.module.css';
import { ListFilter, Download, X, ChevronDown } from 'lucide-react';

function SystemLogs({ logs }) {
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        deviceId: [], // deviceId will be multi-select
    });
    const [draftFilters, setDraftFilters] = useState(filters);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [deviceIdSearchTerm, setDeviceIdSearchTerm] = useState('');
    const [isDeviceIdDropdownOpen, setIsDeviceIdDropdownOpen] = useState(false); // Controls the dropdown visibility

    const filterPanelRef = useRef(null);
    const deviceIdDropdownRef = useRef(null); // Ref for the deviceId dropdown container

    // Get unique device IDs from logs for the dropdown
    const uniqueDeviceIds = useMemo(() => {
        const ids = new Set(logs.map(log => log.deviceId));
        return Array.from(ids).sort(); // Sort them alphabetically for better UX
    }, [logs]);

    // Filtered logs based on current filters
    const filteredDisplayLogs = useMemo(() => {
        return logs.filter(log => {
            const logDate = new Date(log.dateTime);
            const startDate = filters.startDate ? new Date(filters.startDate) : null; // Use 'filters' for display, not 'draftFilters'
            const endDate = filters.endDate ? new Date(filters.endDate) : null;   // Use 'filters' for display, not 'draftFilters'

            // Normalize dates to compare entire day
            if (startDate) { startDate.setHours(0, 0, 0, 0); }
            if (endDate) { endDate.setHours(23, 59, 59, 999); }

            const dateMatch = (!startDate || logDate >= startDate) && (!endDate || logDate <= endDate);

            const deviceIdMatch = filters.deviceId.length === 0 ||
                                  filters.deviceId.includes(log.deviceId); // Use 'filters' here

            return dateMatch && deviceIdMatch;
        }).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime)); // Sort by date/time descending
    }, [logs, filters]); // Depend on 'filters' here

    // Handlers for filter panel UI
    useEffect(() => {
        // When filter panel opens, sync draft filters with current active filters
        if (isFilterOpen) {
            setDraftFilters(filters);
        }
    }, [isFilterOpen, filters]);

    // Click outside handler for filter panel and device ID dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Close filter panel if click is outside and not on the filter icon itself
            if (filterPanelRef.current && !filterPanelRef.current.contains(event.target) && !event.target.closest(`.${Style['menu']}`)) {
                setIsFilterOpen(false);
            }
            // Close device ID dropdown if click is outside its container
            if (deviceIdDropdownRef.current && !deviceIdDropdownRef.current.contains(event.target)) {
                setIsDeviceIdDropdownOpen(false);
                setDeviceIdSearchTerm(''); // Clear search term when dropdown closes
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filter value change handlers for draftFilters
    const handleDateChange = (e) => {
        setDraftFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

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
        setDeviceIdSearchTerm(''); // Clear search term after selection
        // No need to close dropdown immediately after selection for multi-select
    };

    const removeSelectedDeviceId = (idToRemove) => {
        setDraftFilters(prev => ({
            ...prev,
            deviceId: prev.deviceId.filter(id => id !== idToRemove)
        }));
    };

    // Apply and Clear filters
    const applyFilters = () => {
        setFilters(draftFilters); // Apply draft filters to actual filters
        setIsFilterOpen(false); // Close filter panel
    };

    const clearFilters = () => {
        setDraftFilters({ startDate: '', endDate: '', deviceId: [] });
        setDeviceIdSearchTerm('');
    };

    // Helper to format date/time for display
    const formatDateTime = (dateTimeStr) => {
        const date = new Date(dateTimeStr);
        if (isNaN(date)) return dateTimeStr;
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
        return date.toLocaleString('en-US', options);
    };

    return (
        <div className={Style['container']}>
            <div className={Style['tableTitle']}>
                <p>System Logs</p>
                <div className={Style['icons']}>
                    <div className={Style['menu']} onClick={() => setIsFilterOpen(o => !o)}>
                        <ListFilter />
                    </div>
                    <div className={Style['download']}>
                        <Download />
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
                                            <input
                                                type="date"
                                                name="startDate"
                                                value={draftFilters.startDate}
                                                onChange={handleDateChange}
                                                className={Style['date-input']}
                                            />
                                            <span>to</span>
                                            <input
                                                type="date"
                                                name="endDate"
                                                value={draftFilters.endDate}
                                                onChange={handleDateChange}
                                                className={Style['date-input']}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Device ID Filter - Modified for dropdown behavior */}
                                <div className={Style['filter-row']} ref={deviceIdDropdownRef}>
                                    <label className={Style['filter-label']}>Device ID</label>
                                    <div className={Style['filter-control']}>
                                        <div className={Style['custom-dropdown']} onClick={() => setIsDeviceIdDropdownOpen(o => !o)}>
                                            <div className={Style['dropdown-header']}>
                                                {/* Display selected IDs or placeholder */}
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
                                                    {/* Search Input within the dropdown */}
                                                    <div className={Style['search-input-wrapper']}>
                                                        <input
                                                            type="text"
                                                            placeholder="Search Device IDs..."
                                                            className={Style['dropdown-search-input']}
                                                            value={deviceIdSearchTerm}
                                                            onChange={(e) => setDeviceIdSearchTerm(e.target.value)}
                                                            // Keep focus on input when dropdown is open
                                                            onFocus={(e) => e.target.select()}
                                                            autoFocus // Auto-focus when dropdown opens
                                                        />
                                                    </div>
                                                    <div className={Style['selected-pills-display']}>
                                                        {/* Display selected pills at the top of the dropdown */}
                                                        {draftFilters.deviceId.length > 0 && (
                                                            <div className={Style['selected-header']}>Selected:</div>
                                                        )}
                                                        {draftFilters.deviceId.map(id => (
                                                            <div key={`selected-${id}`} className={Style['type-pill-dropdown']}>
                                                                <span>{id}</span>
                                                                <button onClick={(e) => { e.stopPropagation(); handleDeviceIdSelect(id); }}><X size={12}/></button>
                                                            </div>
                                                        ))}
                                                        {draftFilters.deviceId.length > 0 && <hr className={Style['dropdown-separator']} />}
                                                    </div>


                                                    {/* Available Device IDs for selection */}
                                                    <div className={Style['available-items-scroll']}>
                                                        {uniqueDeviceIds
                                                            .filter(id =>
                                                                id.toLowerCase().includes(deviceIdSearchTerm.toLowerCase()) &&
                                                                !draftFilters.deviceId.includes(id) // Don't show already selected in the main list
                                                            )
                                                            .map(id => (
                                                                <div
                                                                    key={id}
                                                                    className={Style['type-dropdown-item']}
                                                                    onClick={() => handleDeviceIdSelect(id)}
                                                                >
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
            <div className={Style['tableHeader']}>
                <div className={Style['headerItem']}>Date & Time</div>
                <div className={Style['headerItem']}>Device ID</div>
                <div className={Style['headerItem']}>Event</div>
                <div className={Style['headerItem']}>Location</div>
                <div className={Style['headerItem']}>Status</div>
            </div>
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
                    No system logs match the current filters.
                </div>
            )}
            {/* Show "No system logs available" only if the initial logs array is empty */}
            {logs.length === 0 && (
                <div className={Style['noData']}>No system logs available.</div>
            )}
        </div>
    );
}

export default SystemLogs;