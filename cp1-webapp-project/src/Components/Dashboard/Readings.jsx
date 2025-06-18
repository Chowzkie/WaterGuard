import ReadingsStyle from '../../Styles/Readings.module.css'
import {ChartColumnBig} from 'lucide-react'

const ReadingCard = ({ title, value, min, max, unit }) => (
  <div className={ReadingsStyle.readings}>
    <div className={ReadingsStyle["readings-title"]}>
      <p>{title}</p>
      {/**Dito ipapalit icon sa Lucide */}
      <a href="#"><ChartColumnBig /></a>
    </div>
    {/* You can add a real diagram here later */}
    <div className={ReadingsStyle["readings-diagram"]}>
        {/* Display the actual value dynamically */}
        {/*Add style her module*/}
        <div style={{ fontSize: '2rem', paddingTop: '20px' }}>
          <strong>{value}{unit}</strong>
        </div>
        <div className={ReadingsStyle["min-max"]}>
            <p>{min}{unit}</p>
            <p>{max}{unit}</p>
        </div>
    </div>
  </div>
);

// The main Readings component now maps over the data
const Readings = ({ readingsData }) => {
  return (
    <div className={ReadingsStyle["readings-container"]}>
      {readingsData.map(reading => (
        <ReadingCard
          key={reading.id} // A unique key is crucial for list rendering in React
          title={reading.title}
          value={reading.value}
          min={reading.min}
          max={reading.max}
          unit={reading.unit}
        />
      ))}
    </div>
  );
};

export default Readings;