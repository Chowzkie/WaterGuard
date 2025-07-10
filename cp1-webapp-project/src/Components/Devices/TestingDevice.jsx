import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; 
import Style from '../../Styles/DeviceTesting.module.css'


function TestingDevice({deviceData}){

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showMenu, setShowMenu] = useState(false);
    const navigate = useNavigate(); // Initialize useNavigate

    const filterDevice = deviceData.filter(device => {
        const matchSearch = 
            device.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            device.location.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = 
            statusFilter === '' || device.status.toLowerCase() === statusFilter.toLowerCase();
        return matchSearch && matchStatus;
    })

    // New handler to navigate to the specific device page
    const handleDeviceRowClick = (deviceId) => {
        navigate(`/devices/${deviceId}`); // Navigate to the new route with the deviceId
    };

    return(
        <div className={Style['container']}>
            <div className={Style['table']}>
                <div className={Style['table-title']}>
                    <p>Testing Device</p>
                    <div className={Style['right-pane']}>
                        <input type="text" placeholder="Search" className={Style['search-box']} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/> 
                        <div className={Style['menu-container']}>
                            <div onClick={() => setShowMenu(!showMenu)} className={Style["menu-icon"]}><Menu size={32}/></div>
                            {showMenu && (
                                <div className={Style["menu-dropdown"]}>
                                    <div onClick={() => setStatusFilter('')} className={Style["menu-option-clear"]}>Show All</div>
                                    <div onClick={() => setStatusFilter('online')} className={Style["menu-option"]} id={Style['online']}>Online</div>
                                    <div onClick={() => setStatusFilter('offline')} className={Style["menu-option"]} id={Style['offline']}>Offline</div>
                                    <div onClick={() => setStatusFilter('maintenance')} className={Style["menu-option"]} id={Style['maintenance']}>Maintenance</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {/**Table */}
                <div className={Style['device-table']}>
                    <div className={Style['devices-header-row']}>
                        <div>Label</div>
                        <div>Location</div>
                        <div>Status</div>
                    </div>

                    <div className={Style['device-body']}>
                        {filterDevice.length === 0 ? (
                            <div className={Style['no-devices']}>No devices found.</div>
                        ) : (
                            filterDevice.map(device => (
                                <div key={device.id} 
                                    className={Style['devices-row']}
                                    onClick={() => handleDeviceRowClick(device.id)}
                                    >{/**in the device-row this is where i want to put the other component it will render this component and move to SpecificDevice.jsx */}
                                        <div>{device.id}</div>
                                        <div>{device.location}</div>
                                        <div className={`${Style['status-badge']} ${Style[device.status.toLowerCase()]}`}>{device.status}</div>
                                    </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
export default TestingDevice;