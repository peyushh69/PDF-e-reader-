import React from 'react';

export interface PageIllustrationData {
  title: string;
  subtitle: string;
  type: 'ecg' | 'radiology' | 'cardio-pv' | 'cardio-echo' | 'cardio-gdmt' | 'eink-capsule' | 'eink-power' | 'eink-frontlight' | 'gatsby-dock' | 'hume-peace' | 'anatomy-brain' | 'anatomy-liver' | 'fracture-salter' | 'generic';
  caption: string;
  description: string;
}

// Built-in illustration database for sample books by bookId and pageNumber
export const SAMPLE_BOOK_ILLUSTRATIONS: Record<string, Record<number, PageIllustrationData>> = {
  'book-clinical-cardiology': {
    1: {
      title: 'Figure 1.1: Cardiac Conduction & Action Potential Propagation',
      subtitle: 'SA Node → AV Node Delay → His-Purkinje Ventricular Depolarization',
      type: 'ecg',
      caption: 'Physiological sequence of electrical activation showing synchronized P-QRS-T axis.',
      description: 'The sinoatrial node initiates depolarization at 60-100 bpm. Note the 0.09s physiological AV nodal conduction delay allowing optimal atrial booster pump filling before rapid Purkinje activation (4 m/s). Mean QRS frontal axis: +60°.'
    },
    2: {
      title: 'Chart 2.1: 12-Lead Ischemia Patterns & High-Sensitivity Troponin Kinetics',
      subtitle: 'ST-Elevation Myocardial Infarction (STEMI) Regional Coronary Territories',
      type: 'ecg',
      caption: 'Comparative morphology of Tombstoning ST Elevation (V1-V4 LAD) vs Reciprocal Depression (II, III, aVF).',
      description: 'Acute transmural ischemia generates severe J-point elevation. Serum hs-cTnI rises at 2-3 hours, peaking at 12-24 hours with persistent myocardial release detectable through day 10.'
    },
    3: {
      title: 'Figure 3.1: Differential Diagnosis of Tachyarrhythmias',
      subtitle: 'Ventricular Tachycardia (VT) vs Atrial Fibrillation (AFib) Rhythm Strips',
      type: 'ecg',
      caption: 'Wide-complex regular monomorphic VT (>140 bpm) with AV dissociation and capture beats.',
      description: 'Ventricular tachycardia demonstrates wide QRS (>120ms) with concordant precordial vector, distinguishing it from supraventricular tachycardia with aberrancy according to the Brugada and Vereckei algorithms.'
    },
    4: {
      title: 'Figure 4.1: Echocardiography Doppler & Global Longitudinal Strain (GLS)',
      subtitle: 'Mitral Inflow E/A Ratio & 17-Segment Left Ventricular Peak Systolic Strain',
      type: 'cardio-echo',
      caption: 'Bullseye polar map showing normal apex strain (-21%) with impaired basal anteroseptal strain.',
      description: 'Speckle-tracking echocardiography allows sensitive detection of subclinical systolic impairment before global LVEF decline occurs. Normal adult global longitudinal strain is <= -18%.'
    },
    5: {
      title: 'Figure 5.2: Left Ventricular Pressure-Volume (PV) Loop in Severe Aortic Stenosis',
      subtitle: 'End-Systolic Pressure Elevation & Concentric Hypertrophy Elastance Shift',
      type: 'cardio-pv',
      caption: 'Triangular PV loop deformation showing markedly elevated peak intraventricular systolic pressure (210 mmHg).',
      description: 'Fixed transvalvular outflow resistance increases left ventricular afterload, resulting in steep end-systolic elastance (Ees) and reduced stroke volume with compensatory concentric wall thickening.'
    },
    6: {
      title: 'Flowchart 6.1: Guideline-Directed Medical Therapy (GDMT) 4-Pillar Algorithm',
      subtitle: 'Quadruple Neurohormonal & Metabolic Blockade in HFrEF',
      type: 'cardio-gdmt',
      caption: 'Concurrent initiation of ARNI (Sacubitril/Valsartan), Beta-Blocker, MRA, and SGLT2 Inhibitor.',
      description: 'Modern heart failure guidelines mandate rapid 4-pillar initiation to achieve a cumulative 73% relative reduction in 2-year all-cause mortality compared to historical monotherapy.'
    }
  },
  'book-radiology-atlas': {
    1: {
      title: 'Radiograph 1.1: Posteroanterior (PA) Chest Radiograph (ABCDEF Systematic Grid)',
      subtitle: 'Standard Inspiratory PA Projection with Crisp Costophrenic Angles',
      type: 'radiology',
      caption: 'Normal cardiothoracic ratio (CTR 0.42), sharp bilateral costophrenic recesses, and midline trachea.',
      description: 'Methodical interpretation: A (Airway patent), B (Bilateral lung fields clear without consolidations or pneumothorax), C (Normal heart size < 50%), D (Right hemidiaphragm 2cm above left), E (Bony thorax intact), F (No foreign lines).'
    },
    2: {
      title: 'Scan 2.1: Hyperacute Ischemic Stroke (Head CT vs MRI DWI/ADC Mismatch)',
      subtitle: 'Exclusion of Hemorrhage on Non-Contrast CT & Diffusion Restriction on MRI',
      type: 'anatomy-brain',
      caption: 'Cytotoxic edema visualised as hyperintense signal on Diffusion-Weighted Imaging (DWI) within 30 min of MCA occlusion.',
      description: 'While non-contrast CT appears normal in the first 3 hours (ideal for ruling out hemorrhagic stroke prior to IV alteplase/tenecteplase), MRI DWI demonstrates cellular water restriction immediately.'
    },
    3: {
      title: 'Scan 3.1: Triphasic Contrast-Enhanced Hepatic Computed Tomography',
      subtitle: 'Late Arterial Hyperenhancement (35s) & Venous Washout Kinetics',
      type: 'anatomy-liver',
      caption: 'Classic LI-RADS 5 hallmark: rapid contrast uptake in arterial phase followed by portal venous phase pseudocapsule washout.',
      description: 'Triphasic scanning enables definitive non-invasive diagnosis of hepatocellular carcinoma by capturing arterial neoangiogenesis and distinct tumor microvascular hemodynamics.'
    },
    4: {
      title: 'Figure 4.1: Salter-Harris Pediatric Epiphyseal Plate Fracture Classifications',
      subtitle: 'Types I through V Fracture Lines Across the Physis, Metaphysis, and Epiphysis',
      type: 'fracture-salter',
      caption: 'Mnemonic SALTR: S (Straight across physis), A (Above/Metaphysis), L (Lower/Epiphysis), T (Through all three), R (Rammed/Crushed).',
      description: 'Accurate classification is critical to predict growth arrest. Type II (fracture extending through physis into metaphysis with Thurston-Holland fragment) is the most common (75%).'
    },
    5: {
      title: 'Chart 5.1: Clinical Radiation Dosimetry & ALARA Principle Spectrum',
      subtitle: 'Effective Dose (mSv) Comparisons: Chest X-Ray vs Head CT vs Abdominal CT',
      type: 'cardio-gdmt',
      caption: 'Relative radiation exposure benchmarked against annual natural background radiation (2.4 mSv/year).',
      description: 'ALARA (As Low As Reasonably Achievable) requires pediatric dose reduction protocols, tube current modulation, and substitution with ultrasound or MRI whenever clinically appropriate.'
    }
  },
  'book-eink-systems': {
    1: {
      title: 'Schematic 1.1: Microencapsulated Electrophoretic Display Architecture',
      subtitle: 'Oppositely Charged TiO2 White & Carbon Black Pigments Under Applied Voltage',
      type: 'eink-capsule',
      caption: 'Positive top electrode attracts negatively charged black particles, rendering crisp black typography.',
      description: 'Millions of microcapsules (diameter ~40µm) contain positively charged titanium dioxide white particles and negatively charged carbon black particles suspended in a dielectric fluid.'
    },
    2: {
      title: 'Diagram 2.1: Bi-Stable Zero-Power Consumption Comparison',
      subtitle: 'E-Ink Static Reflectance vs LCD/OLED Continuous Active Refresh Power Draw',
      type: 'eink-power',
      caption: 'Power is consumed exclusively during the 120ms page flip waveform transition; 0.0mW in static hold.',
      description: 'Bi-stability allows E-Ink readers to last weeks on a single charge because particles remain physically locked in place without electrical potential.'
    },
    3: {
      title: 'Diagram 3.1: Dual-Array Optical Light Guide & Color Temperature Matrix',
      subtitle: 'Amber (2700K) & Daylight (6500K) Micro-Diffuser Waveguide Reflection',
      type: 'eink-frontlight',
      caption: 'Frontlight illumination bounces light downwards onto the E-Ink surface rather than projecting directly into the reader eyes.',
      description: 'Precision laser-etched light extraction dots distribute LED light uniformly across the Carta 1200 panel, eliminating hot spots and glare.'
    }
  },
  'book-great-gatsby': {
    1: {
      title: 'Illustration 1.1: The Green Light at Daisy’s Long Island Dock',
      subtitle: 'Atmospheric Nocturnal Harbor Silhouette & The Unreachable Dream',
      type: 'gatsby-dock',
      caption: 'Gatsby standing at the water’s edge with arms outstretched toward the pulsing green harbor beacon.',
      description: 'A visual realization of Fitzgerald’s iconic motif: "He stretched out his arms toward the dark water in a curious way... nothing except a single green light, minute and far away, that might have been the end of a dock."'
    },
    5: {
      title: 'Illustration 5.1: Boats Against the Current',
      subtitle: 'The Great Long Island Sound Harbor & The Ceaseless Past',
      type: 'gatsby-dock',
      caption: 'Silhouettes of wooden sloops navigating twilight tides against the historic Long Island current.',
      description: '"So we beat on, boats against the current, borne back ceaselessly into the past."'
    }
  },
  'book-john-hume': {
    1: {
      title: 'Archive 1.1: The Derry Peace Movement & Credit Union Founding (1960)',
      subtitle: 'Historical Non-Violence Architecture & Democratic Regional Vision',
      type: 'hume-peace',
      caption: 'John Hume addressing the historic civil rights gathering in the Bogside, Derry.',
      description: 'Archival representation of the foundational civil rights movement where Hume famously asserted: "Not a single drop of blood is worth a single comma in a political agreement."'
    },
    5: {
      title: 'Archive 5.1: The Good Friday Agreement & 1998 Nobel Peace Lecture',
      subtitle: 'Bipartisan Accord & The Principle of Respect for Difference',
      type: 'hume-peace',
      caption: 'The historic accord rostrum: "Difference is the essence of humanity."',
      description: 'Commemorating the 1998 Nobel Peace Prize co-awarded to John Hume for brokering the peaceful, democratic transition of Northern Ireland.'
    }
  }
};

interface RenderIllustrationProps {
  illustration: PageIllustrationData;
  isDark?: boolean;
  onExpand?: () => void;
}

export const RenderIllustration: React.FC<RenderIllustrationProps> = ({
  illustration,
  isDark = true,
  onExpand,
}) => {
  const { type, title, subtitle, caption } = illustration;

  return (
    <div
      onClick={onExpand}
      className={`my-4 rounded-xl border transition cursor-pointer overflow-hidden group shadow-sm ${
        isDark
          ? 'bg-[#0f1412] border-stone-800 hover:border-emerald-500/50'
          : 'bg-stone-50 border-stone-200 hover:border-emerald-600/50'
      }`}
    >
      {/* Header */}
      <div className={`px-3 py-2 border-b flex items-center justify-between font-sans text-xs ${
        isDark ? 'border-stone-800/80 bg-stone-900/60' : 'border-stone-200/80 bg-white/70'
      }`}>
        <div className="min-w-0 pr-2">
          <div className="font-bold truncate text-emerald-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>{title}</span>
          </div>
          <div className={`text-[10px] truncate ${isDark ? 'text-stone-400' : 'text-stone-600'}`}>
            {subtitle}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExpand?.();
          }}
          className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 shadow-xs transition"
        >
          Zoom & Inspect
        </button>
      </div>

      {/* Visual Canvas Graphic */}
      <div className={`p-3 flex items-center justify-center min-h-[140px] ${
        isDark ? 'bg-[#060a08]' : 'bg-[#f4f7f4]'
      }`}>
        {type === 'ecg' ? (
          <div className="w-full space-y-1.5 font-mono text-[10px]">
            <div className="flex justify-between text-emerald-400 font-semibold px-1">
              <span>LEAD II (25mm/s • 10mm/mV)</span>
              <span className="opacity-80">HR: 74 BPM | Normal Sinus Rhythm</span>
            </div>
            <div className="w-full h-28 bg-[#04140d] rounded-lg border border-emerald-900/60 p-1.5 relative flex items-center justify-center overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 600 110" preserveAspectRatio="none">
                <defs>
                  <pattern id="reflowEcgGrid" width="15" height="15" patternUnits="userSpaceOnUse">
                    <path d="M 15 0 L 0 0 0 15" fill="none" stroke="#08291a" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#reflowEcgGrid)" />
                <path
                  d="M 0,55 L 30,55 Q 35,50 40,55 L 48,55 L 52,58 L 56,12 L 60,95 L 64,55 L 80,55 Q 92,38 105,55 L 150,55 Q 155,50 160,55 L 168,55 L 172,58 L 176,12 L 180,95 L 184,55 L 200,55 Q 212,38 225,55 L 270,55 Q 275,50 280,55 L 288,55 L 292,58 L 296,12 L 300,95 L 304,55 L 320,55 Q 332,38 345,55 L 390,55 Q 395,50 400,55 L 408,55 L 412,58 L 416,12 L 420,95 L 424,55 L 440,55 Q 452,38 465,55 L 510,55 Q 515,50 520,55 L 528,55 L 532,58 L 536,12 L 540,95 L 544,55 L 560,55 Q 572,38 585,55 L 600,55"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        ) : type === 'radiology' ? (
          <div className="w-full space-y-1.5 font-sans text-[10px]">
            <div className="flex justify-between text-sky-400 font-semibold px-1">
              <span>PA CHEST RADIOGRAPH (ABCDEF SYSTEMATIC GRID)</span>
              <span className="opacity-80">CTR: 0.42 | Clear Apices</span>
            </div>
            <div className="w-full h-32 bg-stone-950 rounded-lg border border-sky-900/60 p-2 relative flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 360 160">
                <path d="M 155,5 L 205,5 L 205,35 L 155,35 Z" fill="#262626" stroke="#525252" />
                <text x="180" y="22" textAnchor="middle" fill="#a3a3a3" fontSize="8">Trachea Midline</text>
                <path d="M 65,40 Q 125,30 160,70 Q 150,150 95,150 Q 50,130 65,40 Z" fill="#141414" stroke="#38bdf8" strokeWidth="1.5" />
                <path d="M 295,40 Q 235,30 200,70 Q 210,150 265,150 Q 310,130 295,40 Z" fill="#141414" stroke="#38bdf8" strokeWidth="1.5" />
                <path d="M 155,80 Q 120,115 140,145 Q 210,145 200,95 Q 180,80 155,80 Z" fill="#383838" stroke="#f87171" strokeWidth="1.5" />
                <text x="165" y="120" textAnchor="middle" fill="#fca5a5" fontSize="9" fontWeight="bold">Heart Silhouette</text>
                <circle cx="90" cy="145" r="3" fill="#34d399" />
                <circle cx="270" cy="145" r="3" fill="#34d399" />
                <text x="90" y="156" textAnchor="middle" fill="#86efac" fontSize="7">Costophrenic</text>
                <text x="270" y="156" textAnchor="middle" fill="#86efac" fontSize="7">Costophrenic</text>
              </svg>
            </div>
          </div>
        ) : type === 'cardio-pv' ? (
          <div className="w-full space-y-1.5 font-sans text-[10px]">
            <div className="flex justify-between text-amber-400 font-semibold px-1">
              <span>LV PRESSURE-VOLUME LOOP (AORTIC STENOSIS)</span>
              <span className="opacity-80">Peak LV Pressure: 210 mmHg</span>
            </div>
            <div className="w-full h-32 bg-stone-950 rounded-lg border border-amber-900/60 p-2 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 340 140">
                <line x1="40" y1="120" x2="300" y2="120" stroke="#78716c" strokeWidth="1" />
                <line x1="40" y1="120" x2="40" y2="15" stroke="#78716c" strokeWidth="1" />
                <text x="170" y="134" textAnchor="middle" fill="#a8a29e" fontSize="7">Left Ventricular Volume (mL)</text>
                <text x="20" y="70" textAnchor="middle" fill="#a8a29e" fontSize="7" transform="rotate(-90 20 70)">Pressure (mmHg)</text>
                <path d="M 70,110 L 70,30 Q 140,15 200,45 L 200,110 Z" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
                <text x="130" y="60" textAnchor="middle" fill="#fcd34d" fontSize="8" fontWeight="bold">Severe Aortic Stenosis Loop</text>
                <path d="M 90,110 L 90,65 Q 140,60 180,70 L 180,110 Z" fill="none" stroke="#60a5fa" strokeWidth="1.5" />
                <text x="135" y="95" textAnchor="middle" fill="#93c5fd" fontSize="7">Normal Resting Loop</text>
              </svg>
            </div>
          </div>
        ) : type === 'eink-capsule' ? (
          <div className="w-full space-y-1.5 font-sans text-[10px]">
            <div className="flex justify-between text-cyan-400 font-semibold px-1">
              <span>ELECTROPHORETIC MICROCAPSULE SCHEMATIC</span>
              <span className="opacity-80">Carta 1200 Waveform State</span>
            </div>
            <div className="w-full h-32 bg-stone-950 rounded-lg border border-cyan-900/60 p-2 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 340 130">
                <rect x="20" y="10" width="300" height="8" fill="#38bdf8" opacity="0.5" />
                <text x="170" y="17" textAnchor="middle" fill="#bae6fd" fontSize="7">Transparent Top Electrode (+)</text>
                <circle cx="80" cy="65" r="28" fill="#1c1917" stroke="#d97706" strokeWidth="1.5" />
                <circle cx="170" cy="65" r="28" fill="#1c1917" stroke="#d97706" strokeWidth="1.5" />
                <circle cx="260" cy="65" r="28" fill="#1c1917" stroke="#d97706" strokeWidth="1.5" />
                <circle cx="80" cy="50" r="4" fill="#ffffff" />
                <circle cx="72" cy="55" r="4" fill="#ffffff" />
                <circle cx="88" cy="55" r="4" fill="#ffffff" />
                <circle cx="80" cy="78" r="4" fill="#525252" />
                <text x="170" y="68" textAnchor="middle" fill="#fde68a" fontSize="8">Microcapsule (40µm)</text>
                <rect x="20" y="112" width="300" height="8" fill="#78716c" />
                <text x="170" y="119" textAnchor="middle" fill="#e7e5e4" fontSize="7">Bottom Active Matrix Grid (-)</text>
              </svg>
            </div>
          </div>
        ) : type === 'gatsby-dock' ? (
          <div className="w-full space-y-1.5 font-serif text-[10px]">
            <div className="flex justify-between text-emerald-400 font-semibold px-1">
              <span>LONG ISLAND SOUND NOCTURNE</span>
              <span className="opacity-80">The Green Beacon at Daisy’s Dock</span>
            </div>
            <div className="w-full h-32 bg-[#020b08] rounded-lg border border-emerald-900/60 p-2 relative flex items-center justify-center overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 340 130">
                <defs>
                  <radialGradient id="greenLightGlow" cx="80%" cy="30%" r="50%">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.9" />
                    <stop offset="30%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#020b08" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <rect width="100%" height="100%" fill="#030f0a" />
                <rect x="200" y="0" width="140" height="130" fill="url(#greenLightGlow)" />
                <path d="M 0,90 Q 90,85 180,95 T 340,90 L 340,130 L 0,130 Z" fill="#010604" />
                <line x1="280" y1="40" x2="280" y2="88" stroke="#34d399" strokeWidth="1.5" />
                <circle cx="280" cy="40" r="4" fill="#6ee7b7" className="animate-pulse" />
                <rect x="20" y="85" width="45" height="12" fill="#091c13" stroke="#10b981" strokeWidth="0.5" />
                <circle cx="45" cy="72" r="5" fill="#091c13" />
                <line x1="45" y1="77" x2="45" y2="92" stroke="#091c13" strokeWidth="2" />
                <text x="170" y="118" textAnchor="middle" fill="#6ee7b7" fontSize="8" fontStyle="italic">"A single green light, minute and far away..."</text>
              </svg>
            </div>
          </div>
        ) : (
          <div className="w-full h-28 bg-stone-950 rounded-lg border border-stone-800 p-2 flex flex-col items-center justify-center text-center space-y-1">
            <span className="text-emerald-400 font-bold text-xs">{title}</span>
            <span className="text-stone-400 text-[10px]">{subtitle}</span>
          </div>
        )}
      </div>

      {/* Caption footer */}
      <div className={`px-3 py-1.5 text-[10px] leading-relaxed font-sans ${
        isDark ? 'text-stone-400 bg-stone-950/70' : 'text-stone-600 bg-white/70'
      }`}>
        <span className="font-semibold text-emerald-500 mr-1">Detail:</span>
        {caption}
      </div>
    </div>
  );
};
