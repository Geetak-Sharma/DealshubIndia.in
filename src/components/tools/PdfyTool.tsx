import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import imageCompression from 'browser-image-compression';
import { Toaster, toast } from 'sonner';
import confetti from 'canvas-confetti';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Plus, Trash2, Download, RefreshCw, Share2, Edit3, 
  ShieldCheck, Send, FileText,
  FileCheck, RotateCw, GripVertical
} from 'lucide-react';

interface ImageItem {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl: string;
}

type QualityTier = 'low' | 'medium' | 'high';

interface TierConfig {
  label: string;
  tag: string;
  maxDimension: number;
  maxSizeMB: number;
  initialQuality: number;
}

const TIER_CONFIGS: Record<QualityTier, TierConfig> = {
  low: { label: 'Compact', tag: 'Fast / Email', maxDimension: 1200, maxSizeMB: 0.2, initialQuality: 0.50 },
  medium: { label: 'Balanced', tag: 'Recommended', maxDimension: 1800, maxSizeMB: 0.6, initialQuality: 0.75 },
  high: { label: 'Original', tag: 'Ultra Crisp', maxDimension: 2600, maxSizeMB: 1.8, initialQuality: 0.92 }
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFormattedTimestamp(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  return [year, month, day].join('') + '-' + [hours, mins, secs].join('');
}

function SortableImageCard({ 
  item, 
  index, 
  onRemove, 
  onRotate 
}: { 
  item: ImageItem; 
  index: number; 
  onRemove: (id: string) => void;
  onRotate: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.6 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative aspect-square rounded-xl overflow-hidden bg-black/60 border border-white/10 group touch-manipulation shadow-md select-none"
    >
      <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover pointer-events-none" />
      
      <div 
        {...attributes} 
        {...listeners}
        className="absolute top-1 left-1 bg-black/85 backdrop-blur-md text-[9px] font-mono text-emerald-400 px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-0.5 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-2.5 h-2.5 opacity-70" />
        P{index + 1}
      </div>

      <div className="absolute top-1 right-1 flex items-center gap-1">
        <button
          type="button"
          onClick={() => onRotate(item.id)}
          className="p-1 bg-black/80 hover:bg-black text-gray-200 rounded-md transition-colors"
          title="Rotate 90deg"
        >
          <RotateCw className="w-2.5 h-2.5" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="p-1 bg-red-500/80 hover:bg-red-600 text-white rounded-md transition-colors"
          title="Delete"
        >
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}

export default function PdfyTool() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedTier, setSelectedTier] = useState<QualityTier>('medium');

  const [calculatedSizes, setCalculatedSizes] = useState<Record<QualityTier, number | null>>({
    low: null,
    medium: null,
    high: null
  });
  const [isCalculating, setIsCalculating] = useState(false);

  const [isConverting, setIsConverting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfFileBlob, setPdfFileBlob] = useState<Blob | null>(null);
  const [hasDownloaded, setHasDownloaded] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setImages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        toast.info('Moved to page ' + (newIndex + 1));
        return arrayMove(items, oldIndex, newIndex);
      });
      setPdfBlobUrl(null); setHasDownloaded(false);
    }
  };

  // Only gently scroll within the internal chat container, never hijack window scroll
  const scrollChatToBottom = () => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTo({
        top: chatScrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.previewUrl));
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, []);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newItems: ImageItem[] = [];

    Array.from(fileList).forEach(file => {
      if (file.type.startsWith('image/') || file.name.match(/\.(jpe?g|png|webp|avif|bmp)$/i)) {
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          file,
          name: file.name,
          size: file.size,
          previewUrl: URL.createObjectURL(file)
        });
      }
    });

    if (newItems.length > 0) {
      setImages(prev => [...prev, ...newItems]);
      setPdfBlobUrl(null);
      toast.success('Added ' + newItems.length + ' photos!');
      setTimeout(scrollChatToBottom, 150);
    }
  };

  const handleRotate = async (id: string) => {
    const target = images.find(i => i.id === id);
    if (!target) return;

    const img = new Image();
    img.src = target.previewUrl;
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = img.height;
    canvas.height = img.width;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((90 * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const newFile = new File([blob], target.name, { type: 'image/jpeg' });
      const newUrl = URL.createObjectURL(blob);
      URL.revokeObjectURL(target.previewUrl);

      setImages(prev => prev.map(item => item.id === id ? {
        ...item,
        file: newFile,
        previewUrl: newUrl,
        size: blob.size
      } : item));

      toast.info('Rotated page 90deg');
      setPdfBlobUrl(null);
    }, 'image/jpeg', 0.92);
  };

  const compressWithWorker = async (file: File, tier: QualityTier): Promise<Blob> => {
    const config = TIER_CONFIGS[tier];
    const options = {
      maxSizeMB: config.maxSizeMB,
      maxWidthOrHeight: config.maxDimension,
      useWebWorker: true,
      initialQuality: config.initialQuality,
      fileType: 'image/jpeg'
    };
    try {
      return await imageCompression(file, options);
    } catch {
      return file;
    }
  };

  useEffect(() => {
    let isCancelled = false;
    if (images.length === 0) {
      setCalculatedSizes({ low: null, medium: null, high: null });
      return;
    }

    const calc = async () => {
      setIsCalculating(true);
      try {
        const tiers: QualityTier[] = ['low', 'medium', 'high'];
        const res: Record<QualityTier, number> = { low: 0, medium: 0, high: 0 };
        const sample = images.slice(0, 2);

        for (const tier of tiers) {
          if (isCancelled) return;
          let totalSample = 0;
          for (const item of sample) {
            const b = await compressWithWorker(item.file, tier);
            totalSample += b.size;
          }
          const avg = totalSample / sample.length;
          res[tier] = Math.round(avg * images.length + (images.length * 1500));
        }

        if (!isCancelled) setCalculatedSizes(res);
      } catch (err) {
        console.error(err);
      } finally {
        if (!isCancelled) setIsCalculating(false);
      }
    };

    calc();
    return () => { isCancelled = true; };
  }, [images]);

  const removeImage = (id: string) => {
    setImages(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(i => i.id !== id);
    });
    setPdfBlobUrl(null);
    toast.error('Removed page');
  };

  const generatePdf = async () => {
    if (images.length === 0) return;
    setIsConverting(true);
    setProgressPercent(10);
    setProgressMsg('Initializing PDF compiler...');

    try {
      const pdfDoc = await PDFDocument.create();
      const total = images.length;

      for (let i = 0; i < total; i++) {
        const item = images[i];
        setProgressMsg('Compressing page ' + (i + 1) + ' of ' + total + '...');
        setProgressPercent(Math.round(((i + 1) / (total + 1)) * 90));

        const compressedBlob = await compressWithWorker(item.file, selectedTier);
        const arrayBuffer = await compressedBlob.arrayBuffer();
        const embeddedImage = await pdfDoc.embedJpg(arrayBuffer);

        const imgWidth = embeddedImage.width;
        const imgHeight = embeddedImage.height;

        // Clean borderless full-bleed embedding: PDF page exactly matches image dimensions
        const page = pdfDoc.addPage([imgWidth, imgHeight]);
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: imgWidth,
          height: imgHeight
        });
      }

      setProgressMsg('Finalizing PDF stream...');
      setProgressPercent(95);

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const siteHostname = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
        ? window.location.hostname
        : 'dealshubindia.in';
      const timestamp = getFormattedTimestamp();
      const filename = siteHostname + '-pdfy-' + timestamp + '.pdf';

      setPdfBlobUrl(url);
      setPdfFileBlob(blob);
      setPdfFileName(filename);
      setProgressPercent(100);
      setProgressMsg('PDF Complete!');
      toast.success('PDF Generated successfully!');
      setTimeout(scrollChatToBottom, 150);
    } catch (err: any) {
      toast.error('Error creating PDF: ' + err.message);
    } finally {
      setIsConverting(false);
    }
  };

  
  // 1. Confetti Burst Trigger
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.75 },
        colors: ['#10b981', '#14b8a6', '#06b6d4', '#38bdf8', '#fbbf24']
      });
    } catch {}
  };

  // 3. Robust Native Mobile Share with Instant Fallback
  const handleNativeShare = async () => {
    const finalName = pdfFileName.endsWith('.pdf') ? pdfFileName : `${pdfFileName}.pdf`;

    // Attempt file share if blob is ready and browser supports File sharing
    if (pdfFileBlob && typeof navigator !== 'undefined' && navigator.share) {
      try {
        const file = new File([pdfFileBlob], finalName, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: finalName,
            text: 'Here is your PDF created with pdfy'
          });
          toast.success('Shared successfully!');
          return;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return; // User closed share sheet intentionally
      }

      // Fallback 1: Share web link if file sharing isn't permitted in current context (e.g. non-HTTPS or iframe)
      try {
        await navigator.share({
          title: 'pdfy — Convert Images to PDF',
          text: 'Convert your photos into clean borderless PDFs for free on pdfy:',
          url: window.location.href
        });
        toast.success('Link shared!');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback 2: Direct trigger download + clipboard copy
    if (pdfBlobUrl) {
      const a = document.createElement('a');
      a.href = pdfBlobUrl;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.info('Downloading file to your device...');
    }
  };

  const totalRawSize = images.reduce((acc, img) => acc + img.size, 0);

  return (
    <div 
      className="w-full max-w-md mx-auto h-[92vh] sm:h-[84vh] min-h-[560px] max-h-[820px] bg-[#070B12]/95 backdrop-blur-3xl border border-white/10 rounded-[28px] sm:rounded-[36px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95),inset_0_1px_1px_0_rgba(255,255,255,0.12)] flex flex-col overflow-hidden relative font-sans my-1 sm:my-4 pb-[env(safe-area-inset-bottom)]"
    >
      <Toaster position="top-center" richColors theme="dark" />

      <div className="absolute -top-24 -left-24 w-56 h-56 bg-emerald-500/15 rounded-full blur-[80px] pointer-events-none -z-10" />
      <div className="absolute top-1/2 -right-24 w-56 h-56 bg-teal-500/10 rounded-full blur-[80px] pointer-events-none -z-10" />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <header className="px-5 py-3.5 bg-white/[0.03] backdrop-blur-2xl border-b border-white/[0.08] flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400/20 to-teal-400/20 p-[1px] shadow-lg shadow-emerald-500/10">
              <div className="w-full h-full bg-[#0a0f1d] rounded-2xl flex items-center justify-center text-emerald-400 font-extrabold text-sm border border-white/5">
                <FileText className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <span className="w-2.5 h-2.5 bg-emerald-400 border-2 border-[#070B12] rounded-full absolute -bottom-0.5 -right-0.5 shadow-sm shadow-emerald-400"></span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-white font-extrabold text-sm tracking-tight">pdfy</h2>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/20">Private</span>
            </div>
            <p className="text-[11px] text-gray-400">Clean Borderless Export</p>
          </div>
        </div>

        {images.length > 0 && (
          <button
            type="button"
            onClick={() => { setImages([]); setPdfBlobUrl(null); toast.info('Cleared list'); }}
            className="text-[11px] text-red-400 hover:text-red-300 font-medium bg-red-500/10 hover:bg-red-500/15 px-3 py-1.5 rounded-xl border border-red-500/20 transition-all active:scale-95"
          >
            Clear All
          </button>
        )}
      </header>

      <div 
        ref={chatScrollContainerRef} 
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        <div className="flex gap-2.5 max-w-[90%] items-start">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center text-xs flex-shrink-0 text-emerald-400 mt-0.5">
            ✨
          </div>
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl rounded-tl-sm p-3.5 text-xs text-gray-200 leading-relaxed shadow-xl">
            <p className="font-extrabold text-white mb-1">Welcome to pdfy</p>
            <p className="text-gray-300 leading-relaxed">
              Select images to convert them into a clean PDF. Zero white borders or watermarks. Drag to reorder pages!
            </p>
            <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              100% In-Device Processing • Zero Server Upload
            </div>
          </div>
        </div>

        {images.length === 0 && (
          <div className="flex gap-2.5 max-w-[90%] items-start">
            <div className="w-7 h-7 rounded-xl bg-teal-500/20 border border-teal-500/20 flex items-center justify-center text-xs flex-shrink-0 text-teal-400 mt-0.5">
              📁
            </div>
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl rounded-tl-sm p-4 text-xs text-gray-200 space-y-3 shadow-xl w-full">
              <p className="text-gray-300">Tap below to add documents, photos, or scans:</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 border border-emerald-500/30 text-emerald-300 font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                Select Photos & Images
              </button>
            </div>
          </div>
        )}

        {images.length > 0 && (
          <div className="flex justify-end">
            <div className="max-w-[90%] bg-emerald-500/10 backdrop-blur-2xl border border-emerald-500/25 rounded-2xl rounded-tr-sm p-3 text-xs text-gray-200 space-y-2.5 shadow-xl w-full">
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-300">
                <span>{images.length} Pages (Drag to reorder)</span>
                <span className="font-mono text-[10px] text-gray-300">{formatBytes(totalRawSize)}</span>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={images.map(i => i.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-3 gap-1.5">
                    {images.map((item, index) => (
                      <SortableImageCard
                        key={item.id}
                        item={item}
                        index={index}
                        onRemove={removeImage}
                        onRotate={handleRotate}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        )}

        {images.length > 0 && (
          <div className="flex gap-2.5 max-w-[92%] items-start">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center text-xs flex-shrink-0 text-emerald-400 mt-0.5">
              ⚡
            </div>
            <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl rounded-tl-sm p-4 text-xs text-gray-200 space-y-3 w-full shadow-xl">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Select Output Quality & Size
                  </p>
                  {isCalculating && (
                    <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1 animate-pulse">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" /> calculating...
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  {(['low', 'medium', 'high'] as QualityTier[]).map((tierKey) => {
                    const cfg = TIER_CONFIGS[tierKey];
                    const isChecked = selectedTier === tierKey;
                    const cSize = calculatedSizes[tierKey];

                    return (
                      <div
                        key={tierKey}
                        onClick={() => setSelectedTier(tierKey)}
                        className={'p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ' + (
                          isChecked
                            ? 'bg-emerald-500/15 border-emerald-500 text-white ring-1 ring-emerald-500/30'
                            : 'bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/[0.04]'
                        )}
                      >
                        <div>
                          <p className={'text-xs font-bold ' + (isChecked ? 'text-emerald-300' : 'text-gray-200')}>
                            {cfg.label} <span className="text-[10px] font-normal text-gray-400">({cfg.tag})</span>
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {cSize ? formatBytes(cSize) : isCalculating ? '...' : '~' + formatBytes(totalRawSize * 0.5)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {pdfBlobUrl && (
          <div className="flex gap-2.5 max-w-[96%] items-start animate-fade-in">
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-emerald-500/25 via-teal-500/20 to-cyan-500/25 border border-emerald-500/30 flex items-center justify-center text-sm flex-shrink-0 text-emerald-400 mt-1 shadow-lg shadow-emerald-500/10">
              ✨
            </div>
            
            {/* Unified 2026 Neo-Glass Completion Station */}
            <div className="w-full bg-[#0c1322]/85 backdrop-blur-3xl border border-white/10 rounded-3xl p-4 sm:p-5 text-xs text-gray-200 space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.12)]">
              
              {/* Section 1: Ready to Save & Primary Action */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <FileCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-white tracking-tight">PDF Document Ready</h4>
                      <p className="text-[11px] text-gray-400">
                        {images.length} borderless pages • Clean in-device export
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                    100% Private
                  </span>
                </div>

                {/* Feature 2: Custom PDF File Renamer */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span className="flex items-center gap-1 font-mono uppercase text-[10px]">
                      <Edit3 className="w-3 h-3 text-emerald-400" />
                      File Name:
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">Tap to edit</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={pdfFileName}
                      onChange={(e) => setPdfFileName(e.target.value)}
                      placeholder="my-document.pdf"
                      className="w-full bg-black/50 border border-white/10 focus:border-emerald-500/60 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Primary Actions: Download (with Confetti) + Native Mobile Share */}
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={pdfBlobUrl}
                    download={pdfFileName.endsWith('.pdf') ? pdfFileName : `${pdfFileName}.pdf`}
                    onClick={() => {
                      setHasDownloaded(true);
                      triggerConfetti();
                      toast.success('Download started!');
                    }}
                    className="flex-[2] py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_8px_25px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Download PDF</span>
                  </a>

                  {/* Feature 3: Native Share Button */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerConfetti();
                      handleNativeShare();
                    }}
                    className="flex-1 py-3.5 px-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-md"
                    title="Share to WhatsApp, Gmail, AirDrop, etc."
                  >
                    <Share2 className="w-4 h-4 text-emerald-400" />
                    <span>Share</span>
                  </button>
                </div>
              </div>

              {/* Sub-Divider with Glowing Accent */}
              <div className="relative flex items-center justify-center my-1">
                <div className="w-full border-t border-white/[0.08]" />
                <span className="absolute px-3 bg-[#0c1322] text-[10px] font-mono uppercase text-gray-500 tracking-wider">
                  Stay Connected & Deals
                </span>
              </div>

              {/* Section 2: Community Channels (WhatsApp & Telegram) */}
              <div className="space-y-2">
                <p className="text-[11px] text-gray-400 leading-snug">
                  Join our official feeds for verified discount loots and tech utilities:
                </p>

                <div className="grid grid-cols-1 gap-2">
                  {/* WhatsApp Channel Card */}
                  <a
                    href="https://whatsapp.com/channel/0029Va8sOrp4SpkEQKVElV1i"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-2xl bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/20 hover:border-emerald-500/40 flex items-center justify-between text-left transition-all active:scale-[0.99] group shadow-inner"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#25D366]/20 flex items-center justify-center text-lg flex-shrink-0">
                        💬
                      </div>
                      <div>
                        <p className="font-bold text-xs text-white group-hover:text-emerald-300 transition-colors">
                          DealsHub on WhatsApp
                        </p>
                        <p className="text-[10px] text-gray-400">Shopping price-drop alerts & loot deals</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-[#25D366] text-black px-2.5 py-1 rounded-xl flex-shrink-0 shadow-sm">
                      Join →
                    </span>
                  </a>

                  {/* Telegram Channel Card */}
                  <a
                    href="https://t.me/iGeetak"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-2xl bg-sky-950/20 hover:bg-sky-950/40 border border-sky-500/20 hover:border-sky-500/40 flex items-center justify-between text-left transition-all active:scale-[0.99] group shadow-inner"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#0088cc]/20 flex items-center justify-center text-lg flex-shrink-0">
                        🚀
                      </div>
                      <div>
                        <p className="font-bold text-xs text-white group-hover:text-sky-300 transition-colors">
                          @iGeetak on Telegram
                        </p>
                        <p className="text-[10px] text-gray-400">Tech tips, developer updates & software tricks</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-[#38bdf8] text-black px-2.5 py-1 rounded-xl flex-shrink-0 shadow-sm">
                      Subscribe →
                    </span>
                  </a>
                </div>
              </div>

              {/* Section 3: Reset / Create New Action */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setImages([]);
                    setPdfBlobUrl(null);
                    setHasDownloaded(false);
                    toast.info('Ready for new images');
                    setTimeout(() => fileInputRef.current?.click(), 120);
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.99] border border-white/10 text-gray-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-inner"
                >
                  <Plus className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                  <span>Create a New PDF (+ Choose Images)</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {isConverting && (
          <div className="flex gap-2.5 max-w-[85%] items-start">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs flex-shrink-0 text-emerald-400 mt-0.5 animate-spin">
              ⚡
            </div>
            <div className="bg-white/[0.04] backdrop-blur-md border border-emerald-500/30 rounded-2xl rounded-tl-sm p-3 text-xs text-gray-200 space-y-2 w-full">
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-300">{progressMsg}</span>
                <span className="font-mono text-emerald-400 font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-400 h-full transition-all duration-200 rounded-full"
                  style={{ width: progressPercent + '%' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="p-3 bg-white/[0.03] backdrop-blur-2xl border-t border-white/[0.08] z-20 space-y-2.5">
        <div className="flex items-center justify-between text-[11px] px-1">
          <span className="text-gray-500 text-[10px] font-mono uppercase">Quality Tier:</span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedTier('low')}
              className={'px-2.5 py-0.5 rounded-full border text-[10px] font-medium transition-all ' + (
                selectedTier === 'low' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-white/[0.02] border-white/5 text-gray-400'
              )}
            >
              Compact
            </button>
            <button
              type="button"
              onClick={() => setSelectedTier('medium')}
              className={'px-2.5 py-0.5 rounded-full border text-[10px] font-medium transition-all ' + (
                selectedTier === 'medium' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-white/[0.02] border-white/5 text-gray-400'
              )}
            >
              Balanced
            </button>
            <button
              type="button"
              onClick={() => setSelectedTier('high')}
              className={'px-2.5 py-0.5 rounded-full border text-[10px] font-medium transition-all ' + (
                selectedTier === 'high' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-white/[0.02] border-white/5 text-gray-400'
              )}
            >
              Original
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 h-12 px-4 bg-white/[0.03] hover:bg-white/[0.06] active:scale-[0.99] border border-white/[0.08] rounded-2xl flex items-center justify-between text-xs transition-all shadow-inner"
          >
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="text-gray-200 font-semibold truncate">
                {images.length === 0 ? 'Select Photos & Files' : 'Add More (' + images.length + ' queued)'}
              </span>
            </div>

            {images.length > 0 && (
              <span className="text-emerald-400 font-mono text-[11px] font-bold pl-2 flex-shrink-0">
                {calculatedSizes[selectedTier] ? formatBytes(calculatedSizes[selectedTier]!) : '...'}
              </span>
            )}
          </button>

          <button
            type="button"
            disabled={images.length === 0 || isConverting}
            onClick={generatePdf}
            className={'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ' + (
              images.length === 0 
                ? 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed opacity-40' 
                : 'bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold shadow-lg shadow-emerald-500/25 active:scale-95'
            )}
            title="Generate Document"
          >
            {isConverting ? (
              <RefreshCw className="w-5 h-5 animate-spin text-black" />
            ) : (
              <Send className="w-5 h-5 ml-0.5 text-black" />
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
