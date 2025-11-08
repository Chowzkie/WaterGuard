import React, { useState } from 'react';
import Style from '../../../Styles/SpecificDeviceStyle/ControlPanel.module.css';
import ValveSwitch from './ValveSwitch';
import PumpSwitch from './PumpSwitch';

function ControlPanel({ deviceId, deviceStatus, valveState, pumpState, pumpCycle, onValveToggle, onPumpToggle, addToast }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const panels = [
        { component: <ValveSwitch deviceId={deviceId} deviceStatus={deviceStatus} valveState={valveState} onToggle={onValveToggle} addToast={addToast} /> },
        { component: <PumpSwitch deviceId={deviceId} deviceStatus={deviceStatus} pumpState={pumpState} pumpCycle={pumpCycle} onToggle={onPumpToggle} addToast={addToast} /> }
    ];

    const handlePrev = () => setCurrentIndex((prev) => (prev === 0 ? panels.length - 1 : prev - 1));
    const handleNext = () => setCurrentIndex((prev) => (prev === panels.length - 1 ? 0 : prev + 1));

    return (
        <div className={Style['control-container']}>
            <h3 className={Style['control-header']}>Device Controls</h3>
            <div className={Style['control-content']}>
                <button className={Style['arrow-btn']} onClick={handlePrev}>{'<'}</button>
                <div className={Style['slider-wrapper']}>
                    <div
                        className={Style['slider']}
                        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                    >
                        {panels.map((panel, index) => (
                            <div className={Style['panel']} key={index}>
                                {panel.component}
                            </div>
                        ))}
                    </div>
                </div>
                <button className={Style['arrow-btn']} onClick={handleNext}>{'>'}</button>
            </div>
        </div>
    );
}

export default ControlPanel;
