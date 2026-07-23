'use client';

import { useState, useRef } from 'react';
import axios from 'axios';
import { 
    UploadCloud, 
    FileText, 
    CheckCircle, 
    Loader2, 
    X, 
    Paperclip,
    AlertCircle
} from 'lucide-react';

interface FileUploaderProps {
    onUploadComplete: (url: string, fileName: string) => void;
    onUploadStart?: () => void;
    onUploadError?: (error: string) => void;
}

const CLOUDINARY_UPLOAD_PRESET = "lms_uploads"; 
const CLOUDINARY_CLOUD_NAME = "dvfszba6c"; 

export default function FileUploader({ onUploadComplete, onUploadStart, onUploadError }: FileUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [fileName, setFileName] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset states
        setError(null);
        setIsSuccess(false);

        // Validation
        const allowedExtensions = /(\.doc|\.docx|\.txt|\.xls|\.xlsx)$/i;
        if (!allowedExtensions.exec(file.name)) {
            const errorMsg = 'Invalid file type. Supports: .doc, .docx, .txt, .xls, .xlsx';
            setError(errorMsg);
            onUploadError?.(errorMsg);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setUploading(true);
        setFileName(file.name);
        onUploadStart?.();

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        
        formData.append('resource_type', 'raw');
        

        try {
            const response = await axios.post(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`,
                formData,
                {
                    onUploadProgress: (progressEvent) => {
                        const total = progressEvent.total || file.size;
                        const current = progressEvent.loaded;
                        setProgress(Math.round((current * 100) / total));
                    },
                }
            );
            
            const { secure_url } = response.data;
            setIsSuccess(true);
            onUploadComplete(secure_url, file.name);
        } catch (err: any) {
            console.error("File upload failed", err);
            const errorMsg = err.response?.data?.error?.message || "Upload failed. Check your connection.";
            setError(errorMsg);
            onUploadError?.(errorMsg);
            setFileName(''); 
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleReset = () => {
        setFileName('');
        setIsSuccess(false);
        setProgress(0);
        setError(null);
    };

    return (
        <div className="w-full">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-indigo-500" /> Lesson File Attachment
            </label>

            {!uploading && !isSuccess && (
                <div className="relative group">
                    <label 
                        htmlFor="file-upload" 
                        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${
                            error 
                            ? 'border-red-300 bg-red-50 dark:bg-red-900/10' 
                            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-400'
                        }`}
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <div className="p-2 bg-white dark:bg-gray-700 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                <UploadCloud className={`w-6 h-6 ${error ? 'text-red-500' : 'text-gray-500 group-hover:text-indigo-500'}`} />
                            </div>
                            <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400">Click to upload</span>
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-tighter font-medium">DOCX, TXT, XLSX (Max 10MB)</p>
                        </div>
                        <input 
                            ref={fileInputRef}
                            id="file-upload" 
                            type="file" 
                            className="hidden" 
                            onChange={handleFileChange} 
                            accept=".doc,.docx,.txt,.xls,.xlsx" 
                        />
                    </label>
                </div>
            )}

            {uploading && (
                <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm animate-in fade-in zoom-in-95">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                            <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{fileName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 tracking-tight">Uploading to secure server...</p>
                        </div>
                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out" 
                            style={{ width: `${progress}%` }} 
                        />
                    </div>
                </div>
            )}
            
            {isSuccess && (
                <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl flex items-center justify-between gap-4 animate-in slide-in-from-left-2">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[200px]">{fileName}</p>
                            <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">Ready to save</p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={handleReset}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-gray-800 rounded-full transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {error && (
                <div className="mt-2 flex items-center gap-2 text-red-600 text-xs font-semibold bg-red-50 p-2 rounded-lg border border-red-100 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {error}
                </div>
            )}
        </div>
    );
}