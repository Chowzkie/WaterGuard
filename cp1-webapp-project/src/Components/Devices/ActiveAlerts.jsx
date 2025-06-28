import { Menu } from 'lucide-react';
function ActiveAlerts(){

    return(
        <div className="container">
            <div className="title">
                <p>Active Alerts</p>
                <div className="right-pane">
                    <input type="text" placeholder="Search" className="search-box" /> {/**Not yet functional */}
                    <div className="menu-container"><Menu size={32}/></div> {/**Make the Menu dropdown to Filter the device*/}
                </div>
            </div>
            <div className='table'>
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