'use client';

import React, { useEffect, useState } from 'react';
import useAuth from '@/hooks/useAuth'; 
import { 
    collectionGroup, 
    query, 
    where, 
    getDocs, 
    doc, 
    writeBatch, 
    serverTimestamp,
    collection,
    arrayUnion 
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { 
    CheckCircle, 
    XCircle, 
    ExternalLink, 
    Clock, 
    Loader2, 
    AlertCircle,
    ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function AdminPaymentsPage() {
    const { user } = useAuth(); 
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchPendingPayments = async () => {
        setLoading(true);
        try {
            // This searches through EVERY course's 'enrollmentRequests' sub-collection
            const q = query(
                collectionGroup(db, 'enrollmentRequests'), 
                where('status', '==', 'pending'),
                where('paymentType', '==', 'paid')
            );
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ 
                id: d.id, 
                ref: d.ref, // Keep reference for updating
                ...d.data() 
            }));
            setRequests(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPendingPayments(); }, []);

    useEffect(() => {
        if (user) {
            console.log("Admin Logged In:", user.uid);
        }
    }, [user]);;

    
const handleApproval = async (request: any, isApproved: boolean) => {
    setProcessingId(request.studentId);
    const batch = writeBatch(db);

    try {
        // 1. Update Enrollment Request Status
            batch.update(request.ref, { 
                status: isApproved ? 'enrolled' : 'rejected',
                processedAt: serverTimestamp()
            });

            if (isApproved) {
                // 2. Add courseId to student's user profile
                const userRef = doc(db, 'users', request.studentId);
                batch.update(userRef, {
                    enrolledCourses: arrayUnion(request.courseId)
                });

                // 3. Notify student
                const notifRef = doc(collection(db, 'users', request.studentId, 'notifications'));
                batch.set(notifRef, {
                    message: `Verified! You now have access to ${request.courseTitle}.`,
                    courseId: request.courseId,
                    type: 'enrollment_approved',
                    isRead: false,
                    createdAt: serverTimestamp()
                });
            }

            await batch.commit();
                setRequests(prev => prev.filter(r => r.id !== request.id));
                alert(isApproved ? "Enrollment Approved!" : "Enrollment Rejected.");
        } catch (err) {
            console.error("Admin Approval Error:", err);
            alert("Failed to process request.");
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-10 px-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Clock className="text-amber-500" /> Pending Payments
                </h1>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin w-10 h-10 text-indigo-600" /></div>
            ) : requests.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-500">All payments are cleared!</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {requests.map((req) => (
                        <div key={req.studentId} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded uppercase">
                                        {req.courseTitle}
                                    </span>
                                    <span className="text-xs font-bold text-gray-400">Price: ₱{req.price}</span>
                                </div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{req.studentEmail}</h3>
                                <p className="text-xs text-gray-500">Requested: {new Date(req.requestedAt?.seconds * 1000).toLocaleString()}</p>
                            </div>

                            <div className="flex items-center gap-4">
                                {req.paymentProofUrl && (
                                    <a 
                                        href={req.paymentProofUrl} 
                                        target="_blank" 
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4" /> View Receipt
                                    </a>
                                )}

                                <button 
                                    onClick={() => handleApproval(req, true)}
                                    disabled={processingId === req.studentId}
                                    className="p-3 bg-green-100 text-green-700 rounded-full hover:bg-green-600 hover:text-white transition-all disabled:opacity-50"
                                    title="Approve"
                                >
                                    <CheckCircle className="w-6 h-6" />
                                </button>

                                <button 
                                    onClick={() => handleApproval(req, false)}
                                    disabled={processingId === req.studentId}
                                    className="p-3 bg-red-50 text-red-600 rounded-full hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                                    title="Reject"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}