// DeviceStatus.jsx
import React, { useState, useEffect } from 'react';
import StatusStyle from '../../Styles/DeviceStatus.module.css';
import { Search, Menu } from 'lucide-react';

const getStatusStyle = (status) => {
  switch (status.toLowerCase()) {
    case 'active': return { color: '#50AE5B', fontWeight: 'bold' };
    case 'inactive': return { color: 'red', fontWeight: 'bold' };
    case 'maintenance': return { color: 'orange', fontWeight: 'bold' };
    default: return {};
  }
};

const DeviceStatus = ({ devicesData, selectedDeviceId, setSelectedDeviceId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  // For backend:
  /*
  useEffect(() => {
    fetch('/api/devices').then(res => res.json()).then(data => setDevices(data));
  }, []);
  */

  const filteredDevices = devicesData.filter(device => {
    const matchSearch =
      device.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus =
      statusFilter === '' || device.status.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  return (
    <div className={StatusStyle["device-status"]}>
      <div className={StatusStyle["testing-device-table"]}>
        <div className={StatusStyle["table-title"]}>
          <p>Testing Device</p>
          <div className={StatusStyle["table-icon"]}>
            <input type="text" placeholder="Search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={StatusStyle["search-box"]} />
            <div className={StatusStyle["menu-container"]}>
              <div onClick={() => setShowMenu(!showMenu)} className={StatusStyle["menu-icon"]}><Menu size={32}/></div>
              {showMenu && (
                <div className={StatusStyle["menu-dropdown"]}>
                  <div onClick={() => setStatusFilter('')} className={StatusStyle["menu-option-clear"]}>Show All</div>
                  <div onClick={() => setStatusFilter('active')} className={StatusStyle["menu-option"]}>Active</div>
                  <div onClick={() => setStatusFilter('inactive')} className={StatusStyle["menu-option"]}>Inactive</div>
                  <div onClick={() => setStatusFilter('maintenance')} className={StatusStyle["menu-option"]}>Maintenance</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={StatusStyle["device-table"]}>
          <table>
            <thead>
              <tr><th>Label</th><th>Location</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filteredDevices.length === 0 ? (
                <tr><td colSpan="3">No devices found.</td></tr>
              ) : (
                filteredDevices.map(device => (
                  <tr key={device.id}>
                    <td>
                      <button
                        onClick={() => setSelectedDeviceId(device.id)}
                        className={`${StatusStyle["label-button"]} ${device.id === selectedDeviceId ? StatusStyle["active-button"] : ''}`}>
                        {device.id}
                      </button>
                    </td>
                    <td>{device.location}</td>
                    <td style={getStatusStyle(device.status)}>{device.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={StatusStyle["logs-container"]}>
        <p>View Sensor Logs</p>
        <button onClick={() => alert('Viewing sensor logs...')}>Click to View</button>
      </div>
    </div>
  );
};

export default DeviceStatus;
