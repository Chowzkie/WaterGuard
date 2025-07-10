import React, { useEffect, useState } from 'react'; // Import useEffect and useState
import { useParams, useNavigate } from 'react-router-dom'; // Import useParams and useNavigate for go back
import ParamChart from './ParamChart'
import SpecificReadings from './SpecificReadings'
import ValveSwitch from './ValveSwitch'
import Style from '../../../Styles/SpecificDeviceStyle/Specific.module.css'
import { initialDevices } from '../../../utils/DeviceMockUp'; // Import from DeviceMockup.js


function SpecificDevice(){
    const { deviceId } = useParams(); // Get the deviceId from the URL
    const navigate = useNavigate(); // Initialize useNavigate for going back
    const [currentDevice, setCurrentDevice] = useState(null); // State to store the specific device data


    useEffect(() => {
        // Find the device based on the deviceId from the URL
        const foundDevice = initialDevices.find(device => device.id === deviceId);
        setCurrentDevice(foundDevice);
        console.log("Currently viewing device:", deviceId);
        // In a real application, you would fetch data for this deviceId
        // Example: fetchData(deviceId).then(data => setDeviceData(data));
    }, [deviceId]);

    const handleGoBack = () => {
        navigate('/devices'); // Navigate back to the devices list
    };

    if (!currentDevice) {
        return <div className={Style['container']}>Loading device data or Device not found...</div>;
    }

    return(
        <div className={Style['container']}>
            <div className={Style['left-column']}>
                <ParamChart 
                    deviceDetails={currentDevice} 
                    mockTime={currentDevice.history.time} 
                    mockReadings={currentDevice.history.readings} 
                    mockAlerts={currentDevice.alerts} 
                    onGoBack={handleGoBack}/>
            </div>
            <div className={Style['right-column']}>
                <SpecificReadings 
                    deviceReadings={currentDevice.readings} 
                    deviceId={deviceId} 
                    deviceStatus={currentDevice.status}/>
                <ValveSwitch deviceId={deviceId}/>
            </div>
        </div>
    )
}
export default SpecificDevice;