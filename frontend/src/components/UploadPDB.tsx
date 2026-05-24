import { useState, useRef } from 'react';

interface UploadPDBProps {
  onFileChange: (file: File | null, files?: File[]) => void;
  onGenerate:   () => void;
  loading:      boolean;
  targetColor:  string;
  uploadedProteinId?: string;
  isBatchMode?:  boolean;
  batchCount?:   number;
}

export default function UploadPDB({
  onFileChange, targetColor,
  uploadedProteinId
}: UploadPDBProps) {
  const [file, setFile]           = useState<File | null>(null);
  const [files, setFiles]         = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode]           = useState<'single' | 'batch'>('single');
  const singleRef = useRef<HTMLInputElement>(null);
  const batchRef  = useRef<HTMLInputElement>(null);

  const handleSingleFile = (f: File) => {
    setFile(f);
    setFiles([]);
    onFileChange(f);
  };

  const handleBatchFiles = (fs: FileList) => {
    const arr = Array.from(fs).filter(f => f.name.match(/\.(pdb|ent)$/i));
    setFiles(arr);
    setFile(null);
    onFileChange(null, arr);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 1) {
      setMode('batch');
      handleBatchFiles(droppedFiles);
    } else if (droppedFiles.length === 1) {
      const f = droppedFiles[0];
      if (f.name.match(/\.(pdb|ent)$/i)) {
        setMode('single');
        handleSingleFile(f);
      }
    }
  };

  const clearAll = () => {
    setFile(null); setFiles([]);
    onFileChange(null);
  };

  const isReady = mode === 'single' ? !!file : files.length > 0;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px'
    }}>
      {/* Header with mode toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#94a3b8', letterSpacing: '2px' }}>
          PROTEIN STRUCTURE
        </h3>
        {/* Single / Batch toggle */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '3px' }}>
          {(['single', 'batch'] as const).map(m => (
            <button key={m} id={`mode-${m}`} onClick={() => { setMode(m); clearAll(); }} style={{
              padding: '4px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer',
              background: mode === m ? targetColor : 'transparent',
              color:      mode === m ? '#050a0e'  : '#64748b',
              border: 'none', fontWeight: mode === m ? '700' : '400',
              transition: 'all 0.2s',
            }}>
              {m === 'single' ? '1 File' : 'Batch'}
            </button>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => (mode === 'single' ? singleRef : batchRef).current?.click()}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `1px dashed ${isDragging ? targetColor : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '12px', padding: '24px 16px', textAlign: 'center',
          cursor: 'pointer', background: isDragging ? `${targetColor}06` : 'transparent',
          transition: 'all 0.2s', flex: 1, minHeight: '100px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {/* Hidden file inputs */}
        <input ref={singleRef} type="file" accept=".pdb,.ent" hidden
          onChange={e => e.target.files?.[0] && handleSingleFile(e.target.files[0])} />
        <input ref={batchRef} type="file" accept=".pdb,.ent" multiple hidden
          onChange={e => e.target.files && handleBatchFiles(e.target.files)} />

        {/* Display state */}
        {mode === 'single' && file ? (
          <div>
            <div style={{ fontSize: '22px', marginBottom: '6px', color: targetColor }}>✓</div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: targetColor }}>{file.name}</div>
            {uploadedProteinId && uploadedProteinId !== 'UNKNOWN' && (
              <div style={{ fontSize: '11px', color: '#00ffaa', marginTop: '4px' }}>
                Protein ID: <strong>{uploadedProteinId}</strong>
              </div>
            )}
            <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
              {(file.size / 1024).toFixed(1)} KB
            </div>
          </div>
        ) : mode === 'batch' && files.length > 0 ? (
          <div>
            <div style={{ fontSize: '22px', marginBottom: '6px', color: '#60a5fa' }}>📦</div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#60a5fa' }}>
              {files.length} PDB files selected
            </div>
            <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px', maxHeight: '60px', overflowY: 'auto' }}>
              {files.slice(0, 5).map(f => <div key={f.name}>{f.name}</div>)}
              {files.length > 5 && <div>...and {files.length - 5} more</div>}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.3 }}>
              {mode === 'batch' ? '📁' : '⛓'}
            </div>
            <div style={{ fontSize: '13px', color: '#475569', marginBottom: '4px' }}>
              {mode === 'batch' ? 'Drop multiple .pdb files here' : 'Drop .pdb file here'}
            </div>
            <div style={{ fontSize: '11px', color: '#334155' }}>or click to browse</div>
          </div>
        )}
      </div>

      {/* Clear button */}
      {isReady && (
        <button onClick={clearAll} style={{
          padding: '5px', borderRadius: '6px', background: 'none',
          border: '1px solid rgba(255,255,255,0.08)', color: '#475569',
          fontSize: '11px', cursor: 'pointer'
        }}>
          ✕ Clear {mode === 'batch' ? `${files.length} files` : 'file'}
        </button>
      )}

      {/* Info */}
      <div style={{ fontSize: '11px', color: '#334155', lineHeight: 1.6 }}>
        <div style={{ color: '#475569', fontWeight: '600', marginBottom: '4px' }}>Example PDB IDs (rcsb.org)</div>
        <div>1IEP · EGFR · Cancer</div>
        <div>6LU7 · Mpro · COVID-19</div>
        <div>2B8L · BACE1 · Alzheimer's</div>
      </div>
    </div>
  );
}
