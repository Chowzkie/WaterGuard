import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from '../../Styles/ConfigurationSettings.module.css';
import { WifiOff } from 'lucide-react';
// --- UPDATED: Added LoaderCircle and Check icons ---
import { ArrowLeft, Save, AlertTriangle, LoaderCircle, Check } from 'lucide-react';

const ConfigurationSettings = ({ device, onSave, onBack }) => {
    // --- UPDATED: Added 'originalConfigs' to reliably track the "saved" state ---
    const [originalConfigs, setOriginalConfigs] = useState(null);
    const [draftConfigs, setDraftConfigs] = useState(null);
    const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // --- UPDATED: This effect now sets both the original and draft states ---
    useEffect(() => {
        const configsCopy = JSON.parse(JSON.stringify(device.configurations));
        setOriginalConfigs(configsCopy);
        setDraftConfigs(configsCopy);
        setSaveSuccess(false);
    }, [device]);

    // --- UPDATED: This now compares against the local 'originalConfigs' state ---
    const hasUnsavedChanges = () => {
        if (!draftConfigs || !originalConfigs) return false;
        return JSON.stringify(originalConfigs) !== JSON.stringify(draftConfigs);
    };

    const handleChange = (category, field, value) => {
        setDraftConfigs(prev => ({
            ...prev,
            [category]: { ...prev[category], [field]: parseFloat(value) || 0 }
        }));
    };
    
    const handleIntervalChange = (category, field, value) => {
        setDraftConfigs(prev => ({
            ...prev,
            [category]: { ...prev[category], [field]: parseInt(value) }
        }));
    };

    // --- MAJOR FIX: This function now correctly syncs the state after a save ---
    const handleSaveClick = async () => {
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            await onSave(device.id, draftConfigs);
            // THIS IS THE FIX: Update the 'original' state to match the new saved state.
            setOriginalConfigs(JSON.parse(JSON.stringify(draftConfigs)));
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (error) {
            console.error("Failed to save configurations:", error);
            alert("Error: Could not save settings.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleAttemptBack = () => {
        if (hasUnsavedChanges()) {
            setShowUnsavedPrompt(true);
        } else {
            onBack();
        }
    };

    const handleDiscardAndExit = () => {
        setShowUnsavedPrompt(false);
        onBack();
    };

    const handleSaveAndExit = async () => {
        setIsSaving(true);
        try {
            await onSave(device.id, draftConfigs);
            onBack();
        } catch (error) {
            console.error("Failed to save configurations:", error);
            alert("Error: Could not save settings.");
            setIsSaving(false);
        }
    };
    
    if (!draftConfigs) {
        return <div>Loading configurations...</div>;
    }
    
    const getSaveButtonContent = () => {
        if (isSaving) {
            return <><LoaderCircle size={16} className={styles['spinner']} /><span>Saving...</span></>;
        }
        if (saveSuccess) {
            return <><Check size={16} /><span>Saved!</span></>;
        }
        return <><Save size={16} /><span>Save Configurations</span></>;
    };

    return (
        <>
            <div className={styles['settings-wrapper']}>
                <div className={styles['settings-actions']}>
                    <button onClick={handleAttemptBack} className={styles['back-button']} disabled={isSaving}>
                        <ArrowLeft size={16} />
                        <span>Back to Device Selection</span>
                    </button>
                    <button 
                        onClick={handleSaveClick} 
                        className={`${styles['save-button']} ${saveSuccess ? styles['save-success'] : ''}`}
                        disabled={isSaving || !hasUnsavedChanges()}
                    >
                        {getSaveButtonContent()}
                    </button>
                </div>

                {/* --- FULL FORM CONTENT IS INCLUDED BELOW --- */}
                {device.status == 'Online' ? (
                    <div className={styles['settings-grid']}> 
                        <div className={styles['left-column']}>
                            <div className={styles['settings-panel']}>
                                <h4>Alert Thresholds</h4>
                                <ThresholdGroup label="pH Level">
                                    <div className={styles['input-row-4-col']}>
                                        <InputField label="Warning Low" value={draftConfigs.ph.warnLow} onChange={e => handleChange('ph', 'warnLow', e.target.value)} />
                                        <InputField label="Critical Low" value={draftConfigs.ph.critLow} onChange={e => handleChange('ph', 'critLow', e.target.value)} />
                                        <InputField label="Warning High" value={draftConfigs.ph.warnHigh} onChange={e => handleChange('ph', 'warnHigh', e.target.value)} />
                                        <InputField label="Critical High" value={draftConfigs.ph.critHigh} onChange={e => handleChange('ph', 'critHigh', e.target.value)} />
                                    </div>
                                    <div className={styles['input-row-2-col']}>
                                        <InputField label="Back to Normal (Low)" value={draftConfigs.ph.normalLow} onChange={e => handleChange('ph', 'normalLow', e.target.value)} />
                                        <InputField label="Back to Normal (High)" value={draftConfigs.ph.normalHigh} onChange={e => handleChange('ph', 'normalHigh', e.target.value)} />
                                    </div>
                                </ThresholdGroup>
                                <ThresholdGroup label="Turbidity (NTU)">
                                    <div className={styles['input-row-2-col']}>
                                        <InputField label="Warning Threshold" value={draftConfigs.turbidity.warn} onChange={e => handleChange('turbidity', 'warn', e.target.value)} />
                                        <InputField label="Critical Threshold" value={draftConfigs.turbidity.crit} onChange={e => handleChange('turbidity', 'crit', e.target.value)} />
                                    </div>
                                    <div className={styles['input-row-2-col']}>
                                        <InputField label="Back to Normal (Low)" value={draftConfigs.turbidity.normalLow} onChange={e => handleChange('turbidity', 'normalLow', e.target.value)} />
                                        <InputField label="Back to Normal (High)" value={draftConfigs.turbidity.normalHigh} onChange={e => handleChange('turbidity', 'normalHigh', e.target.value)} />
                                    </div>
                                </ThresholdGroup>
                                <ThresholdGroup label="TDS (mg/L)">
                                    <div className={styles['input-row-2-col']}>
                                        <InputField label="Warning Threshold" value={draftConfigs.tds.warn} onChange={e => handleChange('tds', 'warn', e.target.value)} />
                                        <InputField label="Critical Threshold" value={draftConfigs.tds.crit} onChange={e => handleChange('tds', 'crit', e.target.value)} />
                                    </div>
                                    <div className={styles['input-row-2-col']}>
                                        <InputField label="Back to Normal (Low)" value={draftConfigs.tds.normalLow} onChange={e => handleChange('tds', 'normalLow', e.target.value)} />
                                        <InputField label="Back to Normal (High)" value={draftConfigs.tds.normalHigh} onChange={e => handleChange('tds', 'normalHigh', e.target.value)} />
                                    </div>
                                </ThresholdGroup>
                                <ThresholdGroup label="Temperature (°C)">
                                    <div className={styles['input-row-4-col']}>
                                        <InputField label="Warning Low" value={draftConfigs.temp.warnLow} onChange={e => handleChange('temp', 'warnLow', e.target.value)} />
                                        <InputField label="Critical Low" value={draftConfigs.temp.critLow} onChange={e => handleChange('temp', 'critLow', e.target.value)} />
                                        <InputField label="Warning High" value={draftConfigs.temp.warnHigh} onChange={e => handleChange('temp', 'warnHigh', e.target.value)} />
                                        <InputField label="Critical High" value={draftConfigs.temp.critHigh} onChange={e => handleChange('temp', 'critHigh', e.target.value)} />
                                    </div>
                                    <div className={styles['input-row-2-col']}>
                                        <InputField label="Back to Normal (Low)" value={draftConfigs.temp.normalLow} onChange={e => handleChange('temp', 'normalLow', e.target.value)} />
                                        <InputField label="Back to Normal (High)" value={draftConfigs.temp.normalHigh} onChange={e => handleChange('temp', 'normalHigh', e.target.value)} />
                                    </div>
                                </ThresholdGroup>
                            </div>
                            <div className={styles['settings-panel']}>
                                <h4>Alert Logging Intervals</h4>
                                <ThresholdGroup label="Active Alert → Recent Alert">
                                <SelectField 
                                        value={draftConfigs.alertLoggingIntervals.activeToRecent} 
                                        onChange={e => handleIntervalChange('alertLoggingIntervals', 'activeToRecent', e.target.value)} 
                                        options={[15, 30, 45, 60]}
                                        unit="seconds"
                                    />
                                </ThresholdGroup>
                                <ThresholdGroup label="Recent Alert → History">
                                <SelectField 
                                        value={draftConfigs.alertLoggingIntervals.recentToHistory} 
                                        onChange={e => handleIntervalChange('alertLoggingIntervals', 'recentToHistory', e.target.value)} 
                                        options={[5, 10, 15, 30, 60]}
                                        unit="minutes"
                                    />
                                </ThresholdGroup>
                            </div>
                        </div>
                        <div className={styles['right-column']}>
                            <div className={styles['settings-panel']}>
                                <h4>Testing Container Water Change Intervals</h4>
                                <ThresholdGroup label="Draining Time">
                                <SelectField value={draftConfigs.testingIntervals.drain} onChange={e => handleIntervalChange('testingIntervals', 'drain', e.target.value)} options={[1,2,3,4,5]}/>
                                </ThresholdGroup>
                                <ThresholdGroup label="Delay before Filling">
                                <SelectField value={draftConfigs.testingIntervals.delay} onChange={e => handleIntervalChange('testingIntervals', 'delay', e.target.value)} options={[1,2,3,4,5]}/>
                                </ThresholdGroup>
                                <ThresholdGroup label="Filling Duration">
                                <SelectField value={draftConfigs.testingIntervals.fill} onChange={e => handleIntervalChange('testingIntervals', 'fill', e.target.value)} options={[1,2,3,4,5]}/>
                                </ThresholdGroup>
                            </div>
                            <div className={styles['settings-panel']}>
                                <h4>Valve Shut-off Thresholds</h4>
                                <ThresholdGroup label="Shut-Off on pH">
                                    <InputField label="Critical Low" value={draftConfigs.valveShutOff.phLow} onChange={e => handleChange('valveShutOff', 'phLow', e.target.value)} />
                                    <InputField label="Critical High" value={draftConfigs.valveShutOff.phHigh} onChange={e => handleChange('valveShutOff', 'phHigh', e.target.value)} />
                                </ThresholdGroup>
                                <ThresholdGroup label="Shut-Off on Turbidity">
                                    <InputField label="Critical Threshold" value={draftConfigs.valveShutOff.turbidityCrit} onChange={e => handleChange('valveShutOff', 'turbidityCrit', e.target.value)} />
                                </ThresholdGroup>
                                <ThresholdGroup label="Shut-Off on TDS">
                                    <InputField label="Critical Threshold" value={draftConfigs.valveShutOff.tdsCrit} onChange={e => handleChange('valveShutOff', 'tdsCrit', e.target.value)} />
                                </ThresholdGroup>
                            </div>
                            <div className={styles['settings-panel']}>
                                <h4>View System Logs</h4>
                                <Link to="/logs" className={styles['view-logs-button']}>
                                    Click to view
                                </Link>
                            </div>
                        </div>
                    </div>
                    ):
                        <div  className={styles['offline-device']}>
                            <div className={styles['offline-card']}>
                                <div className={styles['icon-wrapper']}>
                                    <WifiOff size={50}/>
                                </div>
                          
                                <h4> {device.label} is currently offline</h4>
                                <p>You cannot configure this device's <br /> settings while its offline.</p>
                            </div>
                        </div>
                    }
                </div>

            {/* --- Modal section is unchanged but will now work correctly --- */}
            {showUnsavedPrompt && (
                <div className={`${styles.modalBackdrop} ${styles.confirmationModalBackdrop}`}>
                    <div className={`${styles.modalContent} ${styles.confirmationModalContent}`}>
                        <div className={styles.icon}><AlertTriangle size={48} /></div>
                        <h4>Unsaved Changes</h4>
                        <p>You have unsaved changes. How would you like to proceed?</p>
                        <div className={styles.modalFooter}>
                            <button onClick={() => setShowUnsavedPrompt(false)}  className={styles.buttonTertiary} disabled={isSaving}>
                                Stay on Page
                            </button>
                            <button onClick={handleDiscardAndExit} className={styles.buttonSecondary} disabled={isSaving}>
                                Discard & Exit
                            </button>
                            <button onClick={handleSaveAndExit} className={styles.buttonPrimary} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save & Exit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// --- Helper components are unchanged ---
const ThresholdGroup = ({ label, children }) => (
    <div className={styles['threshold-group']}>
        <label>{label}</label>
        <div className={styles['input-rows-container']}>{children}</div>
    </div>
);

const InputField = ({ label, value, onChange }) => (
    <div className={styles['input-field']}>
        <label>{label}</label>
        <input type="number" value={value} onChange={onChange} />
    </div>
);

const SelectField = ({ value, onChange, options, unit = "minutes" }) => (
     <select value={value} onChange={onChange} className={styles['select-field']}>
        {options.map(o => <option key={o} value={o}>Every {o} {unit}</option>)}
    </select>
);

export default ConfigurationSettings;