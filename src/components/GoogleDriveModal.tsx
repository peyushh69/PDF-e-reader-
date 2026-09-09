import React, { useState } from 'react';
import { Cloud, X, Check, RefreshCw, HardDrive, Download, ShieldCheck } from 'lucide-react';
import { Book } from '../types';
import { createPdfDataUrl } from '../utils/pdfGenerator';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDriveBook: (book: Book) => void;
}

interface DriveFileItem {
  id: string;
  name: string;
  size: string;
  modifiedTime: string;
  pages: number;
  author: string;
  sampleContent: string[];
}

const SAMPLE_DRIVE_FILES: DriveFileItem[] = [
  {
    id: 'drive-doc-1',
    name: 'Irish Peace Accord & Historical Charters.pdf',
    size: '3.4 MB',
    modifiedTime: '2 days ago',
    pages: 3,
    author: 'Historical Research Archive',
    sampleContent: [
      `Historical Context of the Anglo-Irish Agreement 1985\n\nThe signing of the Anglo-Irish Agreement on 15 November 1985 marked a decisive turning point in relations between London and Dublin. For the first time, the British Government formally recognized that the Republic of Ireland had a legitimate consultative role in Northern Ireland's governance.\n\nJohn Hume played an indispensable behind-the-scenes role, drafting key policy memorandums that influenced both Taoiseach Garret FitzGerald and Prime Minister Margaret Thatcher.`,
      `The Three-Strand Philosophy in Action\n\n1. Internal Democratic Framework: Power-sharing executive based on mutual coalition rather than majoritarian dominance.\n2. North-South Ministerial Body: Joint implementation bodies overseeing tourism, waterways, food safety, and trade.\n3. British-Irish Intergovernmental Conference: Bilateral sovereignty coordination and human rights oversight.`,
      `Civil Rights and Electoral Re-alignment\n\nThe campaign for equitable civil representation dismantled longstanding discriminatory electoral boundaries and secured universal adult franchise across all local government districts.`
    ],
  },
  {
    id: 'drive-doc-2',
    name: 'E-Reader Optical Ergonomics & Carta 1300.pdf',
    size: '1.8 MB',
    modifiedTime: '1 week ago',
    pages: 2,
    author: 'Display Standards Institute',
    sampleContent: [
      `Optoelectronic Performance of Modern Electronic Paper\n\nElectrophoretic displays offer lambertian reflection characteristics virtually identical to natural pulp paper. Unlike active matrix OLED emitters, which produce high peak luminance spikes in the short-wave blue spectrum, E-Ink screens reflect ambient photons.`,
      `Waveform Micro-Controllers and Fast Page Turning\n\nModern Carta 1300 panels achieve sub-120ms page transitions through specialized 5-level waveform voltage drivers, providing seamless reading without visible ghosting.`
    ],
  },
  {
    id: 'drive-doc-3',
    name: 'The Philosophy of Solitary Contemplation.pdf',
    size: '2.1 MB',
    modifiedTime: '3 weeks ago',
    pages: 2,
    author: 'Dr. Alistair Finch',
    sampleContent: [
      `The Quiet Mind in the Digital Age\n\nDeep reading functions as an cognitive sanctuary. In an era dominated by hyper-fragmented feeds, immersing oneself in sustained long-form prose trains sustained executive attention and emotional regulation.`,
      `The Discipline of Stillness\n\nWhen we sit with an electronic ink display or physical page without distraction, we cultivate the contemplative depth that modern work demands.`
    ],
  },
];

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  onImportDriveBook,
}) => {
  const [isConnected] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [importedIds, setImportedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 800);
  };

  const handleImport = (file: DriveFileItem) => {
    const pdfDataUrl = createPdfDataUrl({
      title: file.name.replace('.pdf', ''),
      author: file.author,
      pages: file.sampleContent.map((text, idx) => ({
        title: `Page ${idx + 1}`,
        paragraphs: text.split('\n\n').filter((p) => p.trim().length > 0),
      })),
    });

    const newBook: Book = {
      id: `drive-${file.id}`,
      title: file.name.replace('.pdf', ''),
      author: file.author,
      coverUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=400&q=80',
      source: 'drive',
      format: 'pdf',
      totalPages: file.pages,
      currentPage: 1,
      progressPercent: 0,
      fileSize: file.size,
      addedDate: new Date().toISOString().split('T')[0],
      totalTimeReadMinutes: 0,
      driveFileId: file.id,
      pdfDataUrl,
      contentPages: file.sampleContent,
      preferredReadingMode: 'reflow-ereader',
      stackIds: ['stack-research'],
      bookmarks: [],
      highlights: [],
    };

    setImportedIds((prev) => [...prev, file.id]);
    onImportDriveBook(newBook);
  };

  const filteredFiles = SAMPLE_DRIVE_FILES.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-bold">
              <Cloud size={18} />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                Google Drive Integration
                {isConnected && (
                  <span className="text-[10px] font-semibold text-stone-800 bg-stone-100 border border-stone-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck size={11} /> Connected
                  </span>
                )}
              </h3>
              <p className="text-xs text-stone-500">Sync & Read PDFs directly from your Google Drive</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Connection Banner */}
        <div className="p-4 bg-stone-100 border-b border-stone-200 flex items-center justify-between text-xs text-stone-800">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-black animate-pulse" />
            <span>Authenticated account: <strong>reader.library@gmail.com</strong></span>
          </div>
          <button
            onClick={handleSync}
            className="flex items-center gap-1 text-[11px] font-semibold text-stone-800 hover:text-black bg-white px-2.5 py-1 rounded-md border border-stone-300 shadow-xs"
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Refreshing...' : 'Refresh Drive'}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search PDF files in Google Drive..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black bg-stone-50"
            />
            <HardDrive size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          </div>

          {/* Files List */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Found {filteredFiles.length} PDF Documents
            </div>

            {filteredFiles.map((file) => {
              const isImported = importedIds.includes(file.id);
              return (
                <div
                  key={file.id}
                  className="p-3.5 rounded-xl border border-stone-200 bg-white hover:border-black hover:bg-stone-50 transition flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-10 rounded bg-stone-100 border border-stone-300 text-stone-800 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                      PDF
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-stone-900 truncate font-serif">{file.name}</h4>
                      <p className="text-[11px] text-stone-500">
                        {file.author} · {file.size} · {file.pages} pages · {file.modifiedTime}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleImport(file)}
                    disabled={isImported}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-all ${
                      isImported
                        ? 'bg-stone-100 text-stone-600 border border-stone-200 cursor-default'
                        : 'bg-black hover:bg-stone-800 text-white shadow-xs'
                    }`}
                  >
                    {isImported ? (
                      <>
                        <Check size={13} />
                        <span>In Library</span>
                      </>
                    ) : (
                      <>
                        <Download size={13} />
                        <span>Import PDF</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <span>Google Drive OAuth 2.0 Scope: <code className="text-[10px] bg-stone-200/80 px-1.5 py-0.5 rounded">drive.readonly</code></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-bold bg-black text-white hover:bg-stone-800 rounded-lg transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
