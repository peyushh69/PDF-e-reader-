import { Book, ReadingStats, ReadingStack } from '../types';
import { createPdfDataUrl } from '../utils/pdfGenerator';

export const DEFAULT_STACKS: ReadingStack[] = [
  {
    id: 'stack-reading',
    name: 'Currently Reading',
    color: '#171717',
    description: 'Active PDF documents and daily reading',
    createdAt: '2026-08-01',
  },
  {
    id: 'stack-favorites',
    name: 'Favorites & Highlights',
    color: '#525252',
    description: 'Essential PDFs and key references',
    createdAt: '2026-08-01',
  },
  {
    id: 'stack-research',
    name: 'Research & Papers',
    color: '#737373',
    description: 'Academic articles, whitepapers, and reports',
    createdAt: '2026-08-01',
  },
  {
    id: 'stack-toread',
    name: 'To Read Next',
    color: '#a3a3a3',
    description: 'Queued documents for upcoming sessions',
    createdAt: '2026-08-01',
  },
];

export const INITIAL_STATS: ReadingStats = {
  totalHours: 0,
  avgMinutesPerSession: 0,
  totalBooksFinished: 0,
  totalPagesRead: 0,
  currentStreakDays: 0,
  totalSessions: 0,
  weeklyGoalHours: 5.0,
  weeklyHoursLogged: 0,
};

// 1. Starter PDF: Deep Work & Distraction-Free Reading
const deepWorkPages = [
  {
    title: 'Chapter 1: The Sanctuary of Attention',
    paragraphs: [
      'In an age of relentless digital notification and fragmented concentration, the act of opening a document in a distraction-free reader remains one of the sovereign gestures left to the modern intellect. Solitude is not the absence of others; it is the presence of oneself.',
      'To read without the flicker of reactive notifications is to declare an armistice with the urgency of the world. When you eliminate backlit glare and infinite tab distractions, your cognitive capacity shifts from shallow scanning to sustained synthesis.',
      'Deep reading is an embodied cognitive discipline. It rewires neural pathways, fostering associative thinking and empathetic comprehension that fragmented skimming cannot replicate.'
    ],
  },
  {
    title: 'Chapter 2: The Architecture of Stillness',
    paragraphs: [
      'When we sit with a single text, holding a quiet physical page or an unlit electronic-ink display, we reclaim our cognitive cadence. The eye moves across sentences at the pace of human thought rather than the algorithmic churn of a social media feed.',
      'True comprehension requires deceleration. The mind must wander between paragraphs to digest and integrate new concepts.',
      'To highlight a passage or attach a reflection note is to enter into a dialogue with the author across time and distance.'
    ],
  },
  {
    title: 'Chapter 3: Cognitive Flow in Reading',
    paragraphs: [
      'High-performance knowledge workers achieve breakthroughs when protected from cognitive fragmentation. Structuring unbroken reading blocks of 30 to 45 minutes produces exponential retention compared to ten scattered 3-minute glances.',
      'Convert all your reading materials into reflowable formats with comfortable line heights, warm paper temperatures, and high typographic contrast.',
      'Let your reading sessions be purposeful voyages rather than passive information consumption.'
    ],
  },
  {
    title: 'Chapter 4: Daily Reading Rituals',
    paragraphs: [
      'Establish a fixed morning or evening sanctuary for dedicated document review. Pair your reading device with quiet environments and warm ambient illumination.',
      'Reflect on key annotations at the end of each session to crystallize lessons into actionable knowledge.',
      'Reading well is the ultimate superpower in an era of endless noise.'
    ],
  },
];

// 2. Starter PDF: The Architecture of Peace
const peacePages = [
  {
    title: 'Section 1: The Northern Ireland Accord',
    paragraphs: [
      'John Hume was the central architect of the Northern Ireland peace process. His vision for a new, shared society, based on democratic principles and respect for diversity, helped to transform a region scarred by decades of conflict.',
      'In Derry, where he grew up and lived his entire life, the shadow of the Troubles loomed large. Yet Hume remained steadfast in his commitment to non-violence, famously declaring that not a single drop of blood was worth a single comma in a political agreement.',
      'A native of Derry, he was a founding member of the Social Democratic and Labour Party (SDLP), and co-recipient of the 1998 Nobel Peace Prize with David Trimble.'
    ],
  },
  {
    title: 'Section 2: Principles of Pluralism',
    paragraphs: [
      'Hume articulated a simple yet profound premise: difference should not be a threat, but the very essence of humanity. Conflict arises not from diversity, but from the refusal to respect and accommodate diversity through democratic institutions.',
      'Drawing inspiration from the post-war European Coal and Steel Community, Hume demonstrated that historical adversaries could build shared institutional structures without either side surrendering its cultural heritage.',
      'The Good Friday Agreement of 1998 stands as a monument to patient diplomacy, consensus building, and the power of reasoned dialogue over armed strife.'
    ],
  },
  {
    title: 'Section 3: Dialogue and Reconciliation',
    paragraphs: [
      'In the late 1980s, Hume took what many regarded as the greatest political risk of his life by initiating direct dialogues to build an inclusive peace architecture.',
      'His conviction remained unshakeable: "If you don\'t talk to the people you disagree with, then how on earth are you going to reach agreement?"',
      'The resulting ceasefire and institutional framework proved that persistent principled negotiation can resolve the most intractable civil disputes.'
    ],
  },
  {
    title: 'Section 4: Legacy for Global Conflict Resolution',
    paragraphs: [
      'The Northern Ireland peace model offers universal lessons for modern diplomatic engagement: protect minority rights, establish parity of esteem, and institutionalize economic partnership across disputed borders.',
      'Hume\'s legacy reminds us that lasting peace is not a passive condition, but an active, daily labor of empathy, justice, and mutual respect.'
    ],
  },
];

// 3. Starter PDF: Display Science & E-Ink Reflow
const displaySciencePages = [
  {
    title: 'Module 1: Microencapsulated E-Ink Physics',
    paragraphs: [
      'Electronic ink relies on millions of microscopic microcapsules, roughly the diameter of a human hair. Each microcapsule contains positively charged white pigments (titanium dioxide) and negatively charged black pigments suspended in a transparent fluid.',
      'Applying an electric field moves corresponding pigments to the top viewing surface, reflecting ambient daylight in the exact manner of traditional ink on physical paper.',
      'Because E-Ink is intrinsically bi-stable, the display draws zero electrical power while a page is being read, consuming energy only during page turns.'
    ],
  },
  {
    title: 'Module 2: Reflow Layout & Dynamic Typography',
    paragraphs: [
      'Standard fixed-layout PDF documents present challenges on mobile and handheld screens due to fixed margins and miniature text.',
      'Our Reflow Engine extracts structural text layers, tokenizes paragraphs, headers, and lists, and re-renders them dynamically according to your chosen font scale, line spacing, and margin preference.',
      'This grants readers the crisp typography of modern digital publishing while retaining the exact pagination and source fidelity of the original PDF.'
    ],
  },
  {
    title: 'Module 3: Frontlight Waveforms & Circadian Protection',
    paragraphs: [
      'Modern e-readers incorporate precision light guides etched with microscopic optical diffusers. Dual-array LEDs deliver both cool white daylight and warm 2400K amber illumination.',
      'Adjusting the warmth level filters out high-frequency 450nm blue light emissions, safeguarding melatonin production during evening reading sessions.',
      'Combine eye protection presets with sepia or dark paper backgrounds for maximum visual comfort.'
    ],
  },
  {
    title: 'Module 4: Reading Performance & Future Directions',
    paragraphs: [
      'Next-generation electrophoretic displays achieve refresh rates exceeding 15 frames per second with minimal ghosting artifacts.',
      'By pairing advanced hardware waveforms with adaptive software reflow, digital reading attains the tactile beauty of letterpress printing alongside modern search, annotation, and cloud synchronization.'
    ],
  },
];

