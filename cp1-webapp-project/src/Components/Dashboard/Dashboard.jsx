import '../../Styles/Dashboard.css';
import React, { useState, useEffect } from 'react';
import DeviceStatus from './DeviceStatus'
import Readings from './Readings'


// --- MOCK DATA (In a real app, this would come from an API) ---
const initialReadings = [
  { id: 1, title: 'Current pH', value: 7.2, min: 0, max: 14, unit: '' },
  { id: 2, title: 'Current Turbidity', value: 3.5, min: 0, max: 10, unit: ' NTU' },
  { id: 3, title: 'Current Temperature', value: 24, min: 0, max: 50, unit: '°C' },
  { id: 4, title: 'Total Dissolved Solids', value: 350, min: 0, max: 1000, unit: ' ppm' },
];

const initialDevices = [
    { id: 'PS01-DEV', location: 'Brgy. Burgos, Moncada, Tarlac', status: 'Active' },
    { id: 'PS02-DEV', location: 'Brgy. Camposanto 1 Norte, Moncada Tarlac', status: 'Inactive' },
    { id: 'PS03-DEV', location: 'Brgy. San Roque, Moncada  Tarlac', status: 'Active' },
    { id: 'PS04-DEV', location: 'Brgy. Poblacion, Moncada Tarlac', status: 'Maintenance' },
];
// ---------------------------------------------------------------


function Dashboard(){

    // State to hold our dynamic data
      const [readings, setReadings] = useState(initialReadings);
      const [devices, setDevices] = useState(initialDevices);
      //const [user, setUser] = useState({ name: 'Username' });
      //const [currentPage, setCurrentPage] = useState('Dashboard');
      
      // Example of how you might update data in the future (e.g., fetching from a server)
      // useEffect(() => {
      //   const interval = setInterval(() => {
      //     // Logic to fetch new data and update state with setReadings and setDevices
      //     console.log("Fetching new data...");
      //   }, 5000); // Fetch every 5 seconds
      //   return () => clearInterval(interval);
      // }, []);
    

    return(
        <div className='component-wrapper-dashboard'>

            {/* Pass the readings data as a prop */}
            <Readings readingsData={readings} />
            {/* Pass the devices data as a prop */}
            <DeviceStatus devicesData={devices} />

        </div>
    );

};

export default Dashboard;