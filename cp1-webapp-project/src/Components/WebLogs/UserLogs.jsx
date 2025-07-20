import React, { useState, useMemo, useEffect, useRef } from 'react';
import Style from '../../Styles/LogsStyle/UserLogs.module.css';
import { ListFilter, Download, X, ChevronDown } from 'lucide-react';

function UserLogs({ logs }) {
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        username: [], // username will be multi-select
    });
    const [draftFilters, setDraftFilters] = useState(filters);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [usernameSearchTerm, setUsernameSearchTerm] = useState('');
    const [isUsernameDropdownOpen, setIsUsernameDropdownOpen] = useState(false); // Controls the dropdown visibility

    const filterPanelRef = useRef(null);
    const usernameDropdownRef = useRef(null); // Ref for the username dropdown container

    // Get unique usernames from logs for the dropdown
    const uniqueUsernames = useMemo(() => {
        const usernames = new Set(logs.map(log => log.username));
        return Array.from(usernames).sort(); // Sort them alphabetically for better UX
    }, [logs]);

    // Filtered logs based on current filters
    const filteredDisplayLogs = useMemo(() => {
        return logs.filter(log => {
            const logDate = new Date(log.dateTime);
            const startDate = filters.startDate ? new Date(filters.startDate) : null;
            const endDate = filters.endDate ? new Date(filters.endDate) : null;

            // Normalize dates to compare entire day
            if (startDate) { startDate.setHours(0, 0, 0, 0); }
            if (endDate) { endDate.setHours(23, 59, 59, 999); }

            const dateMatch = (!startDate || logDate >= startDate) && (!endDate || logDate <= endDate);

            const usernameMatch = filters.username.length === 0 ||
                                  filters.username.includes(log.username);

            return dateMatch && usernameMatch;
        }).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime)); // Sort by date/time descending
    }, [logs, filters]);

    // Handlers for filter panel UI
    useEffect(() => {
        // When filter panel opens, sync draft filters with current active filters
        if (isFilterOpen) {
            setDraftFilters(filters);
        }
    }, [isFilterOpen, filters]);

    // Click outside handler for filter panel and username dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Close filter panel if click is outside and not on the filter icon itself
            if (filterPanelRef.current && !filterPanelRef.current.contains(event.target) && !event.target.closest(`.${Style['menu']}`)) {
                setIsFilterOpen(false);
            }
            // Close username dropdown if click is outside its container
            if (usernameDropdownRef.current && !usernameDropdownRef.current.contains(event.target)) {
                setIsUsernameDropdownOpen(false);
                setUsernameSearchTerm(''); // Clear search term when dropdown closes
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filter value change handlers for draftFilters
    const handleDateChange = (e) => {
        setDraftFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
        setUsernameSearchTerm(''); // Clear search term after selection
    };

    // Apply and Clear filters
    const applyFilters = () => {
        setFilters(draftFilters); // Apply draft filters to actual filters
        setIsFilterOpen(false); // Close filter panel
    };

    const clearFilters = () => {
        setDraftFilters({ startDate: '', endDate: '', username: [] });
        setUsernameSearchTerm('');
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
                <p>User Logs</p>
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
                                            <input type="date" name="startDate" value={draftFilters.startDate} onChange={handleDateChange} className={Style['date-input']} />
                                            <span>to</span>
                                            <input type="date" name="endDate" value={draftFilters.endDate} onChange={handleDateChange} className={Style['date-input']} />
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
                <div className={Style['headerItem']}>Username</div>
                <div className={Style['headerItem']}>Fullname</div>
                <div className={Style['headerItem']}>Action</div>
            </div>

            {/* NEW: A dedicated 'tableBody' container for scrollable rows */}
            <div className={Style['tableBody']}>
                {filteredDisplayLogs.length > 0 ? (
                    filteredDisplayLogs.map((log) => (
                        <div className={Style['tableRow']} key={log.id}>
                            <div className={Style['tableCell']} data-label="Date & Time">{formatDateTime(log.dateTime)}</div>
                            <div className={Style['tableCell']} data-label="Username">{log.username}</div>
                            <div className={Style['tableCell']} data-label="Fullname">{log.fullname}</div>
                            <div className={Style['tableCell']} data-label="Action">{log.action}</div>
                        </div>
                    ))
                ) : (
                    // ENHANCEMENT: Combined the two "no data" messages into a single logic block
                    <div className={Style['noData']}>
                        {logs.length === 0
                            ? "No user logs available."
                            : "No user logs match the current filters."
                        }
                    </div>
                )}
            </div>
        </div>
    );
}

export default UserLogs;