import Style from '../../Styles/LogsStyle/SystemLogs.module.css'
function SystemLogs({logs}) {
    
    return(
        <div className={Style['container']}>
            <div className={Style['tableHeader']}>
                <div className={Style['headerItem']}>Date & Time</div>
                <div className={Style['headerItem']}>Device ID</div>
                <div className={Style['headerItem']}>Event</div>
                <div className={Style['headerItem']}>Location</div>
                <div className={Style['headerItem']}>Status</div>
            </div>
            {logs.map((log) => ( // Use .map to render each log entry
                <div className={Style['tableRow']} key={log.id}> {/* Use log.id as key */}
                    <div className={Style['tableCell']}>{log.dateTime}</div>
                    <div className={Style['tableCell']}>{log.deviceId}</div>
                    <div className={Style['tableCell']}>{log.event}</div>
                    <div className={Style['tableCell']}>{log.location}</div>
                    <div className={`${Style['tableCell']} ${
                        log.status === 'Warning' ? Style['warningStatus'] :
                        log.status === 'Success' ? Style['successStatus'] : ''
                    }`}>
                        {log.status}
                    </div>
                </div>
            ))}
            {logs.length === 0 && (
                <div className={Style['noData']}>No system logs available.</div>
            )}
        </div>
    )
}

export default SystemLogs