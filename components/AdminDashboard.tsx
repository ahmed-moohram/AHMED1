import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, Plus, Trash2, Edit3, X, Save, Video, LogOut, Copy, KeyRound } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Course, Lesson, UserProfile } from '../types';
import { COURSES as MOCK_COURSES } from '../constants';

interface AdminDashboardProps {
    onLogout: () => void;
    initialTab?: 'students' | 'courses';
    showAllUsers?: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, initialTab, showAllUsers }) => {
    const STUDENTS_PAGE_SIZE = 10;

    const [activeTab, setActiveTab] = useState<'students' | 'courses'>(initialTab || 'courses');
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [studentsTotal, setStudentsTotal] = useState<number | null>(null);
    const [studentsPage, setStudentsPage] = useState(0);
    const [studentsHasMore, setStudentsHasMore] = useState(true);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const studentsFetchSeq = useRef(0);

    const [courses, setCourses] = useState<Course[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [studentSearchDraft, setStudentSearchDraft] = useState('');
    const [studentSearch, setStudentSearch] = useState('');
    const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
    
    // Modal States
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);
    const [selectedCourseIdForLessons, setSelectedCourseIdForLessons] = useState<string | null>(null);
    
    // Lesson Modal
    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
    const [editingLesson, setEditingLesson] = useState<Partial<Lesson> | null>(null);

    const [uploadingCourseThumbnail, setUploadingCourseThumbnail] = useState(false);
    const [uploadingLessonVideo, setUploadingLessonVideo] = useState(false);

    const uploadToStorage = async ({ bucket, folder, file }: { bucket: string; folder: string; file: File }) => {
        if (!isSupabaseConfigured) throw new Error('Supabase غير مُعد');
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        const safeExt = ext.replace(/[^a-z0-9]/g, '').slice(0, 10);
        const objectPath = `${folder}/${Date.now()}-${Math.random().toString(16).slice(2)}${safeExt ? `.${safeExt}` : ''}`;

        const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, file, {
            upsert: false,
            cacheControl: '3600',
            contentType: file.type || undefined
        });
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
        const publicUrl = data?.publicUrl;
        if (!publicUrl) throw new Error('فشل إنشاء رابط الملف');
        return publicUrl;
    };

    const handleUploadCourseThumbnail = async (file: File) => {
        if (!file) return;
        setUploadingCourseThumbnail(true);
        try {
            const url = await uploadToStorage({ bucket: 'course-thumbnails', folder: 'thumbnails', file });
            setEditingCourse((prev) => ({ ...(prev || {}), thumbnail: url }));
        } catch (e: any) {
            alert(e?.message || 'فشل رفع الصورة');
        } finally {
            setUploadingCourseThumbnail(false);
        }
    };

    const handleUploadLessonVideo = async (file: File) => {
        if (!file) return;
        setUploadingLessonVideo(true);
        try {
            const url = await uploadToStorage({ bucket: 'lesson-videos', folder: 'videos', file });
            setEditingLesson((prev) => ({ ...(prev || {}), videoUrl: url }));
        } catch (e: any) {
            alert(e?.message || 'فشل رفع الفيديو');
        } finally {
            setUploadingLessonVideo(false);
        }
    };

    const fetchStudents = async ({ page, reset, search }: { page: number; reset: boolean; search: string }) => {
        const seq = ++studentsFetchSeq.current;
        setStudentsLoading(true);
        try {
            if (!isSupabaseConfigured) {
                const data: any = [
                    { id: '1', full_name: 'طالب تجريبي 1', student_id: '12345', role: 'student' },
                    { id: '2', full_name: 'طالب تجريبي 2', student_id: '67890', role: 'student' }
                ];
                if (seq !== studentsFetchSeq.current) return;
                setStudents(data);
                setStudentsTotal(data.length);
                setStudentsHasMore(false);
                setStudentsPage(0);
                return;
            }

            const q = (search || '').trim();
            const from = page * STUDENTS_PAGE_SIZE;
            const to = from + STUDENTS_PAGE_SIZE - 1;

            const runQuery = async (selectColumns: string) => {
                let query = supabase
                    .from('profiles')
                    .select(selectColumns, { count: 'estimated' });

                if (!showAllUsers) {
                    query = query.eq('role', 'student');
                }

                if (q) {
                    const safe = q.replace(/,/g, ' ');
                    query = query.or(`full_name.ilike.%${safe}%,student_id.ilike.%${safe}%,role.ilike.%${safe}%`);
                }

                query = query
                    .order('full_name', { ascending: true })
                    .order('id', { ascending: true })
                    .range(from, to);
                return await query;
            };

            let data: any[] | null = null;
            let count: number | null = null;

            const { data: d1, error: e1, count: c1 } = await runQuery('id, full_name, student_id, role, is_banned, ban_reason, device_id');
            if (!e1) {
                data = (d1 as any[]) || [];
                count = (c1 as any) ?? null;
            } else {
                const msg = String((e1 as any)?.message || '');
                if (/does not exist/i.test(msg)) {
                    const { data: d2, error: e2, count: c2 } = await runQuery('id, full_name, student_id, role');
                    if (e2) throw e2;
                    data = (d2 as any[]) || [];
                    count = (c2 as any) ?? null;
                } else {
                    throw e1;
                }
            }

            if (seq !== studentsFetchSeq.current) return;

            setStudents((prev) => (reset ? (data as any) : [...prev, ...(data as any)]));
            setStudentsTotal(count);
            setStudentsPage(page);

            const received = data?.length || 0;
            const hasMore = typeof count === 'number' ? from + received < count : received === STUDENTS_PAGE_SIZE;
            setStudentsHasMore(hasMore);
        } catch (e: any) {
            if (seq !== studentsFetchSeq.current) return;
            console.error(e);
            setStudents((prev) => (reset ? [] : prev));
            setStudentsTotal(null);
            setStudentsHasMore(false);
        } finally {
            if (seq === studentsFetchSeq.current) setStudentsLoading(false);
        }
    };

    const resetStudentsAndFetch = (search: string) => {
        setStudents([]);
        setStudentsTotal(null);
        setStudentsPage(0);
        setStudentsHasMore(true);
        fetchStudents({ page: 0, reset: true, search });
    };

    // Fetch Data
    useEffect(() => {
        fetchCourses();
        if (activeTab === 'students') {
            resetStudentsAndFetch(studentSearch);
        }
    }, [activeTab, showAllUsers]);

    useEffect(() => {
        if (!isSupabaseConfigured) return;
        let cancelled = false;
        (async () => {
            try {
                const { data } = await supabase.auth.getUser();
                if (!cancelled) setCurrentUserId(data?.user?.id || null);
            } catch {
                if (!cancelled) setCurrentUserId(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const fetchCourses = async () => {
        if (!isSupabaseConfigured) {
            setCourses(MOCK_COURSES);
            return;
        }

        const { data, error } = await supabase
            .from('courses')
            .select(`*, lessons (*)`)
            .order('created_at', { ascending: false });
        
        if (data) {
            const mappedCourses = data.map((c: any) => ({
                ...c,
                lessons: (c.lessons || []).map((l: any) => ({
                    ...l,
                    videoUrl: l.video_url,
                    pdfUrls: l.pdf_urls || [],
                    audioUrls: l.audio_urls || [],
                    isLocked: l.is_locked
                }))
            }));
            setCourses(mappedCourses);
        }
    };

    const handleApplyStudentSearch = () => {
        setStudentSearch(studentSearchDraft);
        if (activeTab === 'students') resetStudentsAndFetch(studentSearchDraft);
    };

    const handleClearStudentSearch = () => {
        setStudentSearchDraft('');
        setStudentSearch('');
        if (activeTab === 'students') resetStudentsAndFetch('');
    };

    const handleBanAccount = async (userId: string) => {
        if (!isSupabaseConfigured) return;
        const reason = window.prompt('سبب الحظر (اختياري)') || '';
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_banned: true, ban_reason: reason || null })
                .eq('id', userId);
            if (error) throw error;
            if (activeTab === 'students') resetStudentsAndFetch(studentSearch);
        } catch (e: any) {
            alert(e?.message || 'فشل حظر الحساب');
        }
    };

    const handleUnbanAccount = async (userId: string) => {
        if (!isSupabaseConfigured) return;
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_banned: false, ban_reason: null })
                .eq('id', userId);
            if (error) throw error;
            if (activeTab === 'students') resetStudentsAndFetch(studentSearch);
        } catch (e: any) {
            alert(e?.message || 'فشل إلغاء حظر الحساب');
        }
    };

    const handleBanDevice = async (deviceId?: string | null) => {
        if (!isSupabaseConfigured) return;
        if (!deviceId) {
            alert('لا يوجد device_id لهذا المستخدم بعد');
            return;
        }
        const reason = window.prompt('سبب حظر الجهاز (اختياري)') || '';
        try {
            const { error } = await supabase
                .from('banned_devices')
                .insert([{ device_id: deviceId, reason: reason || null }]);
            if (error) throw error;
            alert('تم حظر الجهاز');
        } catch (e: any) {
            alert(e?.message || 'فشل حظر الجهاز');
        }
    };

    const handleUnbanDevice = async (deviceId?: string | null) => {
        if (!isSupabaseConfigured) return;
        if (!deviceId) {
            alert('لا يوجد device_id');
            return;
        }
        try {
            const { error } = await supabase
                .from('banned_devices')
                .delete()
                .eq('device_id', deviceId);
            if (error) throw error;
            alert('تم إلغاء حظر الجهاز');
        } catch (e: any) {
            alert(e?.message || 'فشل إلغاء حظر الجهاز');
        }
    };

     const handleResetStudentPassword = async (userId: string) => {
         if (!isSupabaseConfigured) return;
         if (!window.confirm('سيتم تعيين كلمة سر جديدة لهذا الطالب. هل تريد المتابعة؟')) return;
         try {
             const { data, error } = await supabase.functions.invoke('admin-set-password', {
                 body: { userId }
             });
             if (error) throw error;
             const newPassword = (data as any)?.password;
             if (!newPassword) throw new Error('لم يتم استلام كلمة السر من السيرفر');
             try {
                 await navigator.clipboard.writeText(newPassword);
                 alert(`تم تعيين كلمة السر ونسخها: ${newPassword}`);
             } catch {
                 alert(`تم تعيين كلمة السر: ${newPassword}`);
             }
         } catch (e: any) {
             alert(e?.message || 'فشل تعيين كلمة السر');
         }
     };

    // Course Handlers
    const handleSaveCourse = async () => {
        if (!editingCourse) return;
        
        if (!isSupabaseConfigured) {
            alert('لا يمكن الحفظ في الوضع التجريبي');
            setIsCourseModalOpen(false);
            return;
        }
        
        const courseData = {
            title: editingCourse.title,
            description: editingCourse.description,
            instructor: editingCourse.instructor,
            level: editingCourse.level,
            thumbnail: editingCourse.thumbnail,
            tags: typeof editingCourse.tags === 'string' ? (editingCourse.tags as string).split(',') : editingCourse.tags,
            color: editingCourse.color || '#6366f1'
        };

        if (editingCourse.id) {
            await supabase.from('courses').update(courseData).eq('id', editingCourse.id);
        } else {
            await supabase.from('courses').insert([courseData]);
        }
        
        setIsCourseModalOpen(false);
        setEditingCourse(null);
        fetchCourses();
    };

    const handleDeleteCourse = async (id: string) => {
        if (!isSupabaseConfigured) {
             alert('لا يمكن الحذف في الوضع التجريبي');
             return;
        }
        if(confirm('هل أنت متأكد من حذف هذا الكورس؟')) {
            await supabase.from('courses').delete().eq('id', id);
            fetchCourses();
        }
    };

    // Lesson Handlers
    const handleSaveLesson = async () => {
        if (!editingLesson || !selectedCourseIdForLessons) return;

        if (!isSupabaseConfigured) {
             alert('لا يمكن الحفظ في الوضع التجريبي');
             setIsLessonModalOpen(false);
             return;
        }

        const lessonData = {
            course_id: selectedCourseIdForLessons,
            title: editingLesson.title,
            description: editingLesson.description,
            duration: editingLesson.duration,
            video_url: editingLesson.videoUrl, // Map back to DB column
            pdf_urls: editingLesson.pdfUrls || [],
            audio_urls: editingLesson.audioUrls || [],
            is_locked: editingLesson.isLocked ?? editingLesson.is_locked ?? false
        };

        if (editingLesson.id) {
            // Update
             await supabase.from('lessons').update({
                title: lessonData.title,
                description: lessonData.description,
                duration: lessonData.duration,
                video_url: lessonData.video_url,
                pdf_urls: lessonData.pdf_urls,
                audio_urls: lessonData.audio_urls,
                is_locked: lessonData.is_locked
             }).eq('id', editingLesson.id);
        } else {
            // Insert
            await supabase.from('lessons').insert([lessonData]);
        }
        
        setIsLessonModalOpen(false);
        setEditingLesson(null);
        fetchCourses(); // Refresh to show new lessons
    };
    
    const handleDeleteLesson = async (id: string) => {
        if (!isSupabaseConfigured) {
             alert('لا يمكن الحذف في الوضع التجريبي');
             return;
        }
         if(confirm('حذف المحاضرة؟')) {
            await supabase.from('lessons').delete().eq('id', id);
            fetchCourses();
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-24 px-3 sm:px-4 pb-10 font-cairo text-right">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-dark">لوحة التحكم</h1>
                        <p className="text-gray-500 text-xs sm:text-sm">إدارة المحتوى والطلاب</p>
                    </div>
                    <button onClick={onLogout} className="w-full sm:w-auto flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition-colors font-bold">
                        <LogOut size={18} />
                        تسجيل خروج
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-3 mb-6">
                    <button 
                        onClick={() => setActiveTab('courses')}
                        className={`flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition-all ${activeTab === 'courses' ? 'bg-dark text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
                    >
                        <BookOpen size={18} className="inline-block ml-2 mb-1" />
                        المواد الدراسية
                    </button>
                    <button 
                        onClick={() => setActiveTab('students')}
                        className={`flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition-all ${activeTab === 'students' ? 'bg-dark text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
                    >
                        <Users size={18} className="inline-block ml-2 mb-1" />
                        الطلاب المسجلين
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'courses' ? (
                    <div className="space-y-6">
                        <button 
                            onClick={() => { setEditingCourse({}); setIsCourseModalOpen(true); }}
                            className="w-full py-3 sm:py-4 border-2 border-dashed border-gray-300 rounded-2xl flex items-center justify-center gap-2 text-gray-400 font-bold text-sm sm:text-base hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                        >
                            <Plus size={20} /> إضافة كورس جديد
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {courses.map(course => (
                                <div key={course.id} className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                                    <div className="relative aspect-video rounded-2xl overflow-hidden mb-4 bg-gray-100">
                                        {course.thumbnail && <img src={course.thumbnail} className="w-full h-full object-cover" />}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button onClick={() => { setEditingCourse(course); setIsCourseModalOpen(true); }} className="p-2 bg-white rounded-full hover:scale-110 transition-transform"><Edit3 size={16} /></button>
                                            <button onClick={() => handleDeleteCourse(course.id)} className="p-2 bg-red-500 text-white rounded-full hover:scale-110 transition-transform"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-lg text-dark mb-2">{course.title}</h3>
                                    <div className="text-xs text-gray-400 mb-4">{course.lessons?.length || 0} محاضرات</div>
                                    
                                    <div className="border-t border-gray-100 pt-4">
                                        <h4 className="font-bold text-sm mb-2 text-primary">المحاضرات:</h4>
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {course.lessons?.map((lesson: any) => (
                                                <div key={lesson.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg group/lesson">
                                                    <span className="truncate max-w-[150px]">{lesson.title}</span>
                                                    <div className="flex gap-1 opacity-0 group-hover/lesson:opacity-100 transition-opacity">
                                                        <button onClick={() => { setSelectedCourseIdForLessons(course.id); setEditingLesson(lesson); setIsLessonModalOpen(true); }} className="text-blue-500"><Edit3 size={14} /></button>
                                                        <button onClick={() => handleDeleteLesson(lesson.id)} className="text-red-500"><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                            <button 
                                                onClick={() => { setSelectedCourseIdForLessons(course.id); setEditingLesson({ title: '', videoUrl: '', pdfUrls: [], audioUrls: [], isLocked: false }); setIsLessonModalOpen(true); }}
                                                className="w-full text-xs py-2 text-gray-400 hover:text-dark hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center gap-1"
                                            >
                                                <Plus size={12} /> إضافة محاضرة
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-gray-100 bg-white">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <div className="text-sm font-black text-dark">الطلاب</div>
                                    <div className="text-xs font-bold text-gray-400">
                                        المعروض: {students.length}{typeof studentsTotal === 'number' ? ` من ${studentsTotal}` : ''}
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                    <input
                                        value={studentSearchDraft}
                                        onChange={(e) => setStudentSearchDraft(e.target.value)}
                                        placeholder="بحث بالاسم أو ID"
                                        className="w-full sm:w-72 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 font-bold text-sm"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleApplyStudentSearch}
                                            className="px-4 py-2.5 rounded-xl bg-dark text-white font-bold text-sm hover:bg-black"
                                        >
                                            بحث
                                        </button>
                                        <button
                                            onClick={handleClearStudentSearch}
                                            className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50"
                                        >
                                            مسح
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="w-full overflow-x-auto">
                        <table className="w-full min-w-[820px]">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="p-3 sm:p-4 text-right font-bold text-gray-500 text-xs sm:text-sm whitespace-nowrap">اسم الطالب</th>
                                    <th className="p-3 sm:p-4 text-right font-bold text-gray-500 text-xs sm:text-sm whitespace-nowrap">الرقم التعريفي (ID)</th>
                                    {showAllUsers && (
                                        <th className="p-3 sm:p-4 text-right font-bold text-gray-500 text-xs sm:text-sm whitespace-nowrap">النوع</th>
                                    )}
                                    {showAllUsers && (
                                        <th className="p-3 sm:p-4 text-right font-bold text-gray-500 text-xs sm:text-sm whitespace-nowrap">كلمة السر</th>
                                    )}
                                    <th className="p-3 sm:p-4 text-right font-bold text-gray-500 text-xs sm:text-sm whitespace-nowrap">الحالة</th>
                                    <th className="p-3 sm:p-4 text-right font-bold text-gray-500 text-xs sm:text-sm whitespace-nowrap">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student) => (
                                    <tr key={student.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                                        <td className="p-3 sm:p-4 font-bold text-dark text-sm whitespace-nowrap">{student.full_name}</td>
                                        <td className="p-3 sm:p-4"><span className="inline-flex font-mono text-primary bg-primary/5 px-3 py-1.5 rounded-lg whitespace-nowrap">{student.student_id}</span></td>
                                        {showAllUsers && (
                                            <td className="p-3 sm:p-4">
                                                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">{(student as any).role}</span>
                                            </td>
                                        )}
                                        {showAllUsers && (
                                            <td className="p-3 sm:p-4">
                                                {(student as any).role === 'student' && student.student_id ? (
                                                    <span className="text-xs font-bold text-gray-400">—</span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                        )}
                                        <td className="p-3 sm:p-4">
                                            {(student as any).is_banned ? (
                                                <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold">محظور</span>
                                            ) : (
                                                <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-xs font-bold">نشط</span>
                                            )}
                                        </td>
                                        <td className="p-3 sm:p-4">
                                            <div className="flex gap-2 flex-wrap">
                                                {showAllUsers && (student as any).role === 'student' && Boolean(student.student_id) && (
                                                    <button
                                                        disabled={student.id === currentUserId}
                                                        onClick={() => handleResetStudentPassword(student.id)}
                                                        className={`px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1 ${student.id === currentUserId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        title="إعادة تعيين كلمة السر"
                                                    >
                                                        <KeyRound size={14} />
                                                        إعادة تعيين كلمة السر
                                                    </button>
                                                )}
                                                <button
                                                    disabled={student.id === currentUserId}
                                                    onClick={() => ((student as any).is_banned ? handleUnbanAccount(student.id) : handleBanAccount(student.id))}
                                                    className={`px-3 py-2 rounded-xl text-xs font-bold ${
                                                        (student as any).is_banned
                                                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            : 'bg-red-500 text-white hover:bg-red-600'
                                                    } ${student.id === currentUserId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {(student as any).is_banned ? 'إلغاء حظر الحساب' : 'حظر الحساب'}
                                                </button>
                                                <button
                                                    disabled={student.id === currentUserId}
                                                    onClick={() => handleBanDevice((student as any).device_id)}
                                                    className={`px-3 py-2 rounded-xl text-xs font-bold bg-dark text-white hover:bg-black ${student.id === currentUserId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    حظر الجهاز
                                                </button>
                                                <button
                                                    disabled={student.id === currentUserId}
                                                    onClick={() => handleUnbanDevice((student as any).device_id)}
                                                    className={`px-3 py-2 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 ${student.id === currentUserId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    إلغاء حظر الجهاز
                                                </button>
                                            </div>
                                            {(student as any).ban_reason && (student as any).is_banned && (
                                                <div className="text-xs text-gray-400 font-bold mt-2">السبب: {(student as any).ban_reason}</div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-white">
                            {studentsHasMore ? (
                                <button
                                    disabled={studentsLoading}
                                    onClick={() => fetchStudents({ page: studentsPage + 1, reset: false, search: studentSearch })}
                                    className={`w-full py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 font-bold hover:bg-gray-100 ${studentsLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                                >
                                    {studentsLoading ? 'جاري التحميل...' : 'عرض المزيد'}
                                </button>
                            ) : (
                                <div className="text-center text-xs font-bold text-gray-400">
                                    {students.length === 0 ? 'لا توجد نتائج' : 'تم عرض كل النتائج'}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- Course Modal --- */}
                {isCourseModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
                        <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] p-5 sm:p-8 w-full sm:max-w-lg shadow-2xl overflow-y-auto max-h-[90vh] mt-auto sm:mt-0">
                            <h2 className="text-xl sm:text-2xl font-bold mb-5 sm:mb-6">{editingCourse?.id ? 'تعديل الكورس' : 'كورس جديد'}</h2>
                            <div className="space-y-4">
                                <input placeholder="عنوان الكورس" value={editingCourse?.title || ''} onChange={e => setEditingCourse({...editingCourse, title: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" />
                                <textarea placeholder="الوصف" value={editingCourse?.description || ''} onChange={e => setEditingCourse({...editingCourse, description: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" rows={3} />
                                <input placeholder="رابط الصورة المصغرة (Thumbnail)" value={editingCourse?.thumbnail || ''} onChange={e => setEditingCourse({...editingCourse, thumbnail: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-left" dir="ltr" />
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <label className="flex-1">
                                        <div className="text-xs font-bold text-gray-500 mb-2">أو ارفع صورة من الملفات</div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            disabled={uploadingCourseThumbnail}
                                            onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) handleUploadCourseThumbnail(f);
                                                e.currentTarget.value = '';
                                            }}
                                            className="w-full text-sm"
                                        />
                                    </label>
                                    {Boolean(editingCourse?.thumbnail) && (
                                        <div className="w-20 h-14 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                                            <img src={String(editingCourse?.thumbnail)} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>
                                {uploadingCourseThumbnail && (
                                    <div className="text-xs font-bold text-gray-500">جاري رفع الصورة...</div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <input placeholder="اسم المدرب" value={editingCourse?.instructor || ''} onChange={e => setEditingCourse({...editingCourse, instructor: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" />
                                    <select value={editingCourse?.level || 'Beginner'} onChange={e => setEditingCourse({...editingCourse, level: e.target.value as any})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200">
                                        <option value="Beginner">مبتدأ</option>
                                        <option value="Intermediate">متوسط</option>
                                        <option value="Advanced">متقدم</option>
                                    </select>
                                </div>
                                <input placeholder="التاجات (مفصولة بفاصلة)" value={editingCourse?.tags?.toString() || ''} onChange={e => setEditingCourse({...editingCourse, tags: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8">
                                <button onClick={handleSaveCourse} className="flex-1 bg-dark text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black"><Save size={18} /> حفظ</button>
                                <button onClick={() => setIsCourseModalOpen(false)} className="w-full sm:w-auto px-6 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50">إلغاء</button>
                            </div>
                        </div>
                    </div>
                )}

                 {/* --- Lesson Modal --- */}
                 {isLessonModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
                        <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] p-5 sm:p-8 w-full sm:max-w-lg shadow-2xl overflow-y-auto max-h-[90vh] mt-auto sm:mt-0">
                            <h2 className="text-xl sm:text-2xl font-bold mb-5 sm:mb-6">{editingLesson?.id ? 'تعديل المحاضرة' : 'محاضرة جديدة'}</h2>
                            <div className="space-y-4">
                                <input placeholder="عنوان المحاضرة" value={editingLesson?.title || ''} onChange={e => setEditingLesson({...editingLesson, title: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" />
                                <input placeholder="المدة (مثال: 10:00)" value={editingLesson?.duration || ''} onChange={e => setEditingLesson({...editingLesson, duration: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" />
                                <div className="relative">
                                     <Video size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                 <input placeholder="رابط الفيديو (YouTube)" value={editingLesson?.videoUrl || ''} onChange={e => setEditingLesson({...editingLesson, videoUrl: e.target.value})} className="w-full p-3 pl-10 bg-gray-50 rounded-xl border border-gray-200 text-left" dir="ltr" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-500 mb-2">أو ارفع فيديو من الملفات</div>
                                    <input
                                        type="file"
                                        accept="video/*"
                                        disabled={uploadingLessonVideo}
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) handleUploadLessonVideo(f);
                                            e.currentTarget.value = '';
                                        }}
                                        className="w-full text-sm"
                                    />
                                    {uploadingLessonVideo && (
                                        <div className="text-xs font-bold text-gray-500 mt-2">جاري رفع الفيديو...</div>
                                    )}
                                </div>
                                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                                    <span className="font-bold text-sm text-gray-600">قفل المحاضرة</span>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(editingLesson?.isLocked ?? editingLesson?.is_locked)}
                                        onChange={(e) => setEditingLesson({ ...editingLesson, isLocked: e.target.checked })}
                                    />
                                </label>
                                <textarea placeholder="وصف المحاضرة" value={editingLesson?.description || ''} onChange={e => setEditingLesson({...editingLesson, description: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" rows={2} />
                                
                                {/* Quick PDF Adder */}
                                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                                    <h4 className="font-bold text-red-500 text-sm mb-2">ملفات PDF (Google Drive URL)</h4>
                                    <div className="space-y-2">
                                        {(editingLesson?.pdfUrls || []).map((pdf, i) => (
                                            <div key={i} className="flex gap-2">
                                                <input value={pdf.title} onChange={e => {
                                                    const newPdfs = [...(editingLesson?.pdfUrls || [])];
                                                    newPdfs[i].title = e.target.value;
                                                    setEditingLesson({...editingLesson, pdfUrls: newPdfs});
                                                }} className="flex-1 text-sm p-2 rounded-lg border border-red-200" placeholder="الاسم" />
                                                <input value={pdf.url} onChange={e => {
                                                    const newPdfs = [...(editingLesson?.pdfUrls || [])];
                                                    newPdfs[i].url = e.target.value;
                                                    setEditingLesson({...editingLesson, pdfUrls: newPdfs});
                                                }} className="flex-1 text-sm p-2 rounded-lg border border-red-200 text-left" dir="ltr" placeholder="URL" />
                                            </div>
                                        ))}
                                        <button onClick={() => setEditingLesson({...editingLesson, pdfUrls: [...(editingLesson?.pdfUrls || []), {title: '', url: ''}]})} className="text-xs font-bold text-red-500 bg-white px-3 py-1 rounded-full border border-red-200">+ إضافة ملف</button>
                                    </div>
                                </div>

                                {/* Quick Audio Adder */}
                                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                                    <h4 className="font-bold text-purple-500 text-sm mb-2">ملفات صوتية (Drive URL)</h4>
                                    <div className="space-y-2">
                                        {(editingLesson?.audioUrls || []).map((audio, i) => (
                                            <div key={i} className="flex gap-2">
                                                <input value={audio.title} onChange={e => {
                                                    const newAudios = [...(editingLesson?.audioUrls || [])];
                                                    newAudios[i].title = e.target.value;
                                                    setEditingLesson({...editingLesson, audioUrls: newAudios});
                                                }} className="flex-1 text-sm p-2 rounded-lg border border-purple-200" placeholder="الاسم" />
                                                <input value={audio.url} onChange={e => {
                                                    const newAudios = [...(editingLesson?.audioUrls || [])];
                                                    newAudios[i].url = e.target.value;
                                                    setEditingLesson({...editingLesson, audioUrls: newAudios});
                                                }} className="flex-1 text-sm p-2 rounded-lg border border-purple-200 text-left" dir="ltr" placeholder="URL" />
                                            </div>
                                        ))}
                                        <button onClick={() => setEditingLesson({...editingLesson, audioUrls: [...(editingLesson?.audioUrls || []), {title: '', url: ''}]})} className="text-xs font-bold text-purple-500 bg-white px-3 py-1 rounded-full border border-purple-200">+ إضافة صوت</button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8">
                                <button onClick={handleSaveLesson} className="flex-1 bg-dark text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black"><Save size={18} /> حفظ</button>
                                <button onClick={() => setIsLessonModalOpen(false)} className="w-full sm:w-auto px-6 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50">إلغاء</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