// 4. Starter PDF: Hook, Line and Sinker (Tessa Bailey)
const hookLinePages = [
  {
    title: 'Chapter 1: Westport Shores',
    paragraphs: [
      'The salty breeze rolled off the Pacific, carrying the rhythmic pulse of fishing trawlers returning to Westport marina. Fox Thornton had lived by the tides his entire life.',
      'He knew how to read the water, how to navigate sudden offshore squalls, and how to keep his distance from complications.',
      'Until Hannah Bellinger walked back onto the docks with her vintage headphones, notebook in hand, and a smile that disarmed every defensive instinct he possessed.'
    ],
  },
  {
    title: 'Chapter 2: Vinyl Records and Late Nights',
    paragraphs: [
      'They sat on the porch under a canopy of rain, the needle crackling on a worn Fleetwood Mac record. Fox leaned against the railing, watching Hannah annotate her soundtrack cues.',
      '"You listen to music like you are looking for secrets," Fox murmured, his voice low over the ambient rain.',
      'Hannah looked up, adjusting her glasses. "Good songs are never just sounds, Fox. They are emotional coordinates."'
    ],
  }
];

// 5. Starter PDF: The Next Wife
const nextWifePages = [
  {
    title: 'Prologue: Secrets in Glass Houses',
    paragraphs: [
      'From the outside, the modernist estate in the hills looked serene—floor-to-ceiling glass walls, polished concrete, and a view that stretched across the valley.',
      'Kate knew the truth behind the architecture. Perfection is simply a polished container for secrets.',
      'When the first letter arrived with no return address, the carefully constructed facade began to splinter.'
    ],
  }
];

// 6. Starter PDF: Reckless Girls (Rachel Hawkins)
const recklessGirlsPages = [
  {
    title: 'Chapter 1: Meroe Island',
    paragraphs: [
      'Meroe Island was an isolated speck in the South Pacific, unmapped on commercial maritime charts and steeped in nautical lore of shipwrecks and vanishing crews.',
      'When Lux and Nico dropped anchor in the turquoise lagoon, it seemed like paradise—white sand beaches, coral reefs, and total detachment from the modern world.',
      'Then the second yacht arrived, and paradise became a cage.'
    ],
  }
];

const deepWorkPdfUrl = createPdfDataUrl({
  title: 'Deep Work & Focused Reading',
  author: 'Cal Newport & Reading Lab',
  pages: deepWorkPages,
});

const peacePdfUrl = createPdfDataUrl({
  title: 'The Architecture of Peace',
  author: 'John Hume Historical Institute',
  pages: peacePages,
});

const displayPdfUrl = createPdfDataUrl({
  title: 'Modern Display Science & E-Ink Reflow',
  author: 'Display Science Faculty',
  pages: displaySciencePages,
});

const hookLinePdfUrl = createPdfDataUrl({
  title: 'Hook, Line and Sinker',
  author: 'Tessa Bailey',
  pages: hookLinePages,
});

const nextWifePdfUrl = createPdfDataUrl({
  title: 'The Next Wife',
  author: 'Kira Rouda',
  pages: nextWifePages,
});

const recklessGirlsPdfUrl = createPdfDataUrl({
  title: 'Reckless Girls',
  author: 'Rachel Hawkins',
  pages: recklessGirlsPages,
});

export const INITIAL_BOOKS: Book[] = [
  {
    id: 'book-hook-line',
    title: 'Hook, Line and Sinker',
    author: 'Tessa Bailey',
    coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&q=80',
    source: 'local',
    format: 'pdf',
    totalPages: 2,
    currentPage: 1,
    progressPercent: 5,
    fileSize: '1.8 MB',
    addedDate: '2026-09-01',
    totalTimeReadMinutes: 14,
    stackIds: ['stack-reading', 'stack-favorites'],
    preferredReadingMode: 'reflow-ereader',
    bookmarks: [],
    highlights: [],
    pdfDataUrl: hookLinePdfUrl,
    contentPages: hookLinePages.map(
      (p) => `${p.title}\n\n${p.paragraphs.join('\n\n')}`
    ),
  },
  {
    id: 'book-the-next-wife',
    title: 'The Next Wife',
    author: 'Kira Rouda',
    coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80',
    source: 'local',
    format: 'pdf',
    totalPages: 1,
    currentPage: 1,
    progressPercent: 3,
    fileSize: '1.5 MB',
    addedDate: '2026-09-01',
    totalTimeReadMinutes: 8,
    stackIds: ['stack-reading'],
    preferredReadingMode: 'reflow-ereader',
    bookmarks: [],
    highlights: [],
    pdfDataUrl: nextWifePdfUrl,
    contentPages: nextWifePages.map(
      (p) => `${p.title}\n\n${p.paragraphs.join('\n\n')}`
    ),
  },
  {
    id: 'book-reckless-girls',
    title: 'Reckless Girls',
    author: 'Rachel Hawkins',
    coverUrl: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=400&q=80',
    source: 'local',
    format: 'pdf',
    totalPages: 1,
    currentPage: 1,
    progressPercent: 0,
    fileSize: '2.1 MB',
    addedDate: '2026-09-01',
    totalTimeReadMinutes: 0,
    stackIds: ['stack-toread'],
    preferredReadingMode: 'reflow-ereader',
    bookmarks: [],
    highlights: [],
    pdfDataUrl: recklessGirlsPdfUrl,
    contentPages: recklessGirlsPages.map(
      (p) => `${p.title}\n\n${p.paragraphs.join('\n\n')}`
    ),
  },
  {
    id: 'book-pdf-deep-work',
    title: 'Deep Work & Focused Reading',
    author: 'Cal Newport & Reading Lab',
    coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80',
    source: 'local',
    format: 'pdf',
    totalPages: 4,
    currentPage: 1,
    progressPercent: 25,
    fileSize: '1.2 MB',
    addedDate: '2026-09-01',
    totalTimeReadMinutes: 45,
    stackIds: ['stack-reading', 'stack-favorites'],
    preferredReadingMode: 'reflow-ereader',
    bookmarks: [{ id: 'bm-dw-1', pageNumber: 2, label: 'The Architecture of Stillness', createdAt: '2026-08-30' }],
    highlights: [
      {
        id: 'hl-dw-1',
        pageNumber: 1,
        text: 'To read without the flicker of reactive notifications is to declare an armistice with the urgency of the world.',
        color: '#fde047',
        createdAt: '2026-08-30',
      },
    ],
    pdfDataUrl: deepWorkPdfUrl,
    contentPages: deepWorkPages.map(
      (p) => `${p.title}\n\n${p.paragraphs.join('\n\n')}`
    ),
  },
  {
    id: 'book-pdf-architecture-peace',
    title: 'The Architecture of Peace',
    author: 'John Hume Historical Institute',
    coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
    source: 'local',
    format: 'pdf',
    totalPages: 4,
    currentPage: 1,
    progressPercent: 12,
    fileSize: '1.4 MB',
    addedDate: '2026-09-01',
    totalTimeReadMinutes: 20,
    stackIds: ['stack-research', 'stack-favorites'],
    preferredReadingMode: 'reflow-ereader',
    bookmarks: [{ id: 'bm-p-1', pageNumber: 1, label: 'Northern Ireland Accord', createdAt: '2026-08-28' }],
    highlights: [
      {
        id: 'hl-p-1',
        pageNumber: 1,
        text: 'Difference is the essence of humanity. The answer to difference is to respect it.',
        color: '#93c5fd',
        createdAt: '2026-08-28',
      },
    ],
    pdfDataUrl: peacePdfUrl,
    contentPages: peacePages.map(
      (p) => `${p.title}\n\n${p.paragraphs.join('\n\n')}`
    ),
  },
  {
    id: 'book-pdf-display-science',
    title: 'Modern Display Science & E-Ink Reflow',
    author: 'Display Science Faculty',
    coverUrl: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=400&q=80',
    source: 'local',
    format: 'pdf',
    totalPages: 4,
    currentPage: 1,
    progressPercent: 0,
    fileSize: '1.6 MB',
    addedDate: '2026-09-01',
    totalTimeReadMinutes: 0,
    stackIds: ['stack-research', 'stack-toread'],
    preferredReadingMode: 'reflow-ereader',
    bookmarks: [],
    highlights: [],
    pdfDataUrl: displayPdfUrl,
    contentPages: displaySciencePages.map(
      (p) => `${p.title}\n\n${p.paragraphs.join('\n\n')}`
    ),
  },
];
