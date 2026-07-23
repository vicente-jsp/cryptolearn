'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import useAuth from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import ImageUploader from '@/components/ImageUploader';
import Select, { StylesConfig } from 'react-select';
import { useTheme } from '@/contexts/ThemeContext';
import { 
    ImagePlus, 
    Type, 
    FileText, 
    Tags, 
    PlusCircle, 
    Loader2, 
    AlertCircle,
    ArrowLeft,
    ChartColumnIncreasing,
    DollarSign, // Added for pricing
    CreditCard  // Added for instructions
} from 'lucide-react';
import Link from 'next/link';

// ---------------------- Types ----------------------
interface SelectOption {
  value: string;
  label: string;
}

// -------------------- Component --------------------
export default function CreateCourse() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  // -------------------- State --------------------
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [availableTags, setAvailableTags] = useState<SelectOption[]>([]);
  const [selectedTags, setSelectedTags] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState('basic');

  // --- NEW PRICING STATE ---
  const [pricingType, setPricingType] = useState<'free' | 'paid'>('free');
  const [price, setPrice] = useState<string>('');
  const [paymentInstructions, setPaymentInstructions] = useState('');

  // -------------------- Fetch Tags --------------------
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tagsCollectionRef = collection(db, 'tags');
        const querySnapshot = await getDocs(tagsCollectionRef);
        const tagsList = querySnapshot.docs.map((doc) => ({
          value: doc.data().name,
          label: doc.data().name,
        })) as SelectOption[];
        setAvailableTags(tagsList);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch tags.');
      } finally {
        setLoading(false);
      }
    };
    fetchTags();
  }, []);

  // -------------------- React Select Styles --------------------
  const selectStyles: StylesConfig<SelectOption, true> = {
    control: (base, state) => ({
      ...base,
      backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
      borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
      color: theme === 'dark' ? '#ffffff' : '#111827',
      padding: '2px',
      borderRadius: '0.75rem',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : 'none',
      '&:hover': { borderColor: '#6366f1' },
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
      border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
      borderRadius: '0.75rem',
      overflow: 'hidden',
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused 
        ? (theme === 'dark' ? '#374151' : '#f3f4f6') 
        : (theme === 'dark' ? '#1f2937' : '#ffffff'),
      color: theme === 'dark' ? '#f3f4f6' : '#111827',
      cursor: 'pointer',
    }),
    singleValue: (base) => ({ ...base, color: theme === 'dark' ? '#f3f4f6' : '#111827' }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: theme === 'dark' ? '#374151' : '#e0e7ff',
      borderRadius: '0.375rem',
    }),
    multiValueLabel: (base) => ({ ...base, color: theme === 'dark' ? '#f3f4f6' : '#3730a3' }),
    multiValueRemove: (base) => ({
      ...base,
      color: theme === 'dark' ? '#9ca3af' : '#4f46e5',
      ':hover': {
        backgroundColor: theme === 'dark' ? '#4b5563' : '#c7d2fe',
        color: theme === 'dark' ? '#ffffff' : '#312e81',
      },
    }),
    input: (base) => ({ ...base, color: theme === 'dark' ? '#fff' : '#000' })
  };

  // -------------------- Create Course --------------------
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setError('You must be logged in to create a course.'); return; }
    
    // Validation
    if (!title || !description || selectedTags.length === 0 || !imageUrl) {
      setError('Please fill out basic details and upload an image.');
      return;
    }
    if (pricingType === 'paid' && (!price || Number(price) <= 0 || !paymentInstructions)) {
      setError('Paid courses require a price greater than 0 and payment instructions.');
      return;
    }

    setIsSubmitting(true);
    try {
      const tagStrings = selectedTags.map((tag) => tag.value);
      await addDoc(collection(db, 'courses'), {
        title,
        level,
        description,
        tags: tagStrings,
        imageUrl,
        isActivated: false,
        isHidden: true,
        instructorIds: [user.uid],
        createdAt: new Date(),
        // --- NEW FIELDS ---
        pricingType,
        price: pricingType === 'paid' ? Number(price) : 0,
        paymentInstructions: pricingType === 'paid' ? paymentInstructions : '',
      });
      router.push('/educator/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(`Failed to create course: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4">
        <div className="mb-8">
            <Link href="/educator/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600 mb-4 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create a New Course</h1>
        </div>

      <form onSubmit={handleCreateCourse} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Image */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <ImagePlus className="w-4 h-4 text-indigo-500" /> Course Cover
                    </label>
                    <ImageUploader onUploadComplete={setImageUrl} />
                    {imageUrl && (
                        <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 aspect-video">
                            <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: General Info */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <Type className="w-4 h-4 text-indigo-500" /> Course Title
                        </label>
                        <span className={`text-[12px] font-mono font-bold px-2 py-0.5 rounded-md ${title.length >= 70 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                {title.length} / 75
                        </span>
                        <input
                            type="text"
                            id="title"
                            placeholder="e.g. Advanced Solidity Patterns"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={75} // Hardware limit
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-500" /> Description
                        </label>
                        <span className={`text-[12px] font-mono font-bold px-2 py-0.5 rounded-md ${description.length >= 330 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                {description.length} / 350
                            </span>
                            <textarea
                            id="description"
                            placeholder="What will students learn in this course?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={350} // Hardware limit
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none resize-none"
                        />
                    </div>
                    

                    <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <Tags className="w-4 h-4 text-indigo-500" /> Topics
                        </label>
                        <Select isMulti options={availableTags} value={selectedTags} onChange={(opt) => setSelectedTags(opt as SelectOption[])} styles={selectStyles} />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <ChartColumnIncreasing className="w-4 h-4 text-indigo-500" /> Difficulty
                        </label>
                        <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 outline-none">
                            <option value="basic">Basic</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                    </div>
                </div>

                {/* --- NEW PRICING SECTION --- */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-indigo-500" /> Pricing & Enrollment
                    </label>

                    <div className="flex gap-4">
                        <button 
                            type="button"
                            onClick={() => setPricingType('free')}
                            className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${pricingType === 'free' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-gray-100 text-gray-400'}`}
                        >
                            Free Course
                        </button>
                        <button 
                            type="button"
                            onClick={() => setPricingType('paid')}
                            className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${pricingType === 'paid' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-gray-100 text-gray-400'}`}
                        >
                            Paid Course
                        </button>
                    </div>

                    {pricingType === 'paid' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Course Price (₱)</label>
                                <input 
                                    type="number" 
                                    placeholder="0.00"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <CreditCard className="w-3 h-3" /> Payment Instructions
                                </label>
                                <textarea 
                                    placeholder="Enter GCash number or Bank Details for students to send payment to..."
                                    value={paymentInstructions}
                                    onChange={(e) => setPaymentInstructions(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-5 h-5" /> {error}
            </div>
        )}

        <div className="flex justify-end">
            <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-50"
            >
                {isSubmitting ? <Loader2 className="animate-spin" /> : <PlusCircle />} 
                {isSubmitting ? 'Creating...' : 'Create Course'}
            </button>
        </div>
      </form>
    </div>
  );
} 