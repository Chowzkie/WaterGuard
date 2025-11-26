import React from 'react';
import Style from '../../Styles/Readings.module.css';
import { X, CheckCircle2, AlertTriangle, ShieldAlert, Info, ExternalLink } from 'lucide-react';

// Credible source information (WHO/EPA based) with links
const STANDARD_INFO = {
    PH: {
        text: "According to WHO guidelines, the pH of drinking water should generally lie between 6.5 and 8.5. Values outside this range may affect taste and disinfection efficiency.",
        url: "https://www.who.int/publications/i/item/9789241549950" // WHO Guidelines for Drinking-water Quality
    },
    TURBIDITY: {
        text: "WHO recommends turbidity should ideally be below 1 NTU for effective disinfection. Levels above 5 NTU are visible to the naked eye and can shelter bacteria.",
        url: "https://www.who.int/publications/i/item/9789241549950"
    },
    TDS: {
        text: "WHO suggests that TDS levels below 600 mg/L (ppm) are generally considered good. Levels above 1000 mg/L may result in a salty taste.",
        url: "https://www.who.int/publications/i/item/9789241549950"
    },
    TEMP: {
        text: "While there is no health-based guideline value, cool water is generally more palatable. High temperatures can encourage the growth of microorganisms.",
        url: "https://www.who.int/publications/i/item/9789241549950" 
    }
};

const ThresholdsModal = ({ isOpen, onClose, title, paramKey, thresholds }) => {
    if (!isOpen || !thresholds) return null;

    const rules = thresholds[paramKey.toLowerCase()];
    if (!rules) return null;

    const isRangeBased = paramKey === 'PH' || paramKey === 'TEMP';
    
    // Safely access info or provide default
    const infoData = STANDARD_INFO[paramKey] || { 
        text: "Standard guidelines for this parameter are not available.", 
        url: null 
    };

    // Helper to render color-coded legend items (Compacted)
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
        CRITICAL: '#e91e40ff'
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
                    {/* Standard Info Box */}
                    <div className={Style.infoBox}>
                        <div className={Style.infoIconWrapper}>
                            <Info size={16} />
                        </div>
                        <div className={Style.infoContent}>
                            <p className={Style.infoText}>{infoData.text}</p>
                            {infoData.url && (
                                <a 
                                    href={infoData.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className={Style.sourceLink}
                                >
                                    Source: WHO Guidelines <ExternalLink size={10} style={{ marginLeft: '2px' }}/>
                                </a>
                            )}
                        </div>
                    </div>

                    <p className={Style.modalSubtitle}>Device Configuration:</p>

                    <div className={Style.legendContainer}>
                        {isRangeBased ? (
                            <>
                                <LegendItem
                                    color={Colors.CRITICAL}
                                    icon={ShieldAlert}
                                    label="Unsafe (Critical Low)"
                                    valueDesc={`Below ${rules.critLow}`}
                                />
                                <LegendItem
                                    color={Colors.WARNING}
                                    icon={AlertTriangle}
                                    label="Potentially Unsafe"
                                    valueDesc={`${rules.critLow} - ${rules.warnLow}`}
                                />
                                <LegendItem
                                    color={Colors.SAFE}
                                    icon={CheckCircle2}
                                    label="Safe (Normal Range)"
                                    valueDesc={`${rules.warnLow} - ${rules.warnHigh}`}
                                />
                                <LegendItem
                                    color={Colors.WARNING}
                                    icon={AlertTriangle}
                                    label="Potentially Unsafe"
                                    valueDesc={`${rules.warnHigh} - ${rules.critHigh}`}
                                />
                                <LegendItem
                                    color={Colors.CRITICAL}
                                    icon={ShieldAlert}
                                    label="Unsafe (Critical High)"
                                    valueDesc={`Above ${rules.critHigh}`}
                                />
                            </>
                        ) : (
                            <>
                                <LegendItem
                                    color={Colors.SAFE}
                                    icon={CheckCircle2}
                                    label="Safe (Normal)"
                                    valueDesc={`0 - ${rules.warn}`}
                                />
                                <LegendItem
                                    color={Colors.WARNING}
                                    icon={AlertTriangle}
                                    label="Potentially Unsafe"
                                    valueDesc={`> ${rules.warn} up to ${rules.crit}`}
                                />
                                <LegendItem
                                    color={Colors.CRITICAL}
                                    icon={ShieldAlert}
                                    label="Unsafe (Critical)"
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