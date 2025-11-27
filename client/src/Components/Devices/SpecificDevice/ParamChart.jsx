import React, { useState, useEffect } from "react";
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, Filler } from 'chart.js';
import Style from '../../../Styles/SpecificDeviceStyle/ParameterChart.module.css';
import { WifiOff } from 'lucide-react';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, Filler);

// --- UPDATED: Added 'unit' for better Y-Axis labeling ---
const PARAM_MAP = {
    ph: { key: 'PH', label: 'pH Level', color: '#FFA500', unit: '' },
    turbidity: { key: 'TURBIDITY', label: 'Turbidity', color: '#4CAF50', unit: ' (NTU)' },
    temperature: { key: 'TEMP', label: 'Temperature', color: '#2196F3', unit: ' (°C)' },
    tds: { key: 'TDS', label: 'TDS', color: '#E91E63', unit: ' (ppm)' },
};

function ParamChart({ historicalData, isLoading, onGoBack, timeRange, setTimeRange, deviceStatus}) {
    const [selectedParam, setSelectedParam] = useState('ph');
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });

    useEffect(() => {
        if (!historicalData || historicalData.length === 0) {
            setChartData({ labels: [], datasets: [] });
            return;
        }

        const paramConfig = PARAM_MAP[selectedParam];
        const dataKey = paramConfig?.key;

        const labels = historicalData.map(r => 
            new Date(r.timestamp).toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                hour: 'numeric', 
                minute: '2-digit' 
            })
        );
        
        const avgData = historicalData.map(r => r[dataKey]?.avg);
        const minData = historicalData.map(r => r[dataKey]?.min);
        const maxData = historicalData.map(r => r[dataKey]?.max);

        setChartData({
            labels: labels,
            datasets: [
                {
                    label: 'Range (Max)',
                    data: maxData,
                    borderColor: 'transparent',
                    backgroundColor: `${paramConfig?.color}33`, 
                    pointRadius: 0,
                    fill: '+1', 
                },
                 {
                    label: 'Range (Min)',
                    data: minData,
                    borderColor: 'transparent',
                    backgroundColor: 'transparent', 
                    pointRadius: 0,
                    fill: false,
                },
                {
                    label: `${paramConfig?.label} (Avg)`,
                    data: avgData,
                    borderColor: paramConfig?.color,
                    tension: 0.4, 
                    pointRadius: 0,
                    fill: false,
                },
            ],
        });

    }, [selectedParam, historicalData]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function(context) {
                        if (context.datasetIndex === 2) {
                            const avgValue = context.chart.data.datasets[2].data[context.dataIndex];
                            const minValue = context.chart.data.datasets[1].data[context.dataIndex];
                            const maxValue = context.chart.data.datasets[0].data[context.dataIndex];

                             return [
                                `Avg: ${avgValue?.toFixed(2)}`,
                                `Max: ${maxValue?.toFixed(2)}`,
                                `Min: ${minValue?.toFixed(2)}`,
                            ];
                        }
                        return null;
                    }
                }
            },
        },
        scales: {
            y: {
                beginAtZero: false,
                // --- ADDED Y-AXIS LABEL ---
                title: {
                    display: true,
                    text: `${PARAM_MAP[selectedParam]?.label}${PARAM_MAP[selectedParam]?.unit || ''}`,
                    font: {
                        weight: 'bold',
                        size: 13
                    },
                    padding: { bottom: 10 } // Adds some space between label and numbers
                }
            },
            x: {
                ticks: {
                    maxTicksLimit: 10 
                },
                // --- ADDED X-AXIS LABEL ---
                title: {
                    display: true,
                    text: 'Date and Time',
                    font: {
                        weight: 'bold',
                        size: 13
                    },
                    padding: { top: 10 } // Adds some space between label and dates
                }
            }
        },
    };

    if (deviceStatus === 'Offline') {
        return (
            <div className={Style.container}>
                <div className={Style.statusMessage}>
                    <div className={Style['offline-card']}>
                        <div className={Style['icon-wrapper']}>
                            <WifiOff size={50} />
                        </div>
                    </div>
                    <h3>Device Status: {deviceStatus}</h3>
                    <p>Historical readings are not available for devices that are {deviceStatus.toLowerCase()}.</p>
                </div>
            </div>
        );
      }

    return (
        <div className={Style['panel-container']}>
            <div className={Style['panel-header']}>
                <button className={Style['back-button']} onClick={onGoBack}>Go Back</button>
                <h2 className={Style['panel-title']}>Historical Data</h2>
                
                <div className={Style['time-range-selector']}>
                    <button onClick={() => setTimeRange('24h')} className={timeRange === '24h' ? Style.active : ''}>24H</button>
                    <button onClick={() => setTimeRange('7d')} className={timeRange === '7d' ? Style.active : ''}>7D</button>
                    <button onClick={() => setTimeRange('30d')} className={timeRange === '30d' ? Style.active : ''}>30D</button>
                </div>
            </div>

            <div className={Style['param-tabs']}>
                {Object.keys(PARAM_MAP).map(paramKey => (
                    <button key={paramKey} onClick={() => setSelectedParam(paramKey)} className={`${Style.tab} ${selectedParam === paramKey ? Style.active : ''}`}>
                        {PARAM_MAP[paramKey].label.toUpperCase()}
                    </button>
                ))}
            </div>

            <div className={Style['chart-wrapper']}>
                {isLoading ? (
                    <div className={Style['no-data-message']}>Loading Chart Data...</div>
                ) : (historicalData && historicalData.length > 0) ? (
                    <Line data={chartData} options={chartOptions} />
                ) : (
                    <div className={Style['no-data-message']}>No historical data available for this range.</div>
                )}
            </div>
        </div>
    );
}

export default ParamChart;