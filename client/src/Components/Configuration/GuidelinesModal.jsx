import React from 'react';
import styles from '../../Styles/ConfigurationSettings.module.css';
import { X, AlertTriangle, Thermometer, Droplets } from 'lucide-react';

const GuidelinesModal = ({ onClose }) => {
    return (
        <div className={styles.modalBackdrop} onClick={onClose}>
            {/* Stop propagation to prevent closing when clicking the content */}
            <div className={styles.guidelinesModalContent} onClick={e => e.stopPropagation()}>

                <div className={styles.modalHeader}>
                    <h4>Configuration Guide</h4>
                    <button onClick={onClose} className={styles.closeButton}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    <p>Here’s how sensor values are categorized based on the thresholds you set in the configuration.</p>
                    
                    <div className={styles.guidelineSection}>
                        <h5><AlertTriangle size={16} /> pH Level</h5>
                        <ul>
                            <li><b>Critical:</b> When the value is less than <code>critLow</code> or greater than <code>critHigh</code>.</li>
                            <li><b>Warning:</b> When the value is within the range of <code>[critLow, warnLow]</code> or <code>[warnHigh, critHigh]</code>.</li>
                            <li><b>Normal:</b> Any value between the two warning ranges.</li>
                        </ul>
                    </div>

                    <hr className={styles['global-rule-divider']} />
                    
                    <div className={styles.guidelineSection}>
                        <h5><Droplets size={16} /> Turbidity & TDS</h5>
                        <ul>
                            <li><b>Critical:</b> When the value is greater than <code>crit</code>.</li>
                            <li><b>Warning:</b> When the value is greater than <code>warn</code> but less than or equal to <code>crit</code>.</li>
                            <li><b>Normal:</b> When the value is less than or equal to <code>warn</code>.</li>
                        </ul>
                    </div>
                    
                    <hr className={styles['global-rule-divider']} />

                    <div className={styles.guidelineSection}>
                        <h5><Thermometer size={16} /> Temperature</h5>
                        <ul>
                            <li>The logic is identical to the pH level, using the temperature's specific <code>critLow</code>, <code>warnLow</code>, <code>warnHigh</code>, and <code>critHigh</code> values.</li>
                        </ul>
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    <button onClick={onClose} className={styles.buttonSecondary}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default GuidelinesModal;