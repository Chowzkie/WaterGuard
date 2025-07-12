// Components/Devices/SpecificDevice/ParamChart.jsx
import React, {useState, useEffect} from "react";
import {Line} from 'react-chartjs-2';
import {Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend} from 'chart.js';
import Style from '../../../Styles/SpecificDeviceStyle/ParameterChart.module.css';

ChartJS.register(
    LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend
);

const PARAM_MAP = {
    ph: { key: 'pH', label: 'pH', min: 0, max: 14, color: '#FFA500' },
    turbidity: { key: 'turbidity', label: 'Turbidity', min: 0, max: 10, color: '#4CAF50' },
    temperature: { key: 'temp', label: 'Temperature', min: 0, max: 50, color: '#2196F3' },
    tds: { key: 'tds', label: 'TDS', min: 0, max: 1000, color: '#E91E63' },
};


function ParamChart({deviceDetails, mockTime, mockReadings, mockAlerts, onGoBack}){
    const [selectedParam, setSelectedParam] = useState('ph');
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });
    const [chartOptions, setChartOptions] = useState({});

    useEffect(() => {
        const currentParamDataKey = PARAM_MAP[selectedParam]?.key;
        const dataForChart = mockReadings && currentParamDataKey ? mockReadings[currentParamDataKey] : [];
        const paramConfig = PARAM_MAP[selectedParam];

        setChartData({
            labels: mockTime || [],
            datasets: [
                {
                    label: `${paramConfig?.label} Readings`,
                    data: dataForChart,
                    borderColor: paramConfig?.color,
                    tension: 0.4,
                    pointRadius: 4,
                },
            ],
        });

        setChartOptions({
            responsive: true,
            scales: {
                y: {
                    title: {display: true, text: paramConfig?.label || selectedParam.toUpperCase()},
                    min: paramConfig?.min,
                    max: paramConfig?.max,
                },
                x: {
                    title: {display: true, text: 'Time'},
                },
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            }
        });

        // --- NEW LOGGING FOR DEBUGGING ALERTS ---
        console.log(`ParamChart: mockAlerts prop received:`, mockAlerts);
        if (mockAlerts) {
            console.log(`ParamChart: mockAlerts length:`, mockAlerts.length);
            mockAlerts.forEach((alert, index) => {
                console.log(`ParamChart: Alert ${index}:`, alert);
                console.log(`ParamChart: Alert status (for CSS):`, alert.status ? alert.status.toLowerCase() : 'info');
            });
        } else {
            console.log(`ParamChart: mockAlerts is null or undefined.`);
        }
        // --- END NEW LOGGING ---

    }, [selectedParam, mockTime, mockReadings, deviceDetails, mockAlerts]); // Added mockAlerts to dependency array


    return(
        <div className={Style['container']}>
            <div className={Style['chart-container']}>
                <div className={Style['blockHeader']}>
                    <button className={Style['back-button']} onClick={onGoBack}>Go Back</button>
                    <div className={Style['blockTitle']}>Historical Data</div>
                </div>
                <div className={Style['buttons']}>
                    {Object.keys(PARAM_MAP).map(paramKey => (
                        <button
                            key={paramKey}
                            onClick={() => setSelectedParam(paramKey)}
                            className={`${Style.buttonNav} ${selectedParam === paramKey ? Style.active : Style.inactive}`}
                        >
                            {PARAM_MAP[paramKey].label.toUpperCase()}
                        </button>
                    ))}
                </div>
                <div className={Style['chart']}>
                    {chartData.datasets[0]?.data.length > 0 ? (
                        <Line data={chartData} options={chartOptions} />
                    ) : (
                        <div className={Style['no-data-message']}>No historical data available for {PARAM_MAP[selectedParam]?.label || selectedParam.toUpperCase()}.</div>
                    )}
                </div>
            </div>
            <div className={Style['details-container']}>

                <div className={Style['recent-alerts']}>
                    <div className={Style['title']}>
                        <p>Recent Alerts</p>
                    </div>
                    <ul className={Style['alertList']}>
                        {mockAlerts && mockAlerts.length > 0 ? (
                            mockAlerts.map((alert, index) => (
                                <li key={index} className={`${Style.alert} ${Style[alert.status ? alert.status.toLowerCase() : 'info']}`}>
                                    <span className={Style['time']}>{alert.time}</span>
                                    <span className={Style['message']}>{alert.type}</span>
                                    <span className={Style['value']}>({alert.value})</span>
                                </li>
                            ))
                        ) : (
                            <li className={Style['no-alerts']}>No recent alerts.</li>
                        )}
                    </ul>
                </div>

                <div className={Style['details']}>
                    <div className={Style['title']}>
                        <p>Testing Device Details</p>
                    </div>
                    <div className={Style['details-wrapper']}>
                        <div className={Style['wrapper']}>
                            <p>Label:</p>
                            <p>{deviceDetails.label}</p>
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

export default ParamChart;