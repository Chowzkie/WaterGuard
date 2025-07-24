import React, { useState, useEffect } from "react";
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from 'chart.js';
import Style from '../../../Styles/SpecificDeviceStyle/ParameterChart.module.css';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const PARAM_MAP = {
    ph: { key: 'pH', label: 'pH', min: 0, max: 14, color: '#FFA500' },
    turbidity: { key: 'turbidity', label: 'Turbidity', min: 0, max: 10, color: '#4CAF50' },
    temperature: { key: 'temp', label: 'Temperature', min: 0, max: 50, color: '#2196F3' },
    tds: { key: 'tds', label: 'TDS', min: 0, max: 1000, color: '#E91E63' },
};

// Props are simplified: deviceDetails and mockAlerts are removed
function ParamChart({ mockTime, mockReadings, onGoBack }) {
    const [selectedParam, setSelectedParam] = useState('ph');
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });
    const [chartOptions, setChartOptions] = useState({});

    // This useEffect logic is unchanged
    useEffect(() => {
        const currentParamDataKey = PARAM_MAP[selectedParam]?.key;
        const dataForChart = mockReadings && currentParamDataKey ? mockReadings[currentParamDataKey] : [];
        const paramConfig = PARAM_MAP[selectedParam];

        setChartData({
            labels: mockTime || [],
            datasets: [{
                label: `${paramConfig?.label} Readings`,
                data: dataForChart,
                borderColor: paramConfig?.color,
                backgroundColor: `${paramConfig?.color}33`,
                tension: 0.4,
                pointRadius: 4,
                fill: true,
            }],
        });

        setChartOptions({
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { title: { display: true, text: paramConfig?.label || selectedParam.toUpperCase() }, min: paramConfig?.min, max: paramConfig?.max },
                x: { title: { display: true, text: 'Time' } },
            },
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: { mode: 'index', intersect: false }
            }
        });
    }, [selectedParam, mockTime, mockReadings]);

    return (
        <div className={Style['panel-container']}>
            <div className={Style['panel-header']}>
                <button className={Style['back-button']} onClick={onGoBack}>Go Back</button>
                <h2 className={Style['panel-title']}>Historical Data</h2>
            </div>

            <div className={Style['param-tabs']}>
                {Object.keys(PARAM_MAP).map(paramKey => (
                    <button key={paramKey} onClick={() => setSelectedParam(paramKey)} className={`${Style.tab} ${selectedParam === paramKey ? Style.active : ''}`}>
                        {PARAM_MAP[paramKey].label.toUpperCase()}
                    </button>
                ))}
            </div>

            <div className={Style['chart-wrapper']}>
                {chartData.datasets[0]?.data.length > 0 ? (
                    <Line data={chartData} options={chartOptions} />
                ) : (
                    <div className={Style['no-data-message']}>No historical data available.</div>
                )}
            </div>

            {/* The "Bottom Details Section" has been completely removed from this file. */}
        </div>
    );
}

export default ParamChart;