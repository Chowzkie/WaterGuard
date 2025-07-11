import React, {useState} from 'react'

import SystemLogs from "./SystemLogs"
import SensorLogs from "./SensorLogs"
import Style from "../../Styles/LogsStyle/Logs.module.css"
import {systemLogsData,sensorLogsData} from '../../utils/LogsMockUp'

function Logs(){
    const [activeTab, setActiveTab] = useState('system')
    return(
        <div className={Style['container']}>
            <div className={Style['tabs']}>
                <button
                    className={`${Style['tabButton']} ${activeTab === 'system' ? Style['activeTab'] : ''}`}
                    onClick={() => setActiveTab('system')}
                    >
                        SYSTEM LOGS
                </button>
                <button 
                    className={`${Style['tabButton']} ${activeTab === 'sensor' ? Style['activeTab'] : ''}`}
                    onClick={() => setActiveTab('sensor')}
                >
                        SENSOR LOGS
                </button>
            </div>
            <div className={Style['logContent']}>
                {activeTab === 'system' ? (
                    <SystemLogs logs={systemLogsData} />
                ) : (
                    <SensorLogs logs={sensorLogsData} />
                )}
            </div>
        </div>
    )
}
export default Logs