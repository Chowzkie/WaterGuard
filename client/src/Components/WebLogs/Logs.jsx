import SystemLogs from "./SystemLogs"
import UserLogs from "./UserLogs"
import Style from "../../Styles/LogsStyle/Logs.module.css"
import {systemLogsData, userLogs} from '../../utils/LogsMockUp'
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { useState, useContext } from "react" // --- ADDED: useContext
import AlertsContext from "../../utils/AlertsContext" // --- ADDED: Import context


function Logs(){
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('system');

     // --- NEW: Get userLogs from the global context ---
    const { userLogs, onDeleteUserLogs, onRestoreUserLogs } = useContext(AlertsContext); // Using a default for systemLogs for now

    const handleTabClick = (tab) => {
        setActiveTab(tab);
    };

    //Handle go back function
    const handleBack = () => navigate('/overview');

    return(
        <div className={Style['container']}>
            {/* NEW: A dedicated header container to group the back button and tabs */}
                <div className={Style['header']}>
                    <button onClick={handleBack} className={Style['backButton']}>
                        <ArrowLeft size={16} /> Back
                    </button>
                </div>
                <div className={Style['tabs']}>
                    <button
                        className={`${Style['tabButton']} ${activeTab === 'system' ? Style['activeTab'] : ''}`}
                        onClick={() => handleTabClick('system')}
                    >
                        System Logs
                    </button>
                    <button
                        className={`${Style['tabButton']} ${activeTab === 'user' ? Style['activeTab'] : ''}`}
                        onClick={() => handleTabClick('user')}
                    >
                        User Logs
                    </button>
                </div>

            <div className={Style['logContent']}>
                {activeTab === 'system' && <SystemLogs logs={systemLogsData} />}
                {activeTab === 'user' &&
                    <UserLogs 
                        logs={userLogs} 
                        onDelete={onDeleteUserLogs}
                        onRestore={onRestoreUserLogs}
                    />
                }
            </div>
        </div>
    );
};
export default Logs;