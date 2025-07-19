import SystemLogs from "./SystemLogs"
import UserLogs from "./UserLogs"
import Style from "../../Styles/LogsStyle/Logs.module.css"
import {systemLogsData, userLogs} from '../../utils/LogsMockUp'

import { useState } from "react"

function Logs(){
    const [activeTab, setActiveTab] = useState('system');

    const handleTabClick = (tab) => {
        setActiveTab(tab);
    };
    return(
        <div className={Style['container']}>
            <div className={Style['tabs']}>
                <button
                    className={`${Style['tabButton']} ${activeTab === 'system' ? Style['activeTab'] : ''}`}
                    onClick={() => handleTabClick('system')} // Set 'system' as active on click
                >
                    System Logs
                </button>
                <button
                    className={`${Style['tabButton']} ${activeTab === 'user' ? Style['activeTab'] : ''}`}
                    onClick={() => handleTabClick('user')} // Set 'user' as active on click
                >
                    User Logs
                </button>
            </div>
            <div className={Style['logContent']}>
                {activeTab === 'system' && <SystemLogs logs={systemLogsData} />}

                {activeTab === 'user' && <UserLogs logs={userLogs} />}
            </div>
        </div>
    );
};
export default Logs