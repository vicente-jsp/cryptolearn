'use client';

import React, { useRef } from 'react';
import { Trophy, Award, ShieldCheck, Printer, Download, X } from 'lucide-react';

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
            {/* Certificate Container */}
            <div 
                ref={certificateRef}
                className="certificate-card relative w-full max-w-4xl aspect-[1.414/1] shadow-2xl rounded-sm p-1 overflow-hidden print:shadow-none"
                style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
            >
                <img 
                    src="/certbg.png" // <--- PATH TO YOUR FILE IN THE PUBLIC FOLDER
                    alt="Certificate Background"
                    className="absolute inset-0 w-full h-full object-cover z-0" // z-0 puts it behind the content
                />
                {/* Inner Border Decorative Frame */}
                <div className="h-full w-full p-8 flex flex-col items-center justify-between relative overflow-hidden">
                    
                    {/* Background Watermark Icon */}
                    <Trophy className="absolute -bottom-10 -right-10 w-64 h-64 text-indigo-50 opacity-[0.03] rotate-12" />
                    
                    {/* Header */}
                    <div className="text-center space-y-2 pt-4 -mt-7">
                        <div className="flex justify-center -mb-5">
                            <img 
                                src="/wordscryptolearn.png" 
                                alt="Logo" 
                                className="h-20 w-auto object-contain mr-25 -mt-4 " 
                            />
                            <img
                                src="/cryptowarriors.png"
                                alt="Logo" 
                                className="h-12 w-auto object-contain rounded-2xl "
                            />
                        </div>
                        <div className="flex justify-center">
                            <img 
                                src="/logocryptolearn.png" 
                                alt="cryptolearn" 
                                className="h-5 w-auto object-contain mt-3"
                            />
                            <img
                                src="/warriors.png"
                                alt="cryptowarriors" 
                                className="h-11 w-auto object-contain"
                            />
                        </div>
                        <h1 className="text-4xl font-serif font-bold text-gray-900 uppercase tracking-[0.2em]">
                            Certificate
                        </h1>
                        <p className="text-sm font-serif font-semibold text-gray-900 uppercase tracking-widest ">
                            of Course Completion
                        </p>
                    </div>

                    {/* Body Content */}
                    <div className="flex items-center justify-center text-center space-y-6 flex-grow flex flex-col justify-center">
                        <p className="text-gray-900 text-lg">This is to certify that</p>
                        
                        <div className="space-y-1 ">
                            <h2 className="text-4xl font-serif font-bold text-gray-900 border-b-2 border-red-800 px-12 inline-block pb-2">
                                {cert.studentName || "Valued Student"}
                            </h2>
                        </div>

                        <p className="text-gray-900 max-w-lg mx-auto leading-relaxed text-lg">
                            has successfully completed all requirements and got a final grade of {" "}
                            <span className="font-bold text-red-800">{cert.grade}%</span> for the professional course 
                            <span className="block text-xl font-serif font-bold italic text-red-800">"{cert.courseTitle}"</span>
                            Awarded on {formattedDate}.
                        </p>

                        <div className="flex items-center justify-center w-48 border-b-2 border-red-800 pb-2 inline-block">
                            <img
                                src="/signature.png"
                                alt="signature"
                                className="w-auto h-auto object-contain"
                            />
                
                        </div>
                        <h3 className="text-gray-900 text-sm font-serif font-bold uppercase tracking-widest -mt-5">
                            Aldrin E. Taccayan<br/>
                        </h3>
                        <p className="text-gray-900 text-xs font-serif tracking-widest -mt-6">
                            Chief Executive Officer, Crypto Warriors
                        </p>

                        
                    </div>

                    
                </div>
            </div>

            

            {/* --- CRITICAL LANDSCAPE PRINT STYLES --- */}
            <style jsx global>{`
                @media print {
                    /* Force landscape page layout */
                    @page {
                        size: A4 landscape;
                        margin: 0;
                    }
                    
                    /* Hide everything except the certificate card */
                    body * {
                        visibility: hidden;
                    }
                    
                    /* Ensure certificate card is visible and takes up full space */
                    .certificate-card, .certificate-card * {
                        visibility: visible;
                    }
                    
                    .certificate-card {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100%;
                        border: none !important;
                        box-shadow: none !important;
                        background: transparent !important;
                    }
                    .certificate-card img {
                        display: block !important;
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }

                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default CertificateCard;