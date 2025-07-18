// Components/Devices/Devices.jsx
import React, { useState, useContext } from 'react'; // <--- Import useContext
import TestingDevice from "./TestingDevice";
import Style from '../../Styles/Device.module.css';
import AlertsContext from '../../utils/AlertsContext'; // <--- Import AlertsContext
function Devices(){
    // Use useContext to get devices from the context
    const { devices } = useContext(AlertsContext); // <--- Get devices from context

    return(
        <div className={Style['wrapper']}>
            <TestingDevice deviceData={devices}/> {/* <--- Pass devices from context */}
        </div>
    )
}
export default Devices;