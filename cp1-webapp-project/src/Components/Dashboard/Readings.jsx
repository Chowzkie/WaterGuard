import React from 'react';
import ReadingsStyle from '../../Styles/Readings.module.css';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const ReadingCard = ({ title, value, min, max, unit, color, selectedDevice}) => {
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

const Readings = ({ selectedDevice }) => {
  if (!selectedDevice) {
    return <div>Please select a device to view readings.</div>;
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
          selectedDevice={selectedDevice.id}
        />
      ))}
    </div>
  );
};

export default Readings;