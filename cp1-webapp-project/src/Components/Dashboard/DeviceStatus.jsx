import StatusStyle from '../../Styles/DeviceStatus.module.css'
import {Search, Menu} from 'lucide-react'
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
  const handleViewLogs = () => {
    alert('Viewing sensor logs...');
    // In a real app, you would navigate to a new page or show a modal
  };

  return (
    <div className={StatusStyle["device-status"]}>
      <div className={StatusStyle["testing-device-table"]}>
        <div className={StatusStyle["table-title"]}>
          <p>Testing Device</p>
          <div className={StatusStyle["table-icon"]}>
            {/**Make this Functional */}
            <button ><Search /></button>
            <Menu />
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
              {/* If no devices, show a message. Otherwise, map and render them. */}
              {devicesData.length === 0 ? (
                <tr>
                  <td colSpan="3">No devices found.</td>
                </tr>
              ) : (
                devicesData.map(device => (
                  <tr key={device.id}>
                    <td>{device.id}</td>
                    <td>{device.location}</td>
                    {/* Apply dynamic style based on status */}
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
        <button onClick={handleViewLogs}>Click to View</button>
      </div>
    </div>
  );
};

export default DeviceStatus;