import React, {useState} from "react";
import {Line} from 'react-chartjs-2';
import {Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend} from 'chart.js';
import Style from '../../../Styles/SpecificDeviceStyle/ParameterChart.module.css';
import { plugins, scales } from "chart.js";

ChartJS.register(
    LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend
)

const yAxis = {
    ph: { min: 0, max: 14, color: '#FFA500' },
    turbidity: { min: 0, max: 10, color: '#4CAF50' },
    temperature: { min: 0, max: 50, color: '#2196F3' },
    tds: { min: 0, max: 1000, color: '#E91E63' },
};


function ParamChart({deviceDetails, mockTime, mockReadings, mockAlerts, onGoBack}){
    const [selectedParam, setSelectedParam] = useState('ph')

    const chartData = {
        labels: mockTime,
        datasets: [
            {
                label: `${selectedParam} Readings`,
                data: mockReadings[selectedParam.toLowerCase()],
                borderColor: yAxis[selectedParam.toLowerCase()].color,
                tension: 0.4,
                pointRadius: 4,
            },
        ],
    }

    const chartOption = {
        responsive: true,
        scales: {
            y: {
                title: {display: true, text: selectedParam},
                min: yAxis[selectedParam.toLowerCase()].min,
                max: yAxis[selectedParam.toLowerCase()].max,
            },
            x: {
                title: {display: true, text: 'Time'},
            },
        }
    }

    console.log("Selected Param:", selectedParam);
    console.log("Chart Data:", chartData);

    return(
        <div className={Style['container']}>
            <div className={Style['chart-container']}>
                <div className={Style['blockHeader']}>
                    <button className={Style['back-button']} onClick={onGoBack}>Go Back</button>
                    <div className={Style['blockTitle']}>Historical Data</div>
                </div>
                <div className={Style['buttons']}>
                    {['ph','turbidity','temperature','tds'].map(param => (
                        <button key={param} onClick={() => setSelectedParam(param)} className={`${Style.buttonNav} ${selectedParam === param ? Style.active : Style.inactive}`}>
                            {param.toUpperCase()}
                        </button>
                    ))}
                </div>
                <div className={Style['chart']}>
                    <Line data={chartData} options={chartOption} />
                </div>
            </div>
            <div className={Style['details-container']}>
                    
                <div className={Style['recent-alerts']}>
                    <div className={Style['title']}>
                        <p>Recent Alerts</p>
                    </div>
                    <ul className={Style['alertList']}>
                        {mockAlerts.map((alert, index) => (
                            <li key={index} className={`${Style.alert} ${Style[alert.level]}`}>
                                <span className={Style['time']}>{alert.time}</span>
                                <span className={Style['message']}>{alert.message}</span>
                                <span className={Style['value']}>({alert.value})</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className={Style['details']}>
                    <div className={Style['title']}>
                        <p>Testing Device Details</p>
                    </div>
                    <div className={Style['details-wrapper']}>
                        <div className={Style['wrapper']}>
                            <p>Label:</p>
                            <p>{deviceDetails.id}</p>
                        </div>
                        <div className={Style['wrapper']}>
                            <p>Status:</p>
                            <p>{deviceDetails.status}</p>
                        </div>
                        <div className={Style['wrapper']}>
                            <p>Location:</p>
                            <p>{deviceDetails.location}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ParamChart