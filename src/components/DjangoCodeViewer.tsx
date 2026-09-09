import React, { useState } from 'react';
import { DJANGO_DELIVERABLES } from '../data/djangoCodebase';
import { Code2, Copy, Check, Terminal, FileCode, Layers, BookOpen, Download, X } from 'lucide-react';

interface DjangoCodeViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DjangoCodeViewer: React.FC<DjangoCodeViewerProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedPath, setSelectedPath] = useState<string>(DJANGO_DELIVERABLES[0].path);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentFile = DJANGO_DELIVERABLES.find((f) => f.path === selectedPath) || DJANGO_DELIVERABLES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadAll = () => {
    // Generate simple blob with concatenated project files
    const bundleContent = DJANGO_DELIVERABLES.map((file) => (
      `# ========================================================\n# FILE: ${file.path}\n# ${file.description}\n# ========================================================\n\n${file.code}\n\n`
    )).join('\n');

    const blob = new Blob([bundleContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'django_ereader_suite_complete.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-5xl h-[90vh] bg-stone-900 rounded-2xl shadow-2xl border border-stone-800 flex flex-col overflow-hidden text-stone-100">
        
        {/* Top Header Bar */}
        <header className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-stone-800 text-white flex items-center justify-center font-bold border border-stone-700">
              <Code2 size={18} />
            </div>
            <div>
              <h2 className="font-bold text-stone-100 text-base flex items-center gap-2">
                Production Django Code Suite
                <span className="text-[10px] font-semibold text-stone-300 bg-stone-800 border border-stone-700 px-2 py-0.5 rounded-full">
                  Django 5.0 + Tailwind
                </span>
              </h2>
              <p className="text-xs text-stone-400">Complete backend models, views, HTML templates, and instructions</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadAll}
              className="px-3 py-1.5 text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition flex items-center gap-1.5 border border-stone-700"
              title="Download all Django project files as a bundle"
            >
              <Download size={13} />
              <span>Export Code Bundle</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Main Split Layout */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Sidebar: File Tree */}
          <aside className="w-64 bg-stone-950/80 border-r border-stone-800 p-3 overflow-y-auto flex flex-col gap-1 flex-shrink-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 px-3 py-2">
              Deliverable Files
            </div>

            {DJANGO_DELIVERABLES.map((file) => {
              const isSelected = file.path === selectedPath;
              return (
                <button
                  key={file.path}
                  onClick={() => {
                    setSelectedPath(file.path);
                    setCopied(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center gap-2.5 ${
                    isSelected
                      ? 'bg-stone-800 text-white font-semibold border border-stone-600 shadow-xs'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                  }`}
                >
                  <FileCode size={14} className={isSelected ? 'text-white' : 'text-stone-500'} />
                  <div className="truncate">
                    <div className="truncate">{file.title}</div>
                    <div className="text-[10px] text-stone-500 truncate">{file.path}</div>
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Right Editor Area */}
          <main className="flex-1 flex flex-col bg-stone-900 overflow-hidden">
            
            {/* File Info & Copy Bar */}
            <div className="px-6 py-3 bg-stone-900 border-b border-stone-800 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white">{currentFile.path}</span>
                <span className="text-xs text-stone-400">• {currentFile.description}</span>
              </div>

              <button
                onClick={handleCopy}
                className="px-3 py-1 text-xs font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-md transition flex items-center gap-1.5 border border-stone-700"
              >
                {copied ? (
                  <>
                    <Check size={13} className="text-white" />
                    <span className="text-white">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Code Body */}
            <div className="flex-1 p-6 overflow-auto font-mono text-xs text-stone-200 leading-relaxed bg-stone-950/50">
              <pre className="whitespace-pre font-mono selection:bg-stone-700 selection:text-white">
                <code>{currentFile.code}</code>
              </pre>
            </div>

          </main>
        </div>

      </div>
    </div>
  );
};
