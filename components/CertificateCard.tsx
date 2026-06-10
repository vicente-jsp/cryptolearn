'use client';

import React, { useRef } from 'react';
import { Trophy, CheckCircle, Lock, Download, X } from 'lucide-react';

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

    // Format the date safely from Firebase Timestamp or Date object
    const formattedDate = cert.claimedAt?.seconds 
        ? new Date(cert.claimedAt.seconds * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : new Date().toLocaleDateString();

    const handleDownloadPDF = () => {
        window.print();
    };

    return (
        <div className="flex flex-col items-center gap-6 no-print-wrapper w-full">
            {/* Certificate Container (A4 Landscape Aspect Ratio) */}
            <div 
                ref={certificateRef}
                className="certificate-card relative w-full max-w-5xl aspect-[1.414/1] shadow-2xl rounded-2xl overflow-hidden print:shadow-none"
                style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
            >
                {/* Background Template Image */}
                <img 
                    src="/certbg.png" 
                    alt="Certificate Background"
                    className="bg-image absolute inset-0 w-full h-full object-cover z-0" 
                />

                {/* Inner Content Wrapper - Left-heavy padding */}
                <div className="h-full w-full p-12 md:p-14 flex flex-col justify-between items-start text-left relative z-10 overflow-hidden">
                    
                    {/* Left Column Container (Constrained to 60% width to avoid overlapping the 3D graphic on the right) */}
                    <div className="w-[60%] flex flex-col justify-between h-full">
                        
                        {/* --- HEADER SECTION --- */}
                        <div className="space-y-4">
                            {/* Horizontal Logos Aligned at Top-Left */}
                            <div className="flex items-center gap-6 mt-5 ml-7">
                                <div className="flex items-center gap-2">
                                    <img src="/logocryptolearn.png" alt="Cryptolearn" className="h-16 w-auto object-contain" />
                                    <span className="font-extrabold text-[15px] tracking-widest text-gray-900 font-sans">CRYPTOLEARN</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <img src="/cryptowarriors.png" alt="Crypto Warriors" className="h-8 w-auto object-contain rounded" />
                                    <span className="font-extrabold text-[15px] tracking-widest text-gray-900 font-sans">CRYPTO WARRIORS</span>
                                </div>
                            </div>

                            {/* Main Titles */}
                            <div className="ml-5 -mb-10">
                                <h1 className="text-5xl md:text-[85px] font-black tracking-tight bg-gradient-to-r from-blue-500 via-indigo-500 to-pink-400 bg-clip-text text-transparent pb-1">
                                    Certificate
                                </h1>
                                <p className="text-[20px] font-bold tracking-[0.25em] text-gray-900 uppercase ml-1">
                                    of Course Completion
                                </p>
                                <p className="text-[15px] tracking-wider text-gray-800 uppercase mt-2 uppercase ml-1">
                                    This certificate is presented to
                                </p>
                            </div>
                        </div>

                        {/* --- BODY CONTENT --- */}
                        <div className="space-y-4 my-auto ml-5 ">
                            {/* Student Name with Blue-to-Pink Gradient */}
                            <h2 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-indigo-500 via-pink-400 to-pink-400 bg-clip-text text-transparent py-1">
                                {cert.studentName || "Valued Student"}
                            </h2>

                            {/* Description Copy */}
                            <p className="text-gray-800 text-[16px] leading-relaxed font-sans max-w-md">
                                has successfully completed all requirements and got a final grade of{" "}
                                <span className="font-bold text-gray-900">{cert.grade}%</span> for the professional course:{" "}
                                <span className="font-bold text-gray-900">"{cert.courseTitle}"</span>
                            </p>
                        </div>

                        {/* --- FOOTER SECTION --- */}
                        <div className="flex justify-between items-end w-200 pt-4 mb-5 ml-5">
                            {/* Date Line */}
                            <div className="flex flex-col items-center w-70 mb-4">
                                <span className="font-bold text-[13px] text-gray-900 mb-1">{formattedDate}</span>
                                <div className="w-full border-b border-gray-300 my-1"></div>
                                <span className="text-[12px] font-bold tracking-widest text-gray-600 uppercase">Date</span>
                            </div>

                            {/* Signature Line */}
                            <div className="flex flex-col items-center w-80 relative ">
                                {/* Floating Signature Image above line */}
                                <div className="absolute -top-7 h-10 w-auto flex items-end justify-center">
                                    <img src="/signature.png" alt="Signature" className="h-15 w-auto object-contain" />
                                </div>
                                <div className="w-full border-b border-gray-300 my-1 mt-4"></div>
                                <span className="font-bold text-[14px] text-gray-900 uppercase">Aldrin E. Taccayan</span>
                                <span className="text-[10px] font-bold tracking-wider text-gray-800 uppercase text-center mt-0.5">
                                    Chief Executive Officer, Crypto Warriors
                                </span>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Action Button (Hidden on Print) */}
            <div className="flex gap-4 no-print">
                <button 
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
                >
                    <Download className="w-4 h-4" /> Download PDF
                </button>
            </div>

            {/* --- LANDSCAPE A4 PRINT CONFIGURATION --- */}
            <style jsx global>{`
                @media print {
                    /* 1. Force the print canvas to A4 Landscape and remove browser margins */
                    @page {
                        size: A4 landscape;
                        margin: 0 !important;
                    }
                    
                    /* 2. Reset html and body to prevent any overflow or extra pages */
                    html, body {
                        width: 297mm !important;
                        height: 210mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: hidden !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        background-color: #ffffff !important;
                    }
                    
                    /* 3. Hide all non-essential elements on the page (sidebars, buttons, layouts) */
                    body * {
                        visibility: hidden !important;
                    }
                    
                    /* 4. Make ONLY the certificate card and its nested elements visible */
                    .certificate-card, .certificate-card * {
                        visibility: visible !important;
                    }
                    
                    /* 5. FORCE PHYSICAL A4 LANDSCAPE DIMENSIONS (Bypasses parent height collapse) */
                    .certificate-card {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 297mm !important;  /* Force A4 Landscape Width */
                        height: 210mm !important; /* Force A4 Landscape Height */
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: transparent !important;
                        page-break-inside: avoid !important;
                        page-break-after: avoid !important;
                    }

                    /* 6. Force the background template image to cover the entire page */
                    .certificate-card img.bg-image {
                        display: block !important;
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 297mm !important;  /* Match Card Width */
                        height: 210mm !important; /* Match Card Height */
                        object-fit: cover !important;
                        z-index: 0 !important;
                    }

                    /* 7. Hide the action buttons during printing */
                    .no-print {
                        display: none !important;
                        visibility: hidden !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default CertificateCard;