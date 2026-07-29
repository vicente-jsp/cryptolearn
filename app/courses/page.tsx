'use client';

import { useEffect, useState, useMemo, useRef, Suspense } from 'react';
import { collection, getDocs, query, where, doc, getDoc, setDoc, serverTimestamp, addDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ImageUploader from '@/components/ImageUploader'; // Ensure this exists
import { useRouter } from 'next/navigation';
import { 
    Search, 
    BookOpen, 
    Filter, 
    Sparkles, 
    Layers,
    ArrowRight,
    Lock,
    Loader2,
    Clock,
    CreditCard,
    X,
    ShieldCheck
} from 'lucide-react';

// --- Types ---
interface Course {
  id: string;
  title: string;
  description: string;
  level: 'basic' | 'intermediate' | 'advanced';
  tags: string[];
  imageUrl?: string;
  pricingType?: 'free' | 'paid';
  price?: number;
  paymentInstructions?: string;
}

// --- Payment Modal Component ---
const PaymentModal = ({ course, user, onClose, onRefresh }: any) => {
    const [proofUrl, setProofUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePaymentSubmit = async () => {
        if (!proofUrl) return alert("Please upload your payment receipt.");
        setIsSubmitting(true);

        try {
            const requestRef = doc(db, 'courses', course.id, 'enrollmentRequests', user.uid);
            await setDoc(requestRef, {
                studentId: user.uid,
                studentEmail: user.email,
                studentName: user.displayName || user.email,
                courseId: course.id,
                courseTitle: course.title,
                status: 'pending',
                paymentProofUrl: proofUrl,
                price: course.price || 0,
                requestedAt: serverTimestamp(),
            });

            alert("Payment submitted! Admin will verify your request.");
            onRefresh();
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
                        <p className="text-sm text-gray-600 mt-1">{course.paymentInstructions || "Please send payment to our designated channel."}</p>
                        <div className="mt-3 text-2xl font-black text-indigo-600">₱{course.price}</div>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Upload Proof of Payment</p>
                        <ImageUploader onUploadComplete={(url) => setProofUrl(url)} />
                    </div>
                    <button 
                        onClick={handlePaymentSubmit}
                        disabled={!proofUrl || isSubmitting}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                        {isSubmitting ? 'Submitting...' : 'Submit Proof'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const CourseSkeleton = () => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden h-full flex flex-col animate-pulse">
        <div className="h-48 bg-gray-200 dark:bg-gray-700" />
        <div className="p-6 flex-1 space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        </div>
    </div>
);

function CourseCatalogContent() {
  const { user } = useAuth(); 
  const router = useRouter();
  const searchParams = useSearchParams();
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [userEnrollments, setUserEnrollments] = useState<Record<string, string>>({}); // courseId -> status
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [completedInfo, setCompletedInfo] = useState<{level: string, tags: string[]}[]>([]);
  const [activePaymentCourse, setActivePaymentCourse] = useState<Course | null>(null);

  const tagRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearchTerm(q);
  }, [searchParams]);

  const fetchEnrollmentStatuses = async (courses: Course[]) => {
    if (!user) return;
    const statuses: Record<string, string> = {};
    await Promise.all(courses.map(async (course) => {
        const enrollmentRef = doc(db, 'courses', course.id, 'enrollmentRequests', user.uid);
        const snap = await getDoc(enrollmentRef);
        if (snap.exists()) {
            statuses[course.id] = snap.data().status;
        }
    }));
    setUserEnrollments(statuses);
  };

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'courses'), where('isHidden', '==', false), where('isActivated', '==', true));
        const coursesSnapshot = await getDocs(q); 
        const coursesList = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Course[];

        const tagsSnapshot = await getDocs(collection(db, 'tags'));
        const tagsList = tagsSnapshot.docs.map(doc => doc.data().name).filter(t => typeof t === 'string');

        setAllCourses(coursesList);
        setAllTags(tagsList.sort());
        if (user) fetchEnrollmentStatuses(coursesList);
      } catch (err: any) {
        setError(`Failed to fetch catalog: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [user]);

  useEffect(() => {
    const fetchProgress = async () => {
        if (!user) return;
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        const ids = userSnap.data()?.completedCourses || [];
        const docs = await Promise.all(ids.map((id: string) => getDoc(doc(db, 'courses', id))));
        setCompletedInfo(docs.map(d => ({ level: d.data()?.level, tags: d.data()?.tags || [] })));
    };
    fetchProgress();
  }, [user]);

  const checkIfLocked = (course: Course) => {
    if (course.level === 'basic') return false;
    const targetRequired = course.level === 'advanced' ? 'intermediate' : 'basic';
    return !completedInfo.some(completed => 
        completed.level === targetRequired && completed.tags.some(t => course.tags.includes(t))
    );
};

  const filteredCourses = useMemo(() => {
    return allCourses.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTags = selectedTags.length === 0 || selectedTags.some(t => course.tags.includes(t));
      const matchesLevel = selectedLevel === 'all' || course.level === selectedLevel;
      return matchesSearch && matchesTags && matchesLevel;
    });
  }, [allCourses, searchTerm, selectedTags, selectedLevel]);

  const handleFreeEnroll = async (courseId: string) => {
    if (!user) return alert("Please login to enroll.");
    try {
        await setDoc(doc(db, 'courses', courseId, 'enrollmentRequests', user.uid), {
            studentId: user.uid,
            studentEmail: user.email,
            status: 'enrolled',
            requestedAt: serverTimestamp()
        });
        await setDoc(doc(db, 'users', user.uid), { 
            enrolledCourses: arrayUnion(courseId) 
        }, { merge: true });

        // 3. Optional: Refresh local state so the button changes to "Enter Course"
        fetchEnrollmentStatuses(allCourses);

        // 4. NAVIGATION: Send the user to the course view page immediately
        router.push(`/courses/${courseId}/view`);
        
    } catch (e) { 
        console.error("Enrollment error:", e);
        alert("Enrollment failed. Please try again."); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 pb-20">
      {activePaymentCourse && (
          <PaymentModal 
            course={activePaymentCourse} 
            user={user} 
            onClose={() => setActivePaymentCourse(null)} 
            onRefresh={() => fetchEnrollmentStatuses(allCourses)}
          />
      )}

      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-6 py-12">
              <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-100 rounded-lg"><BookOpen className="w-6 h-6 text-indigo-600" /></div>
                  <h1 className="text-3xl md:text-4xl font-bold">Course Catalog</h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400">Explore premium Web3 and Blockchain courses.</p>
          </div>
      </div>

      <div className="container mx-auto px-6 -mt-8">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-12 border dark:border-gray-700">
            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Search</label>
                    <div className="relative w-150%">
                        <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search courses..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl outline-none border dark:border-gray-700 focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Topics</label>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide w-150">
                        {allTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all whitespace-nowrap ${selectedTags.includes(tag) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-700'}`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex gap-2 mt-6">
                {['all', 'basic', 'intermediate', 'advanced'].map(lvl => (
                    <button key={lvl} onClick={() => setSelectedLevel(lvl)} className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase border ${selectedLevel === lvl ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-500'}`}>{lvl}</button>
                ))}
            </div>
        </div>

        {/* Course Grid */}
        {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map(n => <CourseSkeleton key={n} />)}
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredCourses.map(course => {
                    const isLocked = checkIfLocked(course);
                    const status = userEnrollments[course.id] || 'none';

                    return (
                        <div key={course.id} className="relative group flex flex-col h-full bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 shadow-sm hover:shadow-md transition-all overflow-hidden">
                            {isLocked && (
                                <div className="absolute inset-0 z-20 bg-gray-900/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center text-white p-6 text-center transition-all duration-300">
                            {/* Lock Icon */}
                            <div className="bg-white/10 p-4 rounded-full mb-4 ring-1 ring-white/20">
                                <Lock className="w-8 h-8 text-indigo-400" />
                            </div>

                            <h3 className="font-black text-xl uppercase tracking-tight mb-2">
                                Course Locked
                            </h3>

                            {/* Dynamic Prerequisite Message */}
                            <p className="text-xs text-gray-300 mb-6 leading-relaxed max-w-[200px]">
                                To unlock this <span className="text-white font-bold">{course.level}</span> course, you must first complete a 
                                <span className="text-indigo-400 font-bold mx-1">
                                    {course.level === 'advanced' ? 'Intermediate' : 'Basic'}
                                </span> 
                                course that includes at least one of these topics:
                            </p>

                            {/* Required Tags List */}
                            <div className="flex flex-wrap justify-center gap-2">
                                {course.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded-lg shadow-sm"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            {/* Quick link to go back to catalog/filters */}
                            <button 
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedLevel(course.level === 'advanced' ? 'intermediate' : 'basic');
                                }}
                                className="mt-8 text-[10px] font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-[0.2em] border-b border-gray-700 hover:border-white pb-1"
                            >
                                Find Prerequisites →
                            </button>
                        </div>
                            )}

                            <div className="h-48 bg-gray-100 dark:bg-gray-900 relative">
                                {course.imageUrl && <img src={course.imageUrl} className="w-full h-full object-cover" />}
                                <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-lg text-[10px] font-black uppercase text-indigo-600 shadow-sm">{course.level}</div>
                            </div>

                            <div className="p-6 flex flex-col flex-grow">
                                <div className="flex gap-2 mb-3">
                                    {course.tags.slice(0, 2).map(t => <span key={t} className="text-[9px] uppercase font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">{t}</span>)}
                                </div>
                                <h2 className="text-xl font-bold mb-2 line-clamp-1">{course.title}</h2>
                                <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-grow">{course.description}</p>
                                
                                <div className="pt-4 border-t dark:border-gray-700">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-sm font-bold text-gray-400">Price</span>
                                        <span className="text-lg font-black text-indigo-600">{course.pricingType === 'paid' ? `₱${course.price}` : 'FREE'}</span>
                                    </div>

                                    {status === 'enrolled' ? (
                                        /* If already enrolled, go directly to lessons */
                                        <Link 
                                            href={`/courses/${course.id}/view`} 
                                            className="w-full py-3 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all"
                                        >
                                            Enter Course <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    ) : status === 'pending' ? (
                                        /* If payment is waiting, show status */
                                        <button 
                                            disabled 
                                            className="w-full py-3 bg-amber-100 text-amber-700 rounded-xl font-bold flex items-center justify-center gap-2 cursor-not-allowed"
                                        >
                                            <Clock className="w-4 h-4" /> Pending Approval
                                        </button>
                                    ) : (
                                        /* 
                                        NEW LOGIC: Instead of "Enroll/Buy", show "View Course".
                                        This leads them to /courses/[courseId] where they can read 
                                        details before committing.
                                        */
                                        <Link 
                                            href={`/courses/${course.id}`}
                                            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                                isLocked 
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20'
                                            }`}
                                        >
                                            {isLocked ? (
                                                <>
                                                    <Lock className="w-4 h-4" /> Locked
                                                </>
                                            ) : (
                                                <>
                                                    View Course <ArrowRight className="w-4 h-4" />
                                                </>
                                            )}
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </div>
    </div>
  );
}

export default function CourseCatalog() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>}>
      <CourseCatalogContent />
    </Suspense>
  );
}