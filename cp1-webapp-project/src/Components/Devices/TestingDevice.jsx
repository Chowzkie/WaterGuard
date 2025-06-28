import { Menu, SquarePen } from 'lucide-react';
function TestingDevice(){
    return(
        <div className="Container">
            <div className="Table">
                <div className="Table-title">
                    <p>Testing Device</p>
                    <div className="right-pane">
                        <input type="text" placeholder="Search" className="Search-box" /> {/**Not yet Functional */}
                        <div className="menu-container"><Menu size={32}/></div> {/**Make the Menu dropdown to Filter the status*/}
                    </div>
                </div>
                {/**Table */}
                <div className="device-table">
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
                                    <button>
                                        <SquarePen color="#080808" strokeWidth={1} />
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