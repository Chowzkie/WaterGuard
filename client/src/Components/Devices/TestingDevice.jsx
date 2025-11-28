import React, { useState } from 'react';
import { Menu, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Style from '../../Styles/DeviceTesting.module.css';

function TestingDevice({ deviceData }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showMenu, setShowMenu] = useState(false);
    const navigate = useNavigate();

    const filterDevice = deviceData.filter(device => {
    // Safely access properties, providing fallbacks
    const id = device._id || '';
    const location = device.location || '';
    const status = device.currentState?.status || 'Offline';

    const matchSearch =
        id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus =
        statusFilter === '' || status.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
});

    const handleDeviceRowClick = (deviceId) => {
        navigate(`/devices/${deviceId}`);
    };

    return (
        <div className={Style['container']}>
            <div className={Style['table']}>
                <div className={Style['table-title']}>
                    <p>Testing Device</p>
                    <div className={Style['right-pane']}>
                        <input type="text" placeholder="Search" className={Style['search-box']} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        <div className={Style['menu-container']}>
                            <div onClick={() => setShowMenu(!showMenu)} className={Style["menu-icon"]}><Menu size={32} /></div>
                            {showMenu && (
                                <div className={Style["menu-dropdown"]}>
                                    <div onClick={() => setStatusFilter('')} className={Style["menu-option-clear"]}>Show All</div>
                                    <div onClick={() => setStatusFilter('online')} className={Style["menu-option"]} id={Style['online']}>Online</div>
                                    <div onClick={() => setStatusFilter('offline')} className={Style["menu-option"]} id={Style['offline']}>Offline</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- Table structure changed to a list of cards --- */}
                <div className={Style['device-list-container']}>
                    {filterDevice.length === 0 ? (
                        <div className={Style['no-devices']}>No devices found.</div>
                    ) : (
                        filterDevice.map(device => {
                            const status = device.currentState?.status || 'Offline';
                            return (
                                <div
                                    key={device._id} // Use _id
                                    className={Style['device-card']}
                                    onClick={() => handleDeviceRowClick(device._id)} // Use _id
                                >
                                    <div className={Style['card-icon']}><Cpu size={24} /></div>
                                    <div className={Style['card-content']}>
                                        <div className={Style['card-label']}>{device.label}</div>
                                        <div className={Style['card-location']}>{device.location}</div>
                                    </div>
                                    {/* Use the safe status variable */}
                                    <div className={`${Style['status-indicator']} ${Style[status.toLowerCase()]}`}>
                                        <div className={Style['status-dot']}></div>
                                        <span>{status}</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

export default TestingDevice;