import React, { useState, useRef } from "react";
import { Upload, File as FileIcon, FolderOpen, CheckCircle, AlertCircle, Clock, X, Info } from "lucide-react";
import { Role, QueueFile } from "../../types";
import { uploadDocumentApi, uploadFolderApi } from "../../services/documentApi";
import { FileChip, fmtSize } from "../../utils";
import { Btn } from "../../components/DesignSystem";
import { ToastBar } from "../../components/Modal";

export function UploadTab({ role }: { role: Role }) {
  const [queue, setQueue] = useState<QueueFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState<{ msg:string; type:"success"|"error"|"info" }|null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: "success"|"error"|"info" = "success") => setToast({ msg, type });

  const uploadSingleFile = async (file: File) => {
    const id = `q${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const queueItem: QueueFile = {
      id,
      name: file.name,
      rawSize: file.size,
      progress: 0,
      status: "uploading",
      type: file.name.split(".").pop() ?? "bin",
    };
    setQueue(prev => [...prev, queueItem]);
    try {
      await uploadDocumentApi(file);
      setQueue(prev => prev.map(q => q.id === id ? { ...q, progress: 100, status: "done" } : q));
      showToast(`Uploaded ${file.name}`, "success");
    } catch (err: any) {
      setQueue(prev => prev.map(q => q.id === id ? { ...q, status: "error" } : q));
      showToast(err.message || `Failed to upload ${file.name}`, "error");
    }
  };

  const handleFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    arr.forEach(file => uploadSingleFile(file));
  };

  const handleFolderUpload = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    const ids = arr.map((file, i) => {
      const id = `q${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`;
      return { id, file };
    });
    const queueItems: QueueFile[] = ids.map(({ id, file }) => ({
      id,
      name: file.name,
      rawSize: file.size,
      progress: 0,
      status: "uploading" as const,
      type: file.name.split(".").pop() ?? "bin",
    }));
    setQueue(prev => [...prev, ...queueItems]);
    try {
      await uploadFolderApi(arr);
      const idSet = new Set(ids.map(i => i.id));
      setQueue(prev => prev.map(q => idSet.has(q.id) ? { ...q, progress: 100, status: "done" } : q));
      showToast(`Uploaded ${arr.length} files from folder`, "success");
    } catch (err: any) {
      const idSet = new Set(ids.map(i => i.id));
      setQueue(prev => prev.map(q => idSet.has(q.id) ? { ...q, status: "error" } : q));
      showToast(err.message || "Folder upload failed", "error");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Left col */}
      <div className="lg:col-span-2 space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${dragging ? "border-[#2563EB] bg-blue-50 scale-[1.01]" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30"}`}
        >
          <input ref={inputRef} type="file" multiple className="hidden"
            onChange={e => { if (e.target.files?.length) { handleFiles(e.target.files); e.target.value = ""; } }} />
          <input ref={folderInputRef} type="file" multiple className="hidden"
            {...({ webkitdirectory: "true", directory: "true" } as any)}
            onChange={e => { if (e.target.files?.length) { handleFolderUpload(e.target.files); e.target.value = ""; } }} />
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${dragging ? "bg-[#2563EB]" : "bg-blue-50"}`}>
            <Upload size={28} className={dragging ? "text-white" : "text-[#2563EB]"}/>
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1" style={{ fontFamily:"var(--font-display)" }}>
            {dragging ? "Release to upload" : "Drop files here"}
          </h3>
          <p className="text-xs text-slate-400 mb-5">PDF, DOCX, XLSX, PPTX, PNG · up to 100 MB per file</p>
          <div className="flex items-center justify-center gap-3" onClick={e => e.stopPropagation()}>
            <Btn icon={<FileIcon size={13}/>} onClick={() => inputRef.current?.click()}>Select File</Btn>
            <Btn variant="outline" icon={<FolderOpen size={13}/>} onClick={() => folderInputRef.current?.click()}>
              Select Folder
            </Btn>
          </div>
        </div>

        {/* Queue */}
        {queue.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800" style={{ fontFamily:"var(--font-display)" }}>
                Upload Queue <span className="text-slate-400 font-normal text-xs ml-1">({queue.length})</span>
              </h3>
              <Btn size="xs" variant="ghost" onClick={() => setQueue([])}>Clear all</Btn>
            </div>
            <div className="p-3 space-y-1">
              {queue.map(f => (
                <div key={f.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                  <FileChip type={f.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-slate-700 truncate">{f.name}</p>
                      <span className="text-[10px] text-slate-400 font-mono ml-2 flex-shrink-0">{fmtSize(f.rawSize)}</span>
                    </div>
                    {f.status === "uploading" && (
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#2563EB] rounded-full transition-all duration-300 animate-pulse" style={{ width: "60%" }}/>
                      </div>
                    )}
                    {f.status === "done" && <p className="text-[10px] text-emerald-600 font-medium">Upload complete</p>}
                    {f.status === "error" && <p className="text-[10px] text-red-500">Upload failed</p>}
                    {f.status === "queued" && <p className="text-[10px] text-slate-400">Waiting…</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {f.status === "uploading" && (
                      <div className="flex items-center gap-1">
                        <div className="w-1 h-1 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay:"0ms" }}/>
                        <div className="w-1 h-1 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay:"150ms" }}/>
                        <div className="w-1 h-1 bg-[#2563EB] rounded-full animate-bounce" style={{ animationDelay:"300ms" }}/>
                      </div>
                    )}
                    {f.status === "done" && <CheckCircle size={15} className="text-emerald-500"/>}
                    {f.status === "error" && <AlertCircle size={15} className="text-red-500"/>}
                    {f.status === "queued" && <Clock size={15} className="text-slate-400"/>}
                    <button onClick={() => setQueue(p => p.filter(q => q.id !== f.id))} className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors">
                      <X size={12}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right col — Upload tips */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Info size={16} className="text-[#2563EB]"/>
            </div>
            <h3 className="text-sm font-semibold text-slate-800" style={{ fontFamily:"var(--font-display)" }}>Upload Tips</h3>
          </div>
          <div className="space-y-3 text-xs text-slate-500">
            <div className="flex items-start gap-2">
              <CheckCircle size={12} className="text-emerald-500 mt-0.5 flex-shrink-0"/>
              <span>Use <strong>Select File</strong> for individual documents</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle size={12} className="text-emerald-500 mt-0.5 flex-shrink-0"/>
              <span>Use <strong>Select Folder</strong> to upload an entire directory</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle size={12} className="text-emerald-500 mt-0.5 flex-shrink-0"/>
              <span>Drag & drop files directly onto the upload area</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle size={12} className="text-emerald-500 mt-0.5 flex-shrink-0"/>
              <span>Supported formats: PDF, DOCX, XLSX, PPTX, PNG</span>
            </div>
          </div>
        </div>

        {/* Upload summary */}
        {queue.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-3" style={{ fontFamily:"var(--font-display)" }}>Summary</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Total files</span>
                <span className="font-semibold text-slate-700 font-mono">{queue.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Completed</span>
                <span className="font-semibold text-emerald-600 font-mono">{queue.filter(q => q.status === "done").length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">In progress</span>
                <span className="font-semibold text-[#2563EB] font-mono">{queue.filter(q => q.status === "uploading").length}</span>
              </div>
              {queue.some(q => q.status === "error") && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Failed</span>
                  <span className="font-semibold text-red-500 font-mono">{queue.filter(q => q.status === "error").length}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {toast && <ToastBar msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
