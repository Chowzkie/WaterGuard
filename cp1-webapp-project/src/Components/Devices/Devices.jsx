import React, { useState } from 'react';
import TestingDevice from "./TestingDevice";
import Style from '../../Styles/Device.module.css'
import { initialDevices } from '../../utils/DeviceMockUp'


function Devices(){
    const [devices, setDevice] = useState(initialDevices);

    return(
        <div className={Style['wrapper']}>
            <TestingDevice deviceData={devices}/>
        </div>
    )
}
export default Devices;