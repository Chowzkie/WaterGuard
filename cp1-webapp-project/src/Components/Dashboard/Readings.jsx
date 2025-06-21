import React from 'react';
import ReadingsStyle from '../../Styles/Readings.module.css';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const ReadingCard = ({ title, value, min, max, unit, color }) => {
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
        <p>{title}</p>
      </div>

      <div className={ReadingsStyle["readings-diagram"]}>
        <div className={ReadingsStyle["chart-container"]}>
          <Doughnut data={data} options={options} />
          <div className={ReadingsStyle["chart-center-text"]}>{value}{unit}</div>
        </div>

        <div className={ReadingsStyle["min-max"]}>
          <p>Min: {min}{unit}</p>
          <p>Max: {max}{unit}</p>
        </div>
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
        />
      ))}
    </div>
  );
};

export default Readings;
