import React, { useState, useEffect } from "react";
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, Filler } from 'chart.js';
import Style from '../../../Styles/SpecificDeviceStyle/ParameterChart.module.css';
import { WifiOff, HelpCircle, X, LineChart, BookOpen } from 'lucide-react';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, Filler);

const PARAM_MAP = {
    ph: { key: 'PH', label: 'pH Level', color: '#FFA500', unit: '' },
    turbidity: { key: 'TURBIDITY', label: 'Turbidity', color: '#4CAF50', unit: ' (NTU)' },
    temperature: { key: 'TEMP', label: 'Temperature', color: '#2196F3', unit: ' (°C)' },
    tds: { key: 'TDS', label: 'TDS', color: '#E91E63', unit: ' (ppm)' },
};

// --- INTERNAL COMPONENT: Chart Guidelines Modal ---
const ChartGuidelinesModal = ({ onClose }) => {
    return (
        <div className={Style['guidelines-overlay']} onClick={onClose}>
            <div className={Style['guidelines-modal']} onClick={e => e.stopPropagation()}>
                <div className={Style['guidelines-header']}>
                    <div className={Style['guidelines-title-wrapper']}>
                        <BookOpen size={24} color="#3b82f6" />
                        <h3>Chart Guide</h3>
                    </div>
                    <button className={Style['modal-close-button']} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={Style['guidelines-content']}>
                    <h4 className={Style['guidelines-section-title']}>
                        <LineChart size={18} /> Understanding Historical Data
                    </h4>
                    
                    <div className={Style['definition-list']}>
                        <div className={Style['definition-item']}>
                            <strong>Solid Line (Average)</strong>
                            <p>The bold colored line connects the <b>average values</b> calculated for each time interval. It shows the general trend of the readings.</p>
                        </div>
                        
                        <div className={Style['definition-item']}>
                            <strong>Shaded Area (Range)</strong>
                            <p>The light shaded background behind the line represents the full <b>Min/Max range</b> of readings. This highlights volatility—a wider shaded area means readings were fluctuating significantly.</p>
                        </div>
                        
                        <div className={Style['definition-item']}>
                            <strong>Time Filters</strong>
                            <p>
                                <b>24H:</b> Shows detailed hourly data from the past day.<br/>
                                <b>7D / 30D:</b> Shows aggregated daily trends to spot long-term patterns.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

function ParamChart({ historicalData, isLoading, onGoBack, timeRange, setTimeRange, deviceStatus}) {
    const [selectedParam, setSelectedParam] = useState('ph');
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });
    const [showGuidelines, setShowGuidelines] = useState(false);

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
                title: {
                    display: true,
                    text: `${PARAM_MAP[selectedParam]?.label}${PARAM_MAP[selectedParam]?.unit || ''}`,
                    font: { weight: 'bold', size: 13 },
                    padding: { bottom: 10 }
                }
            },
            x: {
                ticks: { maxTicksLimit: 10 },
                title: {
                    display: true,
                    text: 'Date and Time',
                    font: { weight: 'bold', size: 13 },
                    padding: { top: 10 }
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
                
                {/* Title and Icon Wrapper */}
                <div className={Style['title-with-icon']}>
                    <h2 className={Style['panel-title']}>Historical Data</h2>
                    <HelpCircle 
                        size={20} 
                        className={Style['guidelines-icon']} 
                        onClick={() => setShowGuidelines(true)}
                    />
                </div>
                
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

            {/* Render Internal Modal */}
            {showGuidelines && (
                <ChartGuidelinesModal onClose={() => setShowGuidelines(false)} />
            )}
        </div>
    );
}

export default ParamChart;