import React, { useState, useEffect } from 'react';
import styles from '../../Styles/ConfigurationSettings.module.css';
import { WifiOff, ArrowLeft, Save, AlertTriangle, LoaderCircle, Check, ChevronDown, History, RefreshCw, PowerOff } from 'lucide-react';

/**
 * A reusable component to display a message when a setting is not configured.
 */
const NotConfiguredMessage = () => (
    <div className={styles['not-configured-message']}>
        <AlertTriangle size={18} />
        <p>This setting has not been configured for this device.</p>
    </div>
);

const ConfigurationSettings = ({ device, onSave, onBack }) => {
    // --- STATE MANAGEMENT ---

    /**
     * @state {object | null} originalConfigs - Stores a deep copy of the device's original configurations.
     * This acts as a "baseline" to compare against for detecting unsaved changes.
     */
    const [originalConfigs, setOriginalConfigs] = useState(null);

    /**
     * @state {object | null} draftConfigs - Stores the configurations as the user modifies them.
     * All user input updates this state, leaving `originalConfigs` untouched until a save occurs.
     */
    const [draftConfigs, setDraftConfigs] = useState(null);

    /**
     * @state {boolean} showUnsavedPrompt - Controls the visibility of the "Unsaved Changes" confirmation modal.
     */
    const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);

    /**
     * @state {boolean} isSaving - A flag to indicate when a save operation is in progress.
     * Used to disable buttons and show loading indicators.
     */
    const [isSaving, setIsSaving] = useState(false);

    /**
     * @state {boolean} saveSuccess - A flag to temporarily show a "Saved!" success message on the save button.
     */
    const [saveSuccess, setSaveSuccess] = useState(false);

    /**
     * @state {object} openPanels - Manages the open/closed state of the collapsible panels.
     */
    const [openPanels, setOpenPanels] = useState({
        alerts: true, // Start with the main panel open
        logging: false,
        testing: false,
        shutoff: false,
    });

    // --- LIFECYCLE HOOKS ---

    /**
     * @effect Initializes component state when a new `device` is selected.
     * It creates deep copies of the device's configurations for both the 'original' and 'draft' states.
     * It also gracefully handles cases where a device has no pre-existing configuration data by defaulting to an empty object.
     */
    useEffect(() => {
        const initialConfigs = device.configurations
            ? JSON.parse(JSON.stringify(device.configurations))
            : {};
        
        setOriginalConfigs(initialConfigs);
        setDraftConfigs(initialConfigs);
        setSaveSuccess(false); // Reset save success state when device changes
    }, [device]);

    // --- UTILITY & EVENT HANDLERS ---
    
    /**
     * @function handleTogglePanel - Toggles the open/closed state of a specific panel.
     * @param {string} panelName - The key of the panel to toggle (e.g., 'alerts').
     */
    const handleTogglePanel = (panelName) => {
        setOpenPanels(prev => ({ ...prev, [panelName]: !prev[panelName] }));
    };

    /**
     * @function hasUnsavedChanges
     * @returns {boolean} - True if `draftConfigs` is different from `originalConfigs`.
     * This is used to enable/disable the "Save" button.
     */
    const hasUnsavedChanges = () => {
        if (!draftConfigs || !originalConfigs) return false;
        return JSON.stringify(originalConfigs) !== JSON.stringify(draftConfigs);
    };

    const handleDeepChange = (path, value) => {
        setDraftConfigs(prev => {
            const newConfigs = JSON.parse(JSON.stringify(prev)); // Deep copy to avoid bugs
            let current = newConfigs;
            for (let i = 0; i < path.length - 1; i++) {
                // Create nested objects if they don't exist
                current[path[i]] = current[path[i]] || {};
                current = current[path[i]];
            }
            current[path[path.length - 1]] = value;
            return newConfigs;
        });
    };
    
    /**
     * @function handleIntervalChange - Generic handler for integer-based select/dropdown fields.
     * @param {string} category - The top-level key in the config object (e.g., 'alertLoggingIntervals').
     * @param {string} field - The nested key to update (e.g., 'activeToRecent').
     * @param {string} value - The new value from the select field.
     */
    const handleIntervalChange = (category, field, value) => {
        setDraftConfigs(prev => ({
            ...prev,
            [category]: { ...prev[category], [field]: parseInt(value) }
        }));
    };

    /**
     * @function handleSelectChange - Generic handler for string-based select fields (like Yes/No).
     * @param {string} category - The top-level key in the config object (e.g., 'valveShutOff').
     * @param {string} field - The nested key to update (e.g., 'reopenOnNormalPH').
     * @param {string} value - The new value from the select field ('yes' or 'no').
     */
    const handleSelectChange = (category, field, value) => {
        setDraftConfigs(prev => ({
            ...prev,
            [category]: { ...prev[category], [field]: value }
        }));
    };

    /**
     * @function handleSaveClick - Handles the main "Save Configurations" button click.
     * It calls the `onSave` prop passed from the parent and, upon success,
     * updates the `originalConfigs` baseline to match the newly saved `draftConfigs`.
     */
    const handleSaveClick = async () => {
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            await onSave(device._id, draftConfigs);
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
    
    /**
     * @function handleAttemptBack - Handles the "Back" button click.
     * If there are unsaved changes, it shows the confirmation prompt. Otherwise, it navigates back immediately.
     */
    const handleAttemptBack = () => {
        if (hasUnsavedChanges()) {
            setShowUnsavedPrompt(true);
        } else {
            onBack();
        }
    };

    /**
     * @function handleDiscardAndExit - Handles the "Discard & Exit" action from the modal.
     */
    const handleDiscardAndExit = () => {
        setShowUnsavedPrompt(false);
        onBack();
    };

    /**
     * @function handleSaveAndExit - Handles the "Save & Exit" action from the modal.
     */
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
    
    /**
     * @function getSaveButtonContent
     * @returns {JSX.Element} - The dynamic content for the save button.
     */
    const getSaveButtonContent = () => {
        if (isSaving) {
            return <><LoaderCircle size={16} className={styles['spinner']} /><span>Saving...</span></>;
        }
        if (saveSuccess) {
            return <><Check size={16} /><span>Saved!</span></>;
        }
        return <><Save size={16} /><span>Save Configurations</span></>;
    };

    // --- RENDER LOGIC ---

    if (!draftConfigs) {
        return <div>Loading configurations...</div>;
    }

    const deviceStatus = device.currentState?.status || 'Offline';

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

                {deviceStatus === 'Online' ? (
                    <div className={styles['settings-container']}>
                        {/* --- Alert Thresholds Panel --- */}
                        <CollapsiblePanel
                            title="Alert Thresholds"
                            icon={<AlertTriangle size={18} className={`${styles['header-icon']} ${styles['icon-alerts']}`} />}
                            isOpen={openPanels.alerts}
                            onToggle={() => handleTogglePanel('alerts')}
                        >
                            {/* pH Level */}
                            <ThresholdGroup label="pH Level">
                                {draftConfigs?.thresholds?.ph ? (
                                    <>
                                        <div className={styles['input-row-4-col']}>
                                            <InputField label="Warning Low" value={draftConfigs.thresholds.ph.warnLow} onChange={e => handleDeepChange(['thresholds', 'ph', 'warnLow'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Critical Low" value={draftConfigs.thresholds.ph.critLow} onChange={e => handleDeepChange(['thresholds', 'ph', 'critLow'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Warning High" value={draftConfigs.thresholds.ph.warnHigh} onChange={e => handleDeepChange(['thresholds', 'ph', 'warnHigh'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Critical High" value={draftConfigs.thresholds.ph.critHigh} onChange={e => handleDeepChange(['thresholds', 'ph', 'critHigh'], parseFloat(e.target.value) || 0)} />
                                        </div>
                                        <div className={styles['input-row-2-col']}>
                                            <InputField label="Back to Normal (Low)" value={draftConfigs.thresholds.ph.normalLow} onChange={e => handleDeepChange(['thresholds', 'ph', 'normalLow'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Back to Normal (High)" value={draftConfigs.thresholds.ph.normalHigh} onChange={e => handleDeepChange(['thresholds', 'ph', 'normalHigh'], parseFloat(e.target.value) || 0)} />
                                        </div>
                                    </>
                                ) : <NotConfiguredMessage />}
                            </ThresholdGroup>

                            {/* Turbidity */}
                            <ThresholdGroup label="Turbidity (NTU)">
                                {draftConfigs?.thresholds?.turbidity ? (
                                    <>
                                        <div className={styles['input-row-2-col']}>
                                            <InputField label="Warning Threshold" value={draftConfigs.thresholds.turbidity.warn} onChange={e => handleDeepChange(['thresholds', 'turbidity', 'warn'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Critical Threshold" value={draftConfigs.thresholds.turbidity.crit} onChange={e => handleDeepChange(['thresholds', 'turbidity', 'crit'], parseFloat(e.target.value) || 0)} />
                                        </div>
                                        <div className={styles['input-row-2-col']}>
                                            <InputField label="Back to Normal (Low)" value={draftConfigs.thresholds.turbidity.normalLow} onChange={e => handleDeepChange(['thresholds', 'turbidity', 'normalLow'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Back to Normal (High)" value={draftConfigs.thresholds.turbidity.normalHigh} onChange={e => handleDeepChange(['thresholds', 'turbidity', 'normalHigh'], parseFloat(e.target.value) || 0)} />
                                        </div>
                                    </>
                                ) : <NotConfiguredMessage />}
                            </ThresholdGroup>

                            {/* TDS */}
                            <ThresholdGroup label="TDS (mg/L)">
                                {draftConfigs?.thresholds?.tds ? (
                                    <>
                                        <div className={styles['input-row-2-col']}>
                                            <InputField label="Warning Threshold" value={draftConfigs.thresholds.tds.warn} onChange={e => handleDeepChange(['thresholds', 'tds', 'warn'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Critical Threshold" value={draftConfigs.thresholds.tds.crit} onChange={e => handleDeepChange(['thresholds', 'tds', 'crit'], parseFloat(e.target.value) || 0)} />
                                        </div>
                                        <div className={styles['input-row-2-col']}>
                                            <InputField label="Back to Normal (Low)" value={draftConfigs.thresholds.tds.normalLow} onChange={e => handleDeepChange(['thresholds', 'tds', 'normalLow'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Back to Normal (High)" value={draftConfigs.thresholds.tds.normalHigh} onChange={e => handleDeepChange(['thresholds', 'tds', 'normalHigh'], parseFloat(e.target.value) || 0)} />
                                        </div>
                                    </>
                                ) : <NotConfiguredMessage />}
                            </ThresholdGroup>

                            {/* Temperature */}
                            <ThresholdGroup label="Temperature (°C)">
                                {draftConfigs?.thresholds?.temp ? (
                                    <>
                                        <div className={styles['input-row-4-col']}>
                                            <InputField label="Warning Low" value={draftConfigs.thresholds.temp.warnLow} onChange={e => handleDeepChange(['thresholds', 'temp', 'warnLow'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Critical Low" value={draftConfigs.thresholds.temp.critLow} onChange={e => handleDeepChange(['thresholds', 'temp', 'critLow'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Warning High" value={draftConfigs.thresholds.temp.warnHigh} onChange={e => handleDeepChange(['thresholds', 'temp', 'warnHigh'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Critical High" value={draftConfigs.thresholds.temp.critHigh} onChange={e => handleDeepChange(['thresholds', 'temp', 'critHigh'], parseFloat(e.target.value) || 0)} />
                                        </div>
                                        <div className={styles['input-row-2-col']}>
                                            <InputField label="Back to Normal (Low)" value={draftConfigs.thresholds.temp.normalLow} onChange={e => handleDeepChange(['thresholds', 'temp', 'normalLow'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Back to Normal (High)" value={draftConfigs.thresholds.temp.normalHigh} onChange={e => handleDeepChange(['thresholds', 'temp', 'normalHigh'], parseFloat(e.target.value) || 0)} />
                                        </div>
                                    </>
                                ) : <NotConfiguredMessage />}
                            </ThresholdGroup>
                        </CollapsiblePanel>

                        {/* --- Alert Logging Intervals Panel --- */}
                        <CollapsiblePanel
                            title="Alert Logging Intervals"
                            icon={<History size={18} className={`${styles['header-icon']} ${styles['icon-logging']}`} />}
                            isOpen={openPanels.logging}
                            onToggle={() => handleTogglePanel('logging')}
                        >
                            <ThresholdGroup label="Active Alert → Recent Alert">
                                <SelectField value={draftConfigs.logging?.alertIntervals?.activeToRecent} onChange={e => handleDeepChange(['logging', 'alertIntervals', 'activeToRecent'], parseInt(e.target.value))} options={[15, 30, 45, 60]} unit="seconds" />
                            </ThresholdGroup>
                            <ThresholdGroup label="Recent Alert → History">
                                <SelectField value={draftConfigs.logging?.alertIntervals?.recentToHistory} onChange={e => handleDeepChange(['logging', 'alertIntervals', 'recentToHistory'], parseInt(e.target.value))} options={[5, 10, 15, 30, 60]} unit="minutes" />
                            </ThresholdGroup>
                        </CollapsiblePanel>

                        {/* --- Pump Cycle Intervals Panel --- */}
                        <CollapsiblePanel
                            title="Pump Cycle Intervals"
                            icon={<RefreshCw size={18} className={`${styles['header-icon']} ${styles['icon-testing']}`} />}
                            isOpen={openPanels.testing}
                            onToggle={() => handleTogglePanel('testing')}
                        >
                            <ThresholdGroup label="Draining Time">
                                <SelectField value={draftConfigs.controls?.pumpCycleIntervals?.drain} onChange={e => handleDeepChange(['controls', 'pumpCycleIntervals', 'drain'], parseInt(e.target.value))} options={[1, 2, 3, 4, 5]} unit="minutes" />
                            </ThresholdGroup>
                            <ThresholdGroup label="Delay before Filling">
                                <SelectField value={draftConfigs.controls?.pumpCycleIntervals?.delay} onChange={e => handleDeepChange(['controls', 'pumpCycleIntervals', 'delay'], parseInt(e.target.value))} options={[1, 2, 3, 4, 5]} unit="minutes" />
                            </ThresholdGroup>
                            <ThresholdGroup label="Filling Duration">
                                <SelectField value={draftConfigs.controls?.pumpCycleIntervals?.fill} onChange={e => handleDeepChange(['controls', 'pumpCycleIntervals', 'fill'], parseInt(e.target.value))} options={[1, 2, 3, 4, 5]} unit="minutes" />
                            </ThresholdGroup>
                        </CollapsiblePanel>
                        
                        {/* --- Valve Shut-off Thresholds Panel --- */}
                        <CollapsiblePanel
                            title="Valve Shut-off Thresholds"
                            icon={<PowerOff size={18} className={`${styles['header-icon']} ${styles['icon-shutoff']}`} />}
                            isOpen={openPanels.shutoff}
                            onToggle={() => handleTogglePanel('shutoff')}
                        >
                            {draftConfigs?.controls?.valveShutOff ? (
                                <>
                                    <ThresholdGroup label="Shut-Off on pH">
                                        <div className={styles['input-row-2-col']}>
                                            <InputField label="Critical Low" value={draftConfigs.controls.valveShutOff.phLow} onChange={e => handleDeepChange(['controls', 'valveShutOff', 'phLow'], parseFloat(e.target.value) || 0)} />
                                            <InputField label="Critical High" value={draftConfigs.controls.valveShutOff.phHigh} onChange={e => handleDeepChange(['controls', 'valveShutOff', 'phHigh'], parseFloat(e.target.value) || 0)} />
                                        </div>
                                    </ThresholdGroup>
                                    <ThresholdGroup label="Shut-Off on Turbidity">
                                        <div className={styles['input-row-1-col']}>
                                            <InputField label="Critical Threshold" value={draftConfigs.controls.valveShutOff.turbidityCrit} onChange={e => handleDeepChange(['controls', 'valveShutOff', 'turbidityCrit'], parseFloat(e.target.value) || 0)} />
                                        </div>
                                    </ThresholdGroup>
                                    <ThresholdGroup label="Shut-Off on TDS">
                                        <div className={styles['input-row-1-col']}>
                                            <InputField label="Critical Threshold" value={draftConfigs.controls.valveShutOff.tdsCrit} onChange={e => handleDeepChange(['controls', 'valveShutOff', 'tdsCrit'], parseFloat(e.target.value) || 0)} />
                                        </div>
                                    </ThresholdGroup>
                                    <div className={styles['global-rule-divider']}></div>
                                    <ThresholdGroup label="Valve Rule">
                                        <YesNoSelect
                                            label="Auto Re-open Valve once the alert is cleared?"
                                            value={draftConfigs.controls.valveOpenOnNormal?.enabled ? 'yes' : 'no'}
                                            onChange={e => handleDeepChange(['controls', 'valveOpenOnNormal', 'enabled'], e.target.value === 'yes')}
                                        />
                                    </ThresholdGroup>
                                </>
                            ) : <NotConfiguredMessage />}
                        </CollapsiblePanel>
                    </div>
                ) : (
                    <div className={styles['offline-device']}>
                        <div className={styles['offline-card']}>
                            <div className={styles['icon-wrapper']}><WifiOff size={50}/></div>
                            <h4>{device.label} is currently offline</h4>
                            <p>You cannot configure this device's <br /> settings while its offline.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* --- UNSAVED CHANGES MODAL --- */}
            {showUnsavedPrompt && (
                <div className={`${styles.modalBackdrop} ${styles.confirmationModalBackdrop}`}>
                    <div className={`${styles.modalContent} ${styles.confirmationModalContent}`}>
                        <div className={styles.icon}><AlertTriangle size={48} /></div>
                        <h4>Unsaved Changes</h4>
                        <p>You have unsaved changes. How would you like to proceed?</p>
                        <div className={styles.modalFooter}>
                            <button onClick={() => setShowUnsavedPrompt(false)} className={styles.buttonTertiary} disabled={isSaving}>Stay on Page</button>
                            <button onClick={handleDiscardAndExit} className={styles.buttonSecondary} disabled={isSaving}>Discard & Exit</button>
                            <button onClick={handleSaveAndExit} className={styles.buttonPrimary} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save & Exit'}</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// --- HELPER COMPONENTS ---

/**
 * A reusable collapsible panel component for the accordion layout.
 */
const CollapsiblePanel = ({ icon, title, isOpen, onToggle, children }) => {
    return (
        <div className={styles['collapsible-panel']}>
            <div className={styles['collapsible-header']} onClick={onToggle}>
                <div className={styles['header-title-group']}>
                    {icon}
                    <h4>{title}</h4>
                </div>
                <ChevronDown size={20} className={`${styles['chevron-icon']} ${isOpen ? styles['open'] : ''}`} />
            </div>
            <div className={`${styles['collapsible-content']} ${isOpen ? styles['open'] : ''}`}>
                <div className={styles['content-inner']}>
                    {children}
                </div>
            </div>
        </div>
    );
};

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
        {options && options.map(o => <option key={o} value={o}>Every {o} {unit}</option>)}
    </select>
);

/**
 * NEW: A reusable select component for Yes/No options.
 * @param {string} label - The label for the select field.
 * @param {string} value - The current value ('yes' or 'no').
 * @param {function} onChange - The function to call when the value changes.
 */
const YesNoSelect = ({ label, value, onChange }) => (
    <div className={styles['input-field']}>
        <label>{label}</label>
        <select value={value} onChange={onChange} className={styles['select-field']}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
        </select>
    </div>
);

export default ConfigurationSettings;
