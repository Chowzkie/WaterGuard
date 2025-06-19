import React, { useState, useEffect } from 'react';
import StatusStyle from '../../Styles/DeviceStatus.module.css';
import { Search, Menu } from 'lucide-react';

// A function to apply styles based on the device status
const getStatusStyle = (status) => {
  switch (status.toLowerCase()) {
    case 'active':
      return { color: '#50AE5B', fontWeight: 'bold' };
    case 'inactive':
      return { color: 'red', fontWeight: 'bold' };
    case 'maintenance':
      return { color: 'orange', fontWeight: 'bold' };
    default:
      return {};
  }
};

const DeviceStatus = ({ devicesData }) => {
  // States for search & status filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  // For backend: If you plan to fetch data from API later, you can move devicesData here:
  /*
  const [devicesData, setDevicesData] = useState([]);

  useEffect(() => {
    // You can replace this with your real API later:
    const fetchData = async () => {
      const response = await fetch('/api/devices');  // <-- your backend API endpoint
      const data = await response.json();
      setDevicesData(data);
    };

    fetchData();
  }, []);
  */

  // Frontend filtering logic (keep this for now with mock data)
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

        {/*Search Box */}
        <input
          type="text"
          placeholder="Search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={StatusStyle["search-box"]}
        />

        {/*Dropdown Menu */}
        <div className={StatusStyle["menu-container"]}>
          <div onClick={() => setShowMenu(!showMenu)} className={StatusStyle["menu-icon"]}>
            <Menu size={32}/>
          </div>
          {/**Menu Options*/}
          {showMenu && (
            <div className={StatusStyle["menu-dropdown"]}>
              <div onClick={() => setStatusFilter('')} className={StatusStyle["menu-option-clear"]} id={StatusStyle.all}>Show All</div>
              <div onClick={() => setStatusFilter('active')} className={StatusStyle["menu-option"]} id={StatusStyle.active}>Active</div>
              <div onClick={() => setStatusFilter('inactive')} className={StatusStyle["menu-option"]} id={StatusStyle.inactive}>Inactive</div>
              <div onClick={() => setStatusFilter('maintenance')} className={StatusStyle["menu-option"]} id={StatusStyle.maintenance}>Maintenance</div>
            </div>
          )}
        </div>
      </div>
    </div>


        <div className={StatusStyle["device-table"]}>
          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan="3">No devices found.</td>
                </tr>
              ) : (
                filteredDevices.map(device => (
                  <tr key={device.id}>
                    <td>{device.id}</td>
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
