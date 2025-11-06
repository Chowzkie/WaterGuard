import ReadingsStyle from '../../Styles/Readings.module.css';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { WifiOff } from 'lucide-react';
import NoDevicesFound from '../NoDevFound/noDevicesFound';

ChartJS.register(ArcElement, Tooltip, Legend);

const ReadingCard = ({ title, value, min, max, unit, color, status, selectedDeviceId }) => {
    const displayDeviceID = selectedDeviceId ? selectedDeviceId.toUpperCase() : '';

    if (status === 'Offline') {
        return (
            <div className={ReadingsStyle['offline-readings']}>
                <div className={ReadingsStyle['offline-card']}>
                    <div className={ReadingsStyle['icon-wrapper']}>
                        <WifiOff size={50} />
                    </div>
                    <h4>{displayDeviceID} is offline</h4>
                    <p>No available readings for {title} <br />at this moment</p>
                </div>
            </div>
        );
    }

    const normalizedValue = (value - min) / (max - min);
    const percentage = Math.min(Math.max(normalizedValue * 100, 0), 100)

    const data = {
        datasets: [
            {
                data: [percentage, 100 - percentage],
                backgroundColor: [color, '#eeeeee'],
                borderWidth: 0,
                circumference: 180,
                rotation: 270,
                cutout: '70%',
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
    };

    return (
        <div className={ReadingsStyle.readings}>
            <div className={ReadingsStyle["readings-title"]}>
                <p><strong>{title}</strong></p>
                <p><b>{displayDeviceID}</b></p>
            </div>

            <div className={ReadingsStyle["readings-diagram"]}>
                <div className={ReadingsStyle["chart-container"]}>
                    <Doughnut data={data} options={options} />
                    <div className={ReadingsStyle["chart-center-text"]}>
                        <span className={ReadingsStyle["value"]}>{value}</span>
                        {unit && <span className={ReadingsStyle["unit"]}>{unit}</span>}
                    </div>
                </div>
            </div>
            <div className={ReadingsStyle["min-max"]}>
                <p>Min: {min}{unit}</p>
                <p>Max: {max}{unit}</p>
            </div>
        </div>
    );
};

const Readings = ({ selectedDevice, deviceStatus }) => {
    if (!selectedDevice || !selectedDevice.readings || selectedDevice.readings.length === 0) {
        return (
            <div className={ReadingsStyle["no-device"]}>
                <NoDevicesFound/>
            </div>
        );
    }

    return (
        <div className={ReadingsStyle["readings-container"]}>
            {selectedDevice.readings.map((reading) => (
                <ReadingCard
                    key={reading.id}
                    title={reading.title}
                    value={reading.value}
                    min={reading.min}
                    max={reading.max}
                    unit={reading.unit}
                    color={reading.color}
                    status={deviceStatus}
                    selectedDeviceId={selectedDevice.id}
                />
            ))}
        </div>
    );
};

export default Readings;

