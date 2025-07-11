import Style from '../../Styles/LogsStyle/SensorLogs.module.css'

function SensorLogs({logs}){
    
    const getStatusClass = (status) => {
        switch (status) {
            case 'Active': return Style['activeStatus'];
            case 'Offline': return Style['offlineStatus'];
            case 'Maintenance': return Style['maintenanceStatus'];
            default: return ''; // Fallback for any unhandled status
        }
    };
    return(
        <div className={Style['container']}>
            <div className={Style['tableHeader']}>
                <div className={Style['headerItem']}>Date & Time</div>
                <div className={Style['headerItem']}>Parameter</div>
                <div className={Style['headerItem']}>Value</div>
                <div className={Style['headerItem']}>Unit</div>
                <div className={Style['headerItem']}>Status</div>
            </div>
            {logs.map((log) => (
                <div className={Style['tableRow']} key={log.id}> 
                    <div className={Style['tableCell']}>{log.dateTime}</div>
                    <div className={Style['tableCell']}>{log.parameter}</div>
                    <div className={Style['tableCell']}>{log.value}</div>
                    <div className={Style['tableCell']}>{log.unit}</div>
                    <div className={`${Style['tableCell']} ${getStatusClass(log.status)}`}>
                        {log.status}
                    </div>
                </div>
            ))}
            {logs.length === 0 && (
                <div className={Style['noData']}>No Sensor logs available.</div>
            )}
        </div>
    )
}
export default SensorLogs