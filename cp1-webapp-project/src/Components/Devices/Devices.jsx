import TestingDevice from "./TestingDevice";
import ActiveAlerts from "./ActiveAlerts";
import Style from '../../Styles/Device.module.css'
function Devices(){


    return(
        <div className={Style['wrapper']}>
            <TestingDevice />
            <ActiveAlerts />
        </div>
    )
}
export default Devices;