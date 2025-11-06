import SystemLogs from "./SystemLogs"
import UserLogs from "./UserLogs"
import Style from "../../Styles/LogsStyle/Logs.module.css"
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { useState } from "react"


function Logs() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('system');

    const handleTabClick = (tab) => {
        setActiveTab(tab);
    };

    //Handle go back function
    const handleBack = () => navigate('/overview');

    return (
        <div className={Style['container']}>
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
                {/* Pass the systemLogs from context to the SystemLogs component */}
                {activeTab === 'system' && 
                    <SystemLogs/>
                }
                {activeTab === 'user' &&
                    <UserLogs/>
                }
            </div>
        </div>
    );
};
export default Logs;
