// components/PaymentModal.tsx
'use client';
import { useState } from 'react';
import { db } from '@/firebase/config';
import { doc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import useAuth from '@/hooks/useAuth';
import ImageUploader from './ImageUploader'; // Use your existing uploader
import { X, CreditCard, ShieldCheck, Loader2 } from 'lucide-react';

export default function PaymentModal({ course, onClose }: any) {
    const { user } = useAuth();
    const [proofUrl, setProofUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePaymentSubmit = async () => {
        if (!proofUrl) return alert("Please upload your payment receipt.");
        setIsSubmitting(true);

        try {
            // 1. Create the enrollment request
            const requestRef = doc(db, 'courses', course.id, 'enrollmentRequests', user.uid);
            await setDoc(requestRef, {
                studentId: user.uid,
                studentEmail: user.email,
                studentName: user.displayName || user.email,
                courseId: course.id,
                courseTitle: course.title,
                status: 'pending',
                paymentProofUrl: proofUrl, // The Cloudinary URL
                price: course.price,
                requestedAt: serverTimestamp(),
            });

            // 2. Notify the Admin (Global Notifications Collection)
            await addDoc(collection(db, 'admin_notifications'), {
                message: `${user.email} submitted a payment for ${course.title}`,
                courseId: course.id,
                type: 'payment_received',
                createdAt: serverTimestamp(),
                isRead: false
            });

            alert("Payment submitted! Admin will verify your request.");
            onClose();
        } catch (err) {
            console.error(err);
            alert("Error submitting payment.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-white/20">
                <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center bg-indigo-600 text-white">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <CreditCard className="w-5 h-5" /> Checkout
                    </h2>
                    <button onClick={onClose}><X className="w-6 h-6" /></button>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <p className="text-sm text-gray-500 uppercase font-bold tracking-widest">Course</p>
                        <p className="text-xl font-black text-gray-900 dark:text-white">{course.title}</p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">How to pay:</p>
                        <p className="text-sm text-gray-600 mt-1">{course.paymentInstructions || "Please send ₱" + course.price + " to GCash: 09XX-XXX-XXXX"}</p>
                        <div className="mt-3 text-2xl font-black text-indigo-600">₱{course.price}</div>
                    </div>

                    <div>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Upload Proof of Payment</p>
                        <ImageUploader onUploadComplete={(url) => setProofUrl(url)} />
                    </div>

                    <button 
                        onClick={handlePaymentSubmit}
                        disabled={!proofUrl || isSubmitting}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                        {isSubmitting ? 'Submitting Request...' : 'I have paid, Submit Proof'}
                    </button>
                </div>
            </div>
        </div>
    );
}