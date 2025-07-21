import React from 'react';
import ReadingsStyle from '../../Styles/Readings.module.css';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import {WifiOff} from 'lucide-react'
import NoDevicesFound from '../NoDevFound/noDevicesFound';

ChartJS.register(ArcElement, Tooltip, Legend);

const ReadingCard = ({ title, value, min, max, unit, color, status ,selectedDevice }) => {
    {/**Render this pag offline yung device */}
    if (status === 'Offline') {
    return (
      <div className={ReadingsStyle['offline-readings']}> {/* Keep the main readings container style */}
        <div className={ReadingsStyle['offline-card']}>
          <div className={ReadingsStyle['icon-wrapper']}>
            <WifiOff size={50} />
          </div>
          <h4>{selectedDevice} is offline</h4>
          <p>No avalable readings for {title} <br />at this moment</p>
        </div>
      </div>
    );
  }

  const normalizedValue = (value - min) / (max - min);
  const percentage = normalizedValue * 100;

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
        <p><b>{selectedDevice}</b></p>
      </div>

      <div className={ReadingsStyle["readings-diagram"]}>
        <div className={ReadingsStyle["chart-container"]}>
          <Doughnut data={data} options={options} />
          {/* --- CORRECTED PART --- */}
          {/* The value and unit are now in separate spans for proper styling */}
          <div className={ReadingsStyle["chart-center-text"]}>
            <span className={ReadingsStyle["value"]}>{value}</span>
            {unit && <span className={ReadingsStyle["unit"]}>{unit}</span>}
          </div>
          {/* --- END OF CORRECTION --- */}
        </div>
      </div>
      <div className={ReadingsStyle["min-max"]}>
        <p>Min: {min}{unit}</p>
        <p>Max: {max}{unit}</p>
      </div>
    </div>
  );
};

const Readings = ({ selectedDevice, device, deviceStatus}) => {
  if (device.length === 0) {
    return <div className={ReadingsStyle["no-device"]}>
      <NoDevicesFound/>
    </div>;
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
          selectedDevice={selectedDevice.id}
        />
      ))}
    </div>
  );
};

export default Readings;