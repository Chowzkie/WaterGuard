import React, { useEffect } from 'react';
import { 
    X, 
    BookOpen, 
    AlertTriangle, 
    History, 
    RefreshCw, 
    PowerOff, 
    Thermometer, 
    Droplets 
} from 'lucide-react';
import styles from '../../Styles/GuidelinesModalStyle/GuidelinesModal.module.css';

const GuidelinesModal = ({ onClose, initialSection }) => {
    
    // Auto-scroll to the specific section if requested
    useEffect(() => {
        if (initialSection) {
            const element = document.getElementById(initialSection);
            if (element) {
                // Small delay to ensure modal render is complete
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        }
    }, [initialSection]);

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                {/* HEADER */}
                <div className={styles.header}>
                    <div className={styles.titleWrapper}>
                        <BookOpen size={24} className={styles.iconMain} />
                        <h3>Configuration Guidelines</h3>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* BODY CONTENT */}
                <div className={styles.content}>
                    
                    {/* 1. THRESHOLD RULES */}
                    <section id="guide-thresholds" className={styles.section}>
                        <h4 className={styles.sectionTitle}>
                            <AlertTriangle size={18} /> Alert Threshold Logic
                        </h4>
                        
                        <div className={styles.logicBox}>
                            <div className={styles.logicHeader}>
                                <Thermometer size={16} /> pH Level & Temperature (Range Based)
                            </div>
                            <ul className={styles.logicList}>
                                <li>
                                    <strong>Critical:</strong> Value is lower than <span className={styles.code}>Crit Low</span> OR higher than <span className={styles.code}>Crit High</span>.
                                </li>
                                <li>
                                    <strong>Warning:</strong> Value is inside the warning zones (between Critical and Normal).
                                </li>
                                <li>
                                    <strong>Back to Normal:</strong> Value returns to the safe zone defined by <span className={styles.code}>Normal Low</span> and <span className={styles.code}>Normal High</span>.
                                </li>
                            </ul>
                        </div>

                        <div className={styles.logicBox} style={{borderColor: '#d1fae5', backgroundColor: '#ecfdf5'}}>
                            <div className={styles.logicHeader} style={{color: '#047857'}}>
                                <Droplets size={16} /> Turbidity & TDS (Limit Based)
                            </div>
                            <ul className={styles.logicList}>
                                <li>
                                    <strong>Critical:</strong> Value exceeds the <span className={styles.code}>Critical</span> threshold.
                                </li>
                                <li>
                                    <strong>Warning:</strong> Value exceeds <span className={styles.code}>Warning</span> but is below Critical.
                                </li>
                                <li>
                                    <strong>Back to Normal:</strong> Value drops below the <span className={styles.code}>Back to Normal</span> threshold.
                                </li>
                            </ul>
                        </div>
                    </section>

                    <div className={styles.divider}></div>

                    {/* 2. LOGGING INTERVALS */}
                    <section id="guide-logging" className={styles.section}>
                        <h4 className={styles.sectionTitle}>
                            <History size={18} /> Logging Intervals
                        </h4>
                        <div className={styles.definitionList}>
                            <div className={styles.definitionItem}>
                                <strong>Active → Recent (Delay)</strong>
                                <p>When a sensor reading returns to normal, the system waits for this duration (e.g., 30s) to ensure the value is stable before moving the alert from "Active" to the "Recent" tab.</p>
                            </div>
                            <div className={styles.definitionItem}>
                                <strong>Recent → History (Archiving)</strong>
                                <p>How long a resolved alert stays visible in the "Recent" tab before it is permanently moved to the "History" log.</p>
                            </div>
                        </div>
                    </section>

                    <div className={styles.divider}></div>

                    {/* 3. PUMP CYCLES */}
                    <section id="guide-pump" className={styles.section}>
                        <h4 className={styles.sectionTitle}>
                            <RefreshCw size={18} /> Pump Cycle Phases
                        </h4>
                        <div className={styles.definitionList}>
                            <div className={styles.definitionItem}>
                                <strong>Draining Time</strong>
                                <p>The duration the pump runs to empty the testing chamber before taking a new sample.</p>
                            </div>
                            <div className={styles.definitionItem}>
                                <strong>Delay (Settling)</strong>
                                <p>A pause after draining/filling to allow water to settle and sensors to stabilize.</p>
                            </div>
                            <div className={styles.definitionItem}>
                                <strong>Filling Duration</strong>
                                <p>The duration the pump draws fresh water into the chamber for analysis.</p>
                            </div>
                        </div>
                    </section>

                    <div className={styles.divider}></div>

                    {/* 4. VALVE AUTOMATION */}
                    <section id="guide-valve" className={styles.section}>
                        <h4 className={styles.sectionTitle}>
                            <PowerOff size={18} /> Valve Automation Rules
                        </h4>
                        <div className={styles.definitionList}>
                            <div className={styles.definitionItem}>
                                <strong>Automatic Shut-off</strong>
                                <p>Safety Feature: Automatically closes the main valve if specific parameters (pH, Turbidity, etc.) reach critical levels to prevent contaminated water distribution.</p>
                            </div>
                            <div className={styles.definitionItem}>
                                <strong>Automatic Re-open</strong>
                                <p>Recovery Feature: Automatically re-opens the valve when sensors detect that water quality has returned to safe, normal levels.</p>
                            </div>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default GuidelinesModal;