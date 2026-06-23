'use client';

import React, { useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

interface CertificateProps {
    cert: {
        courseTitle: string;
        studentName: string;
        grade: number;
        claimedAt: any;
        certificateId: string;
    };
}

const CertificateCard = ({ cert }: CertificateProps) => {
    const certificateRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const formattedDate = cert.claimedAt?.seconds 
        ? new Date(cert.claimedAt.seconds * 1000).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
          })
        : new Date().toLocaleDateString();

    const handleDownloadPDF = async () => {
        if (!certificateRef.current) return;
        setIsGenerating(true);

        try {
            // Dynamic imports to prevent SSR build errors
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');

            const element = certificateRef.current;
            
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff", // Force solid white background
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
            pdf.save(`Certificate-${cert.studentName.replace(/\s+/g, '-')}.pdf`);
        } catch (error) {
            console.error('PDF Error:', error);
            alert("PDF generation failed. Using standard print as fallback.");
            window.print(); // Fallback if canvas fails
        } finally {
            setIsGenerating(false);
        }
    };

    const titleGradient = {
        background: 'linear-gradient(143deg, #3b82f6, #6366f1, #ec4899)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    };

    const nameGradient = {
        background: 'linear-gradient(143deg, #3b82f6, #6366f1, #ec4899)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    };

    return (
        <div className="flex flex-col items-center gap-6 w-full">
            <div className="w-full max-w-5xl overflow-x-auto pb-4 scrollbar-hide">
                {/* 
                    Using inline styles for colors (Hex) to avoid html2canvas "lab()" or "oklch()" errors 
                */}
                <div 
                    ref={certificateRef}
                    className="relative bg-white mx-auto overflow-hidden shadow-2xl"
                    style={{ 
                        width: '1123px', 
                        height: '794px',
                        minWidth: '1123px',
                        color: '#0f172a' // Slate-900
                    }}
                >
                    {/* Background Template */}
                    <img 
                        src="/certbg.png" 
                        alt="Background"
                        className="absolute inset-0 w-full h-full object-cover z-0"
                    />

                    {/* Content */}
                    <div className="h-full w-full p-12 md:p-14 flex flex-col justify-between items-start text-left relative z-10 overflow-hidden">
                        <div className="w-[60%] flex flex-col justify-between h-full">
                            
                            {/* Header */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-start gap-6 mt-5 ml-7">
                                    <div className="flex items-center justify-center">
                                        <img src="/logocryptolearn.png" alt="Logo" className="h-14 w-auto object-contain" />
                                        <span className="text-[-15px] font-bold tracking-widest uppercase -mt-4" style={{ color: '#0f172a' }}>CRYPTOLEARN</span>
                                    </div>
                                    <div className="flex items-center justify-center gap-3">
                                        <img src="/cryptowarriors.png" alt="Logo" className="h-8 w-auto object-contain rounded" />
                                        <span className="text-[-15px] font-bold tracking-widest uppercase -mt-4" style={{ color: '#0f172a' }}>CRYPTO WARRIORS</span>
                                    </div>
                                </div>

                                <div className="ml-5 -mb-10">
                                    <h1 className="text-5xl md:text-[85px] font-black leading-none mb-6" style={{color: "#3b82f6"}}>
                                        Certificate
                                    </h1>
                                    <p className="text-2xl font-bold tracking-[0.3em] uppercase ml-1" style={{ color: '#1e293b' }}>
                                        of Course Completion
                                    </p>
                                    <p className="text-lg tracking-wider uppercase mt-2 ml-1" style={{ color: '#475569' }}>
                                        This certificate is presented to
                                    </p>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="space-y-4 my-auto ml-5 ">
                                <h2 className="text-6xl md:text-6xl font-black max-w-md leading-relaxed -mt-11" style={{color: "#3b82f6"}}>
                                    {cert.studentName || "Valued Student"}
                                </h2>
                                <p className="text-xl leading-relaxed w-185" style={{ color: '#334155' }}>
                                    has successfully completed all requirements and earned a final grade of{" "}
                                    <span className="font-bold" style={{ color: '#0f172a' }}>{cert.grade}%</span> for the professional course:{" "}
                                    <span className="font-bold" style={{ color: '#0f172a' }}>"{cert.courseTitle}"</span>
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="flex justify-between items-end w-230 pt-4 mb-5 ml-5">
                                <div className="flex flex-col items-center w-70 mb-4">
                                    <span className="font-bold text-[15px] mb-2" style={{ color: '#0f172a' }}>{formattedDate}</span>
                                    <div className="w-full border-b my-1" style={{ color: '#64748b' }}></div>
                                    <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#64748b' }}>Date</span>
                                </div>

                                <div className="flex flex-col items-center w-80 relative">
                                    <img 
                                        src="/signature.png" 
                                        alt="Signature" 
                                        className="h-15 w-auto object-contain" 
                                    />
                                    <div className="w-full border-b my-1 -mt-1" style={{ color: '#64748b' }}></div>
                                    <span className="font-bold text-[15px] uppercase " style={{ color: '#0f172a' }}>Aldrin E. Taccayan</span>
                                    <span className="text-[10px] font-bold tracking-wider uppercase text-center mt-0.5" style={{ color: '#64748b' }}>
                                        Chief Executive Officer, Crypto Warriors
                                    </span>
                                    
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <button 
                onClick={handleDownloadPDF}
                disabled={isGenerating}
                className="flex items-center gap-3 px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl disabled:opacity-70 active:scale-95"
            >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                {isGenerating ? 'Generating High-Res PDF...' : 'Download Certificate (PDF)'}
            </button>
        </div>
    );
};

export default CertificateCard;