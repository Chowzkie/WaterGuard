import SystemLogs from "./SystemLogs"
import Style from "../../Styles/LogsStyle/Logs.module.css"
import {systemLogsData} from '../../utils/LogsMockUp'

function Logs(){
    return(
        <div className={Style['container']}>
            <div className={Style['logContent']}>
                <SystemLogs logs={systemLogsData} />
            </div>
        </div>
    )
}
export default Logs