import { Menu, SquarePen } from 'lucide-react';
import Style from '../../Styles/DeviceTesting.module.css'

function TestingDevice(){
    return(
        <div className={Style['container']}>
            <div className={Style['table']}>
                <div className={Style['table-title']}>
                    <p>Testing Device</p>
                    <div className={Style['right-pane']}>
                        <input type="text" placeholder="Search" className={Style['search-box']} /> {/**Not yet Functional */}
                        <div className={Style['menu-container']}>
                            <div className={Style["menu-icon"]}><Menu size={32}/></div>
                        </div> {/**Make the Menu dropdown to Filter the status*/}
                    </div>
                </div>
                {/**Table */}
                <div className={Style['device-table']}>
                    <table>
                        <thead>
                            <tr>
                                <th>Label</th>
                                <th>Location</th>
                                <th>Status</th>
                                <th> </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td>
                                    <button className={Style['icon-button']}>
                                        <SquarePen color="#080808" strokeWidth={1} size={32} />{/**Display the other component */}
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
export default TestingDevice;