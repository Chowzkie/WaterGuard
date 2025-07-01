import React, { useState } from 'react';
import { Menu, SquarePen } from 'lucide-react';
import Style from '../../Styles/DeviceTesting.module.css'

const getStatusStyle = (status) => {
    switch(status.toLowerCase()){
        case 'online': return {color: '#50AE5B', fontWeight: 600 };
        case 'offline': return { color: 'red', fontWeight: 600 };
        case 'maintenance': return { color: 'orange', fontWeight: 600 };
        default: return{};
    }
}

function TestingDevice({deviceData}){

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showMenu, setShowMenu] = useState(false);

    const filterDevice = deviceData.filter(device => {
        const matchSearch = 
            device.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            device.location.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = 
            statusFilter === '' || device.status.toLowerCase() === statusFilter.toLowerCase();
        return matchSearch && matchStatus;
    })

    return(
        <div className={Style['container']}>
            <div className={Style['table']}>
                <div className={Style['table-title']}>
                    <p>Testing Device</p>
                    <div className={Style['right-pane']}>
                        <input type="text" placeholder="Search" className={Style['search-box']} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/> {/**Not yet Functional */}
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
                    <table>
                        <thead>
                            <tr>
                                <th>Label</th>
                                <th>Location</th>
                                <th>Status</th>
                                <th> </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filterDevice.length === 0 ? (
                                <tr><td colSpan = '4'>No device found</td></tr>
                            ) : (
                                filterDevice.map(device => (
                                    <tr key={device.id}>
                                        <td>{device.id}</td>
                                        <td>{device.location}</td>
                                        <td style={getStatusStyle(device.status)}>{device.status}</td>
                                        <td>
                                            <button className={Style['icon-button']}>
                                                <SquarePen color="#080808" strokeWidth={1} size={32} />{/**Display the other component */}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
export default TestingDevice;