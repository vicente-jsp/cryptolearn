// app/(educator)/courses/[courseId]/analytics/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useParams } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import Link from 'next/link';
import { calculateStudentStatus } from '@/utils/analyticsEngine';
import { 
    BarChart3, 
    TrendingUp, 
    PieChart, 
    Users, 
    CheckCircle, 
    ArrowLeft, 
    AlertCircle,
    Loader2,
    Trophy,
    History
} from 'lucide-react'; // Removed Sparkles

import { Bar, Line, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    LineElement,
    PointElement,
    ArcElement,
    ChartOptions
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    LineElement,
    PointElement,
    ArcElement
);

// --- Types ---
interface Course { title: string; }
interface StudentProgress {
    id: string;
    email: string;
    progress: number;
    status: string;
    latestGrade?: number;
    averageGrade?: number;
    lastAccessedAt?: number;
}

interface AnalyticsSummary {
    totalStudents: number;
    completedCount: number;
    averageProgress: number;
}

interface EnrollmentData {
    status: 'enrolled' | 'pending' | 'completed';
    progress: number;
    studentEmail?: string; 
    completedItems?: string[];
    lastAccessedAt?: any;
}

interface RawGrade {
    studentId: string;
    activityName: string;
    grade: number;
    totalQuestions: number;
    attemptedAt: number;
}

interface ChartData {
    barChartData: ChartDataObject; 
    lineChartData: ChartDataObject; 
    pieChartData: ChartDataObject; 
} // Removed auditChartData

interface ChartDataset {
    label: string;
    data: (number | null)[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    tension?: number;
    hoverOffset?: number;
    borderWidth?: number;
}

interface ChartDataObject {
    labels: string[];
    datasets: ChartDataset[];
}

export default function AnalyticsPage() {
    const { user } = useAuth();
    const params = useParams();
    const courseId = params.courseId as string;

    const [course, setCourse] = useState<Course | null>(null);
    const [studentData, setStudentData] = useState<StudentProgress[]>([]);
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [rawGrades, setRawGrades] = useState<RawGrade[]>([]);
    const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);
    
    const [selectedStudentUids, setSelectedStudentUids] = useState<string[]>([]);

    const standingStyles = {
        Passed: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
        Fail: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
        "Low Risk": "bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
        "Medium Risk": "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
        "High Risk": "bg-red-50 text-red-600 border-red-100 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/50",
    };

    // Removed redFlagStudents calculation

    const [isDarkMode, setIsDarkMode] = useState(false);
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        }
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    setIsDarkMode(document.documentElement.classList.contains('dark'));
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });
        return () => observer.disconnect();
    }, []);

    const getChartOptions = (title: string): ChartOptions<any> => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: isDarkMode ? '#e5e7eb' : '#374151' }
            },
            title: {
                display: false,
                text: title,
                color: isDarkMode ? '#e5e7eb' : '#374151'
            }
        },
        scales: {
            y: {
                grid: { color: isDarkMode ? '#374151' : '#e5e7eb' },
                ticks: { color: isDarkMode ? '#9ca3af' : '#6b7280' }
            },
            x: {
                grid: { display: false },
                ticks: { color: isDarkMode ? '#9ca3af' : '#6b7280' }
            }
        }
    });

    const getPieOptions = (): ChartOptions<'pie'> => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: { color: isDarkMode ? '#e5e7eb' : '#374151' }
            }
        }
    });

    // Recalculate charts locally in memory when checkboxes are clicked
    const chartData = useMemo(() => {
    // We removed the strict check so the page can load empty charts for new courses
    return aggregateChartData(studentData, rawGrades, enrollments, selectedStudentUids);
}, [studentData, rawGrades, enrollments, selectedStudentUids]);

    useEffect(() => {
        if (!user || !courseId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Course
                const courseDocRef = doc(db, 'courses', courseId);
                const courseDocSnap = await getDoc(courseDocRef);
                const latestGradesMap = new Map<string, number>();
                
                // Auth Check
                if (!courseDocSnap.exists() || !courseDocSnap.data().instructorIds?.includes(user.uid)) {
                    throw new Error("Course not found or unauthorized access.");
                }

                setCourse(courseDocSnap.data() as Course);

                // 2. Fetch Raw Grades
                let totalTrackableItems = 0;
                const modulesRef = collection(db, 'courses', courseId, 'modules');
                const modulesSnapshot = await getDocs(modulesRef);
                
                const rawGradesPromises: Promise<RawGrade | null>[] = [];
                
                for (const moduleDoc of modulesSnapshot.docs) {
                    const lessonsRef = collection(moduleDoc.ref, 'lessons');
                    const lessonsSnapshot = await getDocs(lessonsRef);
                    
                    for (const lessonDoc of lessonsSnapshot.docs) {
                        totalTrackableItems++;
                        const quizzesRef = collection(lessonDoc.ref, 'quizzes');
                        const quizzesSnapshot = await getDocs(quizzesRef);
                        
                        for (const quizDoc of quizzesSnapshot.docs) {
                            const attemptsRef = collection(quizDoc.ref, 'quizAttempts');
                            const attemptsSnapshot = await getDocs(attemptsRef);
                            
                            attemptsSnapshot.docs.forEach(attemptDoc => {
                                const attemptData = attemptDoc.data();
                                rawGradesPromises.push(Promise.resolve({
                                    studentId: attemptData.studentId,
                                    activityName: `${lessonDoc.data().title} Quiz`,
                                    grade: attemptData.score || 0,
                                    totalQuestions: attemptData.totalQuestions || 0,
                                    attemptedAt: attemptData.submittedAt?.toMillis() || Date.now(),
                                } as RawGrade));
                            });
                        }
                    }
                }
            
                const fetchedRawGrades = (await Promise.all(rawGradesPromises)).filter((g): g is RawGrade => g !== null);
                
                fetchedRawGrades.forEach(grade => {
                    const currentHighest = latestGradesMap.get(grade.studentId) || 0;
                    if (grade.grade > currentHighest) {
                        latestGradesMap.set(grade.studentId, grade.grade);
                    }
                });

                // 3. Fetch Enrollments & Users
                const enrollmentsRef = collection(db, 'courses', courseId, 'enrollmentRequests');
                const enrolledQuery = query(enrollmentsRef, where('status', '==', 'enrolled'));
                const enrolledSnapshot = await getDocs(enrolledQuery);
                const fetchedEnrollments = enrolledSnapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    ...(doc.data() as EnrollmentData) 
                }));
                
                const studentUids = fetchedEnrollments.map(e => e.id);
                const usersCollectionRef = collection(db, 'users');
                
                const userPromises = studentUids.map(uid => getDoc(doc(usersCollectionRef, uid)));
                const userSnaps = await Promise.all(userPromises);

                // 4. Combine Data
                let totalProgressSum = 0;
                let completedCount = 0;
                
                const detailedStudentData: StudentProgress[] = fetchedEnrollments.map(enrollment => {
                    const userData = userSnaps.find(snap => snap.id === enrollment.id)?.data();
                    const completedItems = enrollment.completedItems || [];

                    const studentAttempts = fetchedRawGrades.filter(g => g.studentId === enrollment.id);
                    let studentTotalScore = 0;
                    let studentTotalPossible = 0;

                    studentAttempts.forEach(attempt => {
                        studentTotalScore += attempt.grade;
                        studentTotalPossible += attempt.totalQuestions;
                    });

                    const averageGrade = studentTotalPossible > 0 
                        ? Math.round((studentTotalScore / studentTotalPossible) * 100) 
                        : 0;

                    let progress = 0;
                    if (totalTrackableItems > 0) {
                        progress = parseFloat(((completedItems.length / totalTrackableItems) * 100).toFixed(2));
                    }

                    totalProgressSum += progress;
                    if (progress >= 100) completedCount++;

                    return {
                        id: enrollment.id,
                        email: userData?.email || 'Unknown User',
                        progress: progress,
                        status: enrollment.status,
                        averageGrade: averageGrade,
                        latestGrade: latestGradesMap.get(enrollment.id),
                        lastAccessedAt: enrollment.lastAccessedAt?.toMillis() || 0, 
                    };
                });
                
                setStudentData(detailedStudentData);
                setRawGrades(fetchedRawGrades);
                setEnrollments(fetchedEnrollments as any);
                setSummary({
                    totalStudents: detailedStudentData.length,
                    completedCount: completedCount,
                    averageProgress: detailedStudentData.length > 0 ? parseFloat((totalProgressSum / detailedStudentData.length).toFixed(2)) : 0,
                });

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, courseId]);

    const handleToggleStudentPlot = (uid: string) => {
        setSelectedStudentUids(prev => 
            prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
        );
    };

    if (loading) return (
        <div className="flex h-[50vh] items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mr-2" />
            <span className="text-gray-500 dark:text-gray-400">Analyzing data...</span>
        </div>
    );

    if (error) return (
        <div className="p-8 text-center">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl inline-flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5" /> {error}
            </div>
        </div>
    );

    if (!summary) return null;

    return (
        <div className="max-w-7xl mx-auto pb-20 space-y-8 p-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <Link href={`/educator-panel/${courseId}/manage`} className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-2">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Course Management
                </Link>
                <h1 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Course Analytics</h1>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{course?.title}</h2>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    icon={<Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
                    title="Students" 
                    value={summary.totalStudents} 
                    color="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900"
                />
                <CheckCard 
                    icon={<CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />}
                    title="Completions" 
                    value={summary.completedCount} 
                    color="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900"
                />
                <StatCard 
                    icon={<TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
                    title="Avg. Progress" 
                    value={`${summary.averageProgress}%`} 
                    color="bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-900"
                />
            </div>

            {/* Red Flags Section - REMOVED */}

            {/* Charts Grid (Single Column) */}
            <div className="grid grid-cols-1 gap-8">
                
                {/* Bar Chart */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm h-[400px]">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 className="w-5 h-5 text-gray-400" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Average Grade per Activity</h3>
                    </div>
                    <div className="h-[300px]">
                        <Bar data={chartData.barChartData} options={getChartOptions('Avg Grades')} />
                    </div>
                </div>

                {/* Line Chart */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm h-[480px] flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold mb-4 flex items-center gap-2 dark:text-white">
                            <History className="w-5 h-5 text-indigo-500" /> Performance Trends (Select Students)
                        </h3>
                        
                        {/* --- THE INTERACTIVE CHECKBOX SELECTOR --- */}
                        <div className="flex flex-wrap gap-2 mb-6">
                            {studentData.map(student => (
                                <label key={student.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${selectedStudentUids.includes(student.id) ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-gray-50 border-gray-200 dark:border-gray-700 dark:bg-gray-950 text-gray-500'}`}>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedStudentUids.includes(student.id)}
                                        onChange={() => handleToggleStudentPlot(student.id)}
                                        className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                    <span className="dark:text-gray-300">{student.email.split('@')[0]}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="h-[400px]">
                        <Line data={chartData.lineChartData} options={getChartOptions('Trends')} />
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <PieChart className="w-5 h-5 text-gray-400" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Engagement Share (Submissions)</h3>
                    </div>
                    <div className="h-[500px] w-full max-w-md mx-auto">
                        <Pie data={chartData.pieChartData} options={getPieOptions()} />
                    </div>
                </div>

                {/* Curriculum Audit - REMOVED */}
            </div>

            {/* Student Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Detailed Student Progress</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Student</th>
                                <th className="px-6 py-4 font-semibold">Progress</th>
                                <th className="px-6 py-4 font-semibold">Average Grade</th>
                                <th className="px-6 py-4 font-semibold">Success Probability</th>
                                <th className="px-6 py-4 font-semibold">Academic Standing</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {studentData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 italic">
                                        No students enrolled yet.
                                    </td>
                                </tr>
                            ) : (
                                studentData.map(student => {
                                    const { successProbability, academicStanding, standingReason } = calculateStudentStatus(
                                        student.progress,
                                        student.averageGrade || 0,
                                        student.lastAccessedAt || Date.now()
                                    );

                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                {student.email}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full ${student.progress >= 100 ? 'bg-green-500' : 'bg-indigo-500'}`} 
                                                            style={{ width: `${student.progress}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300 w-10">{student.progress}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                {student.averageGrade !== undefined ? (
                                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                                        {student.averageGrade}%
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 italic text-xs">No Attempts</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-sm text-indigo-600 dark:text-indigo-400">
                                                {student.progress >= 100 ? (
                                                    <span className="text-gray-400 text-xs italic">—</span>
                                                ) : (
                                                    `${successProbability}%`
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span 
                                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider cursor-help ${standingStyles[academicStanding]}`}
                                                    title={standingReason}
                                                >
                                                    {academicStanding}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    student.progress >= 100 
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                }`}>
                                                    {student.progress >= 100 ? 'Completed' : 'Active'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// --- Components & Helpers ---

const StatCard = ({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) => (
    <div className={`p-6 rounded-2xl border shadow-sm ${color} transition-transform hover:scale-[1.02]`}>
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide">{title}</p>
                <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{value}</p>
            </div>
            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                {icon}
            </div>
        </div>
    </div>
);

const CheckCard = ({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) => (
    <div className={`p-6 rounded-2xl border shadow-sm ${color} transition-transform hover:scale-[1.02]`}>
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide">{title}</p>
                <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{value}</p>
            </div>
            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                {icon}
            </div>
        </div>
    </div>
);

function aggregateChartData(
    students: StudentProgress[] = [], 
    grades: RawGrade[] = [], 
    enrollments: any[],
    selectedUids: string[] = []
): Omit<ChartData, 'auditChartData'> { // Updated return type since auditChartData is removed
    const activityTotals = new Map<string, { sum: number, count: number }>();
    const studentGrades = new Map<string, RawGrade[]>(); 

    grades.forEach(grade => {
        const activity = activityTotals.get(grade.activityName) || { sum: 0, count: 0 };
        activity.sum += grade.grade;
        activity.count += 1;
        activityTotals.set(grade.activityName, activity);

        const studentList = studentGrades.get(grade.studentId) || [];
        studentList.push(grade);
        studentGrades.set(grade.studentId, studentList);
    });

    const barLabels = Array.from(activityTotals.keys()).sort();
    const barData = barLabels.map(activity => {
        const data = activityTotals.get(activity)!;
        return data.sum / data.count;
    });

    // 2. Line Chart
    const lineChartDatasets: ChartDataset[] = [];
    const studentsToTrack = selectedUids.length > 0
        ? students.filter(s => selectedUids.includes(s.id))
        : students.slice(0, 3);
 
    const lineDatasets = studentsToTrack.map(s => {
        // Find the student's unique index in the master 'students' list
        const globalIndex = students.findIndex(allS => allS.id === s.id);
        // Map the index to our fixed color array (using modulo % for safety if class size > 10)
        const stableColor = VISUAL_COLORS[globalIndex !== -1 ? (globalIndex % VISUAL_COLORS.length) : 0];

        return {
            label: s.email,
            data: (studentGrades.get(s.id) || []).sort((a,b) => a.attemptedAt - b.attemptedAt).map(g => g.grade),
            borderColor: stableColor, // Locked border color
            backgroundColor: 'transparent',
            tension: 0.3,
            borderWidth: 2,
            pointBackgroundColor: stableColor, // Matching point styling
            pointBorderColor: '#ffffff',
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: stableColor,
        };
    });

    const maxAttempts = lineDatasets.reduce((max, dataset) => Math.max(max, dataset.data.length), 0);
    const lineLabels = maxAttempts > 0 
    ? Array.from({ length: maxAttempts }, (_, i) => `Attempt ${i + 1}`)
    : ['No Attempts Yet'];

    // 3. Pie Chart
    const studentEngagement = new Map<string, number>();
    grades.forEach(grade => {
        studentEngagement.set(grade.studentId, (studentEngagement.get(grade.studentId) || 0) + 1);
    });

    const pieLabels = students.map(s => s.email);
    const pieData = pieLabels.map(email => {
        const student = students.find(s => s.email === email)!;
        return studentEngagement.get(student.id) || 0;
    });

    const pieBackgroundColors = students.map((_, idx) => {
        return VISUAL_COLORS[idx % VISUAL_COLORS.length];
    });

    return {
        barChartData: {
            labels: barLabels,
            datasets: [{
                label: 'Avg Grade (%)',
                data: barData,
                backgroundColor: 'rgba(99, 102, 241, 0.6)', 
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 1,
            }],
        },
        lineChartData: {
            labels: lineLabels,
            datasets: lineDatasets, 
        },
        pieChartData: {
            labels: pieLabels,
            datasets: [{
                label: 'Submissions',
                data: pieData,
                backgroundColor: pieBackgroundColors,
                hoverOffset: 4,
                borderWidth: 0,
            }]
        }
    };
}

const VISUAL_COLORS = [
    '#6366f1', // Indigo (Tailwind 500)
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#f43f5e', // Rose
    '#06b6d4', // Cyan
    '#8b5cf6', // Violet
    '#f97316', // Orange
    '#ec4899', // Pink
    '#3b82f6', // Blue
    '#14b8a6', // Teal
];

const getRandomColor = () => {
    return VISUAL_COLORS[Math.floor(Math.random() * VISUAL_COLORS.length)];
};