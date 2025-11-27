import React from 'react';
import Style from '../../Styles/Readings.module.css';
import { X, CheckCircle2, AlertTriangle, ShieldAlert, Info, ExternalLink } from 'lucide-react';

// --- CITATION SOURCES CONFIGURATION ---
// You can switch between 'EPA' (International) and 'PNSDW' (Philippines Local)
const SOURCE_TYPE = 'PNSDW'; 

const SOURCES = {

    // Philippine National Standards for Drinking Water (AO 2017-0010)
    PNSDW: {
        PH: {
             // Added definitions for Acidic/Alkaline
            text: "PNSDW 2017 mandates an acceptable range of 6.5 to 8.5. Values below this are Acidic, and values above are Alkaline. 7.0 is Neutral.",
            url: "https://www.fda.gov.ph/wp-content/uploads/2021/08/Administrative-Order-No.-2017-0010.pdf"
        },
        TURBIDITY: {
             // Added definition for clear
            text: "PNSDW 2017 sets the Maximum Allowable Level at 5 NTU. Water complying with this is generally considered visually 'Clear' and free from objectionable matter.",
            url: "https://www.fda.gov.ph/wp-content/uploads/2021/08/Administrative-Order-No.-2017-0010.pdf"
        },
        TDS: {
            text: "PNSDW generally adopts WHO guidelines. Levels below 600 mg/L are considered to have 'Good' palatability, becoming increasingly unacceptable above 1000 mg/L.",
            url: "https://www.fda.gov.ph/wp-content/uploads/2021/08/Administrative-Order-No.-2017-0010.pdf"
        },
        TEMP: {
            text: "PNSDW requires drinking water to be free from objectionable taste and odor. Cool water is preferred; warm temperatures may indicate issues.",
            url: "https://www.fda.gov.ph/wp-content/uploads/2021/08/Administrative-Order-No.-2017-0010.pdf"
        }
    }
};

const ThresholdsModal = ({ isOpen, onClose, title, paramKey, thresholds }) => {
    if (!isOpen || !thresholds) return null;

    const rules = thresholds[paramKey.toLowerCase()];
    if (!rules) return null;

    const isRangeBased = paramKey === 'PH' || paramKey === 'TEMP';
    
    // Select the info based on the configuration
    const sourceData = SOURCES[SOURCE_TYPE][paramKey] || { 
        text: "Standard guidelines for this parameter are not available.", 
        url: null 
    };

    const LegendItem = ({ color, icon: Icon, label, valueDesc }) => (
        <div className={Style.modalLegendItem} style={{ borderLeftColor: color }}>
            <Icon size={18} color={color} className={Style.legendIcon} />
            <div className={Style.legendText}>
                <span style={{ color: color, fontWeight: '700', fontSize: '0.85rem' }}>{label}</span>
                <p>{valueDesc}</p>
            </div>
        </div>
    );

    const Colors = {
        SAFE: '#4CAF50',
        WARNING: '#FFA500',
        CRITICAL: '#E91E63'
    };

    return (
        <div className={Style.modalOverlay} onClick={onClose}>
            <div className={Style.modalContent} onClick={e => e.stopPropagation()}>
                <div className={Style.modalHeader}>
                    <h3 className={Style.modalTitle}>{title} Thresholds</h3>
                    <button className={Style.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={Style.modalBody}>
                    <div className={Style.infoBox}>
                        <div className={Style.infoIconWrapper}>
                            <Info size={16} />
                        </div>
                        <div className={Style.infoContent}>
                            <p className={Style.infoText}>{sourceData.text}</p>
                            {sourceData.url && (
                                <a 
                                    href={sourceData.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className={Style.sourceLink}
                                >
                                    Source: {SOURCE_TYPE === 'EPA' ? 'US EPA Regulations' : 'DOH PNSDW 2017'} <ExternalLink size={10} style={{ marginLeft: '2px' }}/>
                                </a>
                            )}
                        </div>
                    </div>

                    <p className={Style.modalSubtitle}>Device Configuration:</p>

                    <div className={Style.legendContainer}>
                        {isRangeBased ? (
                            <>
                                {/* Added qualitative labels to the legend items based on the parameter type */}
                                <LegendItem
                                    color={Colors.CRITICAL}
                                    icon={ShieldAlert}
                                    label={`Unsafe (Critical Low - ${paramKey === 'PH' ? 'Acidic' : 'Cold'})`}
                                    valueDesc={`Below ${rules.critLow}`}
                                />
                                <LegendItem
                                    color={Colors.WARNING}
                                    icon={AlertTriangle}
                                    label={`Potentially Unsafe (${paramKey === 'PH' ? 'Acidic' : 'Cold'})`}
                                    valueDesc={`${rules.critLow} - ${rules.warnLow}`}
                                />
                                <LegendItem
                                    color={Colors.SAFE}
                                    icon={CheckCircle2}
                                    label={`Safe (Normal Range - ${paramKey === 'PH' ? 'Neutral' : 'Cool'})`}
                                    valueDesc={`${rules.warnLow} - ${rules.warnHigh}`}
                                />
                                <LegendItem
                                    color={Colors.WARNING}
                                    icon={AlertTriangle}
                                    label={`Potentially Unsafe (${paramKey === 'PH' ? 'Alkaline' : 'Warm'})`}
                                    valueDesc={`${rules.warnHigh} - ${rules.critHigh}`}
                                />
                                <LegendItem
                                    color={Colors.CRITICAL}
                                    icon={ShieldAlert}
                                    label={`Unsafe (Critical High - ${paramKey === 'PH' ? 'Alkaline' : 'Hot'})`}
                                    valueDesc={`Above ${rules.critHigh}`}
                                />
                            </>
                        ) : (
                            <>
                                {/* Added qualitative labels for Turbidity/TDS */}
                                <LegendItem
                                    color={Colors.SAFE}
                                    icon={CheckCircle2}
                                    label={`Safe (Normal - ${paramKey === 'TURBIDITY' ? 'Clear' : 'Good Taste'})`}
                                    valueDesc={`0 - ${rules.warn}`}
                                />
                                <LegendItem
                                    color={Colors.WARNING}
                                    icon={AlertTriangle}
                                    label={`Potentially Unsafe (${paramKey === 'TURBIDITY' ? 'Cloudy' : 'Fair Taste'})`}
                                    valueDesc={`> ${rules.warn} up to ${rules.crit}`}
                                />
                                <LegendItem
                                    color={Colors.CRITICAL}
                                    icon={ShieldAlert}
                                    label={`Unsafe (Critical - ${paramKey === 'TURBIDITY' ? 'Very Cloudy' : 'Poor Taste'})`}
                                    valueDesc={`Above ${rules.crit}`}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ThresholdsModal;