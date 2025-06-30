import { Menu, CalendarCog} from 'lucide-react';
import Style from '../../Styles/Device_AA.module.css'
function ActiveAlerts(){

    return(
        <div className={Style['container']}>
            <div className={Style['title']}>
                <p>Active Alerts</p>
                <div className={Style['right-pane']}>
                    <input type="text" placeholder="Search" className={Style['search-box']} /> {/**Not yet functional */}
                    <div className={Style['menu-container']}>
                        <div><Menu size={30}/></div>
                    </div> {/**Make the Menu dropdown to Filter the device*/}
                    <div className={Style['set-clock']}>
                        <CalendarCog size={30}/>
                    </div> {/**Make this when user clicked it will display another component */}
                </div>
            </div>
            <div className={Style['table']}>
                <table>
                    <thead>
                        <tr>
                            <td>Timestamp</td>
                            <td>Type</td>
                            <td>Originator</td>
                        </tr>
                    </thead>
                </table>
            </div>
        </div>
    );
}

export default ActiveAlerts;