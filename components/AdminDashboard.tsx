import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, Plus, Trash2, Edit3, X, Save, LogOut, Copy, KeyRound, MessagesSquare, Ticket, RefreshCw, ClipboardList } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Course, Lesson, UserProfile } from '../types';
import { COURSES as MOCK_COURSES } from '../constants';
import AdminMessages from './AdminMessages';

interface AdminDashboardProps {
    onLogout: () => void;
    initialTab?: 'students' | 'courses';
    showAllUsers?: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, initialTab, showAllUsers }) => {
    const STUDENTS_PAGE_SIZE = 10;

    const [activeTab, setActiveTab] = useState<'students' | 'courses' | 'messages' | 'codes'>(initialTab === 'students' ? 'students' : 'courses');
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
    const [studentSortOption, setStudentSortOption] = useState<'newest' | 'oldest' | 'name_asc' | 'id_asc'>('newest');
    const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
    const [passwordByUserId, setPasswordByUserId] = useState<Record<string, string>>({});
    const [settingPasswordUserId, setSettingPasswordUserId] = useState<string | null>(null);

    // Codes tab state
    const [codes, setCodes] = useState<any[]>([]);
    const [codesLoading, setCodesLoading] = useState(false);
    const [generateCount, setGenerateCount] = useState(10);
    const [generating, setGenerating] = useState(false);
    const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
    const [copiedAll, setCopiedAll] = useState(false);

    // Modal States
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);
    const [selectedCourseIdForLessons, setSelectedCourseIdForLessons] = useState<string | null>(null);

    // Lesson Modal
    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
    const [editingLesson, setEditingLesson] = useState<Partial<Lesson> | null>(null);

    const [uploadingCourseThumbnail, setUploadingCourseThumbnail] = useState(false);

    const formatStudentPassword = (sid: string) => {
        const clean = String(sid || '').trim();
        return clean ? `Ahmed@${clean}` : '';
    };

    const copyText = async (text: string, userId?: string) => {
        const val = String(text || '').trim();
        if (!val) return;
        try {
            await navigator.clipboard.writeText(val);
            if (userId) {
                setCopiedUserId(userId);
                window.setTimeout(() => {
                    setCopiedUserId((prev) => (prev === userId ? null : prev));
                }, 1500);
            }
        } catch {
            alert('تعذر النسخ');
        }
    };

    const fetchStudentCredentialsPasswords = async ({ userIds, reset }: { userIds: string[]; reset: boolean }) => {
        if (!isSupabaseConfigured) return;
        if (!showAllUsers) return;
        const ids = (userIds || []).map((x) => String(x || '').trim()).filter(Boolean);
        if (reset) {
            setPasswordByUserId({});
        }
        if (!ids.length) return;
        try {
            const { data, error } = await supabase
                .from('student_credentials')
                .select('user_id, password')
                .in('user_id', ids);
            if (error) return;
            const rows = (data as any[]) || [];
            if (!rows.length) return;
            setPasswordByUserId((prev) => {
                const next = { ...prev };
                for (const row of rows) {
                    const uid = String(row?.user_id || '').trim();
                    const pw = String(row?.password || '').trim();
                    if (uid && pw) next[uid] = pw;
                }
                return next;
            });
        } catch {
            return;
        }
    };

    // --- Activation Codes Helpers ---
    const generateRandomCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        return `${seg()}-${seg()}-${seg()}`;
    };

    const fetchCodes = async () => {
        if (!isSupabaseConfigured) return;
        setCodesLoading(true);
        try {
            const { data, error } = await supabase
                .from('activation_codes')
                .select('id, code, is_used, used_at, created_at')
                .order('created_at', { ascending: false })
                .limit(200);
            if (error) throw error;
            setCodes((data as any[]) || []);
        } catch (e: any) {
            alert(e?.message || 'فشل تحميل الأكواد');
        } finally {
            setCodesLoading(false);
        }
    };

    const handleGenerateCodes = async () => {
        if (!isSupabaseConfigured) { alert('Supabase غير مُعد'); return; }
        const count = Math.min(Math.max(1, generateCount), 200);
        if (!window.confirm(`توليد ${count} كود جديد؟`)) return;
        setGenerating(true);
        try {
            const newCodes = Array.from({ length: count }, () => ({ code: generateRandomCode() }));
            const { error } = await supabase.from('activation_codes').insert(newCodes);
            if (error) throw error;
            await fetchCodes();
        } catch (e: any) {
            alert(e?.message || 'فشل توليد الأكواد');
        } finally {
            setGenerating(false);
        }
    };

    const handleCopyCode = async (code: string, id: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedCodeId(id);
            setTimeout(() => setCopiedCodeId(prev => prev === id ? null : prev), 1500);
        } catch { alert('تعذر النسخ'); }
    };

    const handleCopyAllCodes = async () => {
        const unused = codes.filter(c => !c.is_used).map(c => c.code).join('\n');
        if (!unused) { alert('لا توجد أكواد غير مستخدمة'); return; }
        try {
            await navigator.clipboard.writeText(unused);
            setCopiedAll(true);
            setTimeout(() => setCopiedAll(false), 2000);
        } catch { alert('تعذر النسخ'); }
    };

    const handleDeleteCode = async (id: string, code: string) => {
        if (!isSupabaseConfigured) return;
        if (!window.confirm(`تأكيد حذف الكود ${code}؟`)) return;
        try {
            const { error } = await supabase.from('activation_codes').delete().eq('id', id);
            if (error) throw error;
            await fetchCodes();
        } catch (e: any) {
            alert(e?.message || 'فشل الحذف. تأكد من صلاحياتك في Supabase');
        }
    };
    // --- End Activation Codes Helpers ---

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



    const fetchStudents = async ({ page, reset, search, sortOption = 'newest' }: { page: number; reset: boolean; search: string; sortOption?: string }) => {
        const seq = ++studentsFetchSeq.current;
        setStudentsLoading(true);
        try {
            if (!isSupabaseConfigured) {
                const data: any = [
                    { id: '1', full_name: 'طالب تجريبي 1', student_id: '12345', role: 'student', created_at: new Date().toISOString() },
                    { id: '2', full_name: 'طالب تجريبي 2', student_id: '67890', role: 'student', created_at: new Date().toISOString() }
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

                if (sortOption === 'newest') {
                    query = query.order('created_at', { ascending: false });
                } else if (sortOption === 'oldest') {
                    query = query.order('created_at', { ascending: true });
                } else if (sortOption === 'name_asc') {
                    query = query.order('full_name', { ascending: true });
                } else if (sortOption === 'id_asc') {
                    query = query.order('student_id', { ascending: true });
                } else {
                    query = query.order('created_at', { ascending: false }); // Default
                }

                query = query
                    .order('id', { ascending: true }) // Tie-breaker
                    .range(from, to);
                return await query;
            };

            let data: any[] | null = null;
            let count: number | null = null;

            const { data: d1, error: e1, count: c1 } = await runQuery('id, full_name, student_id, role, is_banned, ban_reason, device_id, created_at');
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

            await fetchStudentCredentialsPasswords({
                userIds: (data || [])
                    .filter((x: any) => String((x as any)?.role || '') === 'student')
                    .map((x: any) => String((x as any)?.id || '')),
                reset
            });

            if (seq !== studentsFetchSeq.current) return;

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

    const resetStudentsAndFetch = (overrideSearch?: string) => {
        setStudents([]);
        setStudentsTotal(null);
        setStudentsPage(0);
        setStudentsHasMore(true);
        if (overrideSearch !== undefined) {
            setStudentSearch(overrideSearch);
            setStudentSearchDraft(overrideSearch);
            fetchStudents({ page: 0, reset: true, search: overrideSearch, sortOption: studentSortOption });
        } else {
            fetchStudents({ page: 0, reset: true, search: studentSearch, sortOption: studentSortOption });
        }
    };

    // Fetch Data
    useEffect(() => {
        fetchCourses();
        if (activeTab === 'students') {
            fetchStudents({ page: 0, reset: true, search: studentSearch, sortOption: studentSortOption });
        }
        if (activeTab === 'codes') {
            fetchCodes();
        }
    }, [activeTab, showAllUsers, studentSortOption]);



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

    const handleDeleteAccount = async (userId: string, name: string) => {
        if (!isSupabaseConfigured) return;
        if (!window.confirm(`حذف حساب "${name}" نهائياً؟\nسيقدر الطالب على التسجيل مرة جديدة بعده.`)) return;
        try {
            // 1. Delete related credentials
            await supabase.from('student_credentials').delete().eq('user_id', userId);
            // 2. Delete profile record
            const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userId);
            if (profileError) throw profileError;
            // 3. Try RPC to also delete from auth.users (requires SQL function)
            await (supabase.rpc as any)('delete_user_by_id', { target_user_id: userId }).maybeSingle();
            // 4. Remove from local list immediately
            setStudents((prev) => prev.filter((s) => s.id !== userId));
            alert('تم حذف الحساب بنجاح ✅');
        } catch (e: any) {
            alert(e?.message || 'فشل حذف الحساب');
        }
    };

    const handleResetStudentPassword = async (userId: string, studentId?: string | null) => {
        if (!isSupabaseConfigured) return;
        if (!window.confirm('سيتم تعيين كلمة سر جديدة لهذا الطالب. هل تريد المتابعة؟')) return;
        const defaultPassword = studentId ? formatStudentPassword(studentId) : '';
        const input = window.prompt('اكتب كلمة السر الجديدة (6 أحرف على الأقل)', defaultPassword) ?? '';
        const passwordCandidate = String(input || '').trim();
        if (!passwordCandidate) return;
        if (passwordCandidate.length < 6) {
            alert('كلمة المرور ضعيفة (يجب أن تكون 6 أحرف على الأقل)');
            return;
        }

        setPasswordByUserId((prev) => ({ ...prev, [userId]: passwordCandidate }));
        await copyText(passwordCandidate, userId);
        setSettingPasswordUserId(userId);
        try {
            const { data, error } = await supabase.functions.invoke('admin-set-password', {
                body: { userId, password: passwordCandidate || undefined }
            });
            if (error) throw error;
            const newPassword = String((data as any)?.password || passwordCandidate || '').trim();
            if (!newPassword) throw new Error('لم يتم استلام كلمة السر من السيرفر');
            setPasswordByUserId((prev) => ({ ...prev, [userId]: newPassword }));
            await copyText(newPassword, userId);
        } catch (e: any) {
            setPasswordByUserId((prev) => {
                const next = { ...prev };
                delete next[userId];
                return next;
            });
            const raw = String(e?.message || e?.error || '').toLowerCase();
            const isNotFound = raw.includes('requested function was not found') || raw.includes('not_found') || raw.includes('not found');
            const isFetchFail = raw.includes('failed to fetch') || raw.includes('network') || raw.includes('err_failed');
            if (isNotFound) {
                alert('ميزة إعادة تعيين كلمة السر غير مفعّلة الآن لأن Edge Function (admin-set-password) غير منشورة على Supabase. قم بعمل Deploy للـFunction ثم جرّب مرة أخرى.');
            } else if (isFetchFail) {
                alert('تعذر الاتصال بخدمة Supabase Functions. تأكد من الإنترنت وأن الرابط يعمل ثم جرّب مرة أخرى.');
            } else {
                alert(e?.message || 'فشل تعيين كلمة السر');
            }
        } finally {
            setSettingPasswordUserId((prev) => (prev === userId ? null : prev));
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
        if (confirm('هل أنت متأكد من حذف هذا الكورس؟')) {
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
            video_url: editingLesson.videoUrl || null,
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
        if (confirm('حذف المحاضرة؟')) {
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

                    <button
                        onClick={() => setActiveTab('messages')}
                        className={`flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition-all ${activeTab === 'messages' ? 'bg-dark text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
                    >
                        <MessagesSquare size={18} className="inline-block ml-2 mb-1" />
                        المسجات
                    </button>
                    <button
                        onClick={() => { setActiveTab('codes'); fetchCodes(); }}
                        className={`flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition-all ${activeTab === 'codes' ? 'bg-amber-500 text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
                    >
                        <Ticket size={18} className="inline-block ml-2 mb-1" />
                        أكواد التفعيل
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'messages' ? (
                    <AdminMessages currentUserId={currentUserId} />
                ) : activeTab === 'codes' ? (
                    // --- Activation Codes Tab ---
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <div className="text-lg font-black text-dark flex items-center gap-2">
                                    <Ticket size={20} className="text-amber-500" />
                                    أكواد التفعيل
                                </div>
                                <div className="text-xs font-bold text-gray-500 mt-1">كل كود يشتغل مرة وحدة وعلى جهاز واحد</div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-bold text-gray-600 whitespace-nowrap">عدد الأكواد:</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={200}
                                        value={generateCount}
                                        onChange={(e) => setGenerateCount(e.target.value === '' ? '' as any : Number(e.target.value))}
                                        className="w-20 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 font-bold text-sm text-center"
                                    />
                                </div>
                                <button
                                    disabled={generating}
                                    onClick={handleGenerateCodes}
                                    className={`px-4 py-2.5 rounded-xl font-bold text-sm text-white flex items-center gap-2 ${
                                        generating ? 'bg-amber-300 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600'
                                    }`}
                                >
                                    {generating ? <RefreshCw size={16} className="animate-spin" /> : <Ticket size={16} />}
                                    {generating ? 'جاري التوليد...' : 'توليد أكواد'}
                                </button>
                                <button
                                    onClick={handleCopyAllCodes}
                                    className="px-4 py-2.5 rounded-xl font-bold text-sm bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <ClipboardList size={16} />
                                    {copiedAll ? '✅ تم النسخ' : 'نسخ الكل'}
                                </button>
                                <button
                                    onClick={fetchCodes}
                                    disabled={codesLoading}
                                    className="px-4 py-2.5 rounded-xl font-bold text-sm bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <RefreshCw size={16} className={codesLoading ? 'animate-spin' : ''} />
                                    تحديث
                                </button>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="px-4 sm:px-6 py-3 bg-amber-50 border-b border-amber-100 flex gap-6">
                            <div className="text-sm font-bold text-gray-700">
                                الإجمالي: <span className="text-dark">{codes.length}</span>
                            </div>
                            <div className="text-sm font-bold text-green-700">
                                غير مستخدمة: <span>{codes.filter(c => !c.is_used).length}</span>
                            </div>
                            <div className="text-sm font-bold text-red-600">
                                مستخدمة: <span>{codes.filter(c => c.is_used).length}</span>
                            </div>
                        </div>

                        <div className="w-full overflow-x-auto">
                            {codesLoading ? (
                                <div className="text-center py-12 text-gray-400 font-bold">جاري التحميل...</div>
                            ) : codes.length === 0 ? (
                                <div className="text-center py-16 text-gray-400">
                                    <Ticket size={40} className="mx-auto mb-3 opacity-30" />
                                    <div className="font-bold">لا توجد أكواد بعد</div>
                                    <div className="text-sm mt-1">اضغط "توليد أكواد" لإنشاء أكواد جديدة</div>
                                </div>
                            ) : (
                                <table className="w-full min-w-[600px]">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="p-3 sm:p-4 text-right font-bold text-gray-500 text-xs sm:text-sm">#</th>
                                            <th className="p-3 sm:p-4 text-right font-bold text-gray-500 text-xs sm:text-sm">الكود</th>
                                            <th className="p-3 sm:p-4 text-right font-bold text-gray-500 text-xs sm:text-sm">الحالة</th>
                                            <th className="p-3 sm:p-4 text-right font-bold text-gray-500 text-xs sm:text-sm">تاريخ الاستخدام</th>
                                            <th className="p-3 sm:p-4 text-right font-bold text-gray-500 text-xs sm:text-sm">نسخ</th>
                                            <th className="p-3 sm:p-4 text-right font-bold text-gray-500 text-xs sm:text-sm">حذف</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {codes.map((c: any, idx: number) => (
                                            <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                                                <td className="p-3 sm:p-4 text-xs text-gray-400 font-bold">{idx + 1}</td>
                                                <td className="p-3 sm:p-4">
                                                    <span
                                                        className={`inline-flex font-mono px-3 py-1.5 rounded-lg text-sm tracking-widest ${
                                                            c.is_used
                                                                ? 'bg-gray-100 text-gray-400 line-through'
                                                                : 'bg-amber-50 text-amber-700 font-black'
                                                        }`}
                                                    >
                                                        {c.code}
                                                    </span>
                                                </td>
                                                <td className="p-3 sm:p-4">
                                                    {c.is_used ? (
                                                        <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold">مستخدم ✓</span>
                                                    ) : (
                                                        <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-xs font-bold">متاح</span>
                                                    )}
                                                </td>
                                                <td className="p-3 sm:p-4 text-xs text-gray-400 font-bold">
                                                    {c.used_at ? new Date(c.used_at).toLocaleDateString('ar-EG') : '—'}
                                                </td>
                                                <td className="p-3 sm:p-4">
                                                    {!c.is_used && (
                                                        <button
                                                            onClick={() => handleCopyCode(c.code, c.id)}
                                                            className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-amber-50 hover:border-amber-300 transition-colors"
                                                            title="نسخ الكود"
                                                        >
                                                            {copiedCodeId === c.id ? (
                                                                <span className="text-xs font-bold text-green-600">✓</span>
                                                            ) : (
                                                                <Copy size={14} />
                                                            )}
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="p-3 sm:p-4">
                                                    <button
                                                        onClick={() => handleDeleteCode(c.id, c.code)}
                                                        className="p-2 rounded-xl border border-red-100 bg-white text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors"
                                                        title="حذف الكود"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                ) : activeTab === 'courses' ? (
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
                                                    <span className="truncate max-w-[150px] text-gray-800">{lesson.title}</span>
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
                ) : activeTab === 'students' ? (
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-dark">إدارة الطلاب</h2>
                                <p className="text-gray-500 text-sm">عرض وإدارة حسابات الطلاب</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                <select
                                    value={studentSortOption}
                                    onChange={(e) => setStudentSortOption(e.target.value as any)}
                                    className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 font-bold text-sm text-gray-900 cursor-pointer"
                                >
                                    <option value="newest">الأحدث أولاً</option>
                                    <option value="oldest">الأقدم أولاً</option>
                                    <option value="name_asc">أبجدي (أ-ي)</option>
                                    <option value="id_asc">الرقم التعريفي (الأصغر)</option>
                                </select>

                                <input
                                    value={studentSearchDraft}
                                    onChange={(e) => setStudentSearchDraft(e.target.value)}
                                    placeholder="بحث بالاسم أو ID"
                                    className="w-full sm:w-72 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 font-bold text-sm text-gray-900 placeholder-gray-400"
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
                                    {students.map((student) => {
                                        const isBanned = Boolean((student as any).is_banned);
                                        return (
                                        <tr key={student.id} className={`border-b border-gray-50 last:border-0 ${isBanned ? 'bg-red-50 hover:bg-red-100/60' : 'hover:bg-gray-50/50'}`}>
                                            <td className="p-3 sm:p-4 text-sm whitespace-nowrap">
                                                <div className="font-bold text-gray-900">{student.full_name}</div>
                                                {isBanned && <div className="text-xs text-red-500 font-bold mt-0.5">🚫 محظور{(student as any).ban_reason ? ` — ${(student as any).ban_reason}` : ''}</div>}
                                            </td>
                                            <td className="p-3 sm:p-4"><span className="inline-flex font-mono text-primary bg-primary/5 px-3 py-1.5 rounded-lg whitespace-nowrap">{student.student_id}</span></td>
                                            {showAllUsers && (
                                                <td className="p-3 sm:p-4">
                                                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">{(student as any).role}</span>
                                                </td>
                                            )}
                                            {showAllUsers && (
                                                <td className="p-3 sm:p-4">
                                                    {(student as any).role === 'student' && student.student_id ? (
                                                        passwordByUserId[student.id] ? (
                                                            <div className="flex items-center gap-2 whitespace-nowrap">
                                                                <span className="inline-flex font-mono text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg whitespace-nowrap text-xs">
                                                                    {passwordByUserId[student.id]}
                                                                </span>
                                                                <button type="button" onClick={() => copyText(passwordByUserId[student.id], student.id)} className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 bg-white hover:bg-gray-50" title="نسخ كلمة السر">
                                                                    <Copy size={14} />
                                                                </button>
                                                                {copiedUserId === student.id && <span className="text-xs font-bold text-green-600">تم النسخ</span>}
                                                            </div>
                                                        ) : <span className="text-xs font-bold text-gray-400">—</span>
                                                    ) : <span className="text-xs text-gray-400">—</span>}
                                                </td>
                                            )}
                                            <td className="p-3 sm:p-4">
                                                {isBanned ? (
                                                    <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold">🚫 محظور</span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-xs font-bold">✅ نشط</span>
                                                )}
                                            </td>
                                            <td className="p-3 sm:p-4">
                                                <div className="flex flex-col gap-1.5 min-w-[140px]">
                                                    {/* Ban / Unban Account */}
                                                    <button
                                                        disabled={student.id === currentUserId}
                                                        onClick={() => (isBanned ? handleUnbanAccount(student.id) : handleBanAccount(student.id))}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold w-full text-center ${isBanned
                                                            ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                                                            : 'bg-red-500 text-white hover:bg-red-600'
                                                        } ${student.id === currentUserId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        {isBanned ? '✅ فك حظر الحساب' : '🚫 حظر الحساب'}
                                                    </button>

                                                    {/* Ban / Unban Device */}
                                                    <button
                                                        disabled={student.id === currentUserId}
                                                        onClick={() => handleBanDevice((student as any).device_id)}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold w-full text-center bg-gray-800 text-white hover:bg-black ${student.id === currentUserId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        📵 حظر الجهاز
                                                    </button>
                                                    <button
                                                        disabled={student.id === currentUserId}
                                                        onClick={() => handleUnbanDevice((student as any).device_id)}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold w-full text-center bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 ${student.id === currentUserId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        📱 فك حظر الجهاز
                                                    </button>

                                                    {/* Reset Password */}
                                                    {showAllUsers && (student as any).role === 'student' && Boolean(student.student_id) && (
                                                        <button
                                                            disabled={student.id === currentUserId || settingPasswordUserId === student.id}
                                                            onClick={() => handleResetStudentPassword(student.id, String(student.student_id || ''))}
                                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold w-full text-center bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-1 ${student.id === currentUserId || settingPasswordUserId === student.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            <KeyRound size={12} />
                                                            {settingPasswordUserId === student.id ? 'جاري...' : 'إعادة تعيين كلمة السر'}
                                                        </button>
                                                    )}

                                                    {/* Delete Account */}
                                                    {student.id !== currentUserId && (
                                                        <button
                                                            onClick={() => handleDeleteAccount(student.id, student.full_name || 'هذا الحساب')}
                                                            className="px-3 py-1.5 rounded-xl text-xs font-bold w-full text-center bg-white border border-red-300 text-red-600 hover:bg-red-50"
                                                        >
                                                            🗑️ حذف الحساب
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        );
                                    })}
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
                ) : null}

                {/* --- Course Modal --- */}
                {isCourseModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
                        <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] p-5 sm:p-8 w-full sm:max-w-lg shadow-2xl overflow-y-auto max-h-[90vh] mt-auto sm:mt-0">
                            <h2 className="text-xl sm:text-2xl font-bold mb-5 sm:mb-6">{editingCourse?.id ? 'تعديل الكورس' : 'كورس جديد'}</h2>
                            <div className="space-y-4">
                                <input placeholder="عنوان الكورس" value={editingCourse?.title || ''} onChange={e => setEditingCourse({ ...editingCourse, title: e.target.value })} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-dark" />
                                <textarea placeholder="الوصف" value={editingCourse?.description || ''} onChange={e => setEditingCourse({ ...editingCourse, description: e.target.value })} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-dark" rows={3} />
                                <input placeholder="رابط الصورة المصغرة (Thumbnail)" value={editingCourse?.thumbnail || ''} onChange={e => setEditingCourse({ ...editingCourse, thumbnail: e.target.value })} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-left text-gray-900" dir="ltr" />
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
                                    <input placeholder="اسم المدرب" value={editingCourse?.instructor || ''} onChange={e => setEditingCourse({ ...editingCourse, instructor: e.target.value })} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-dark" />
                                    <select value={editingCourse?.level || 'Beginner'} onChange={e => setEditingCourse({ ...editingCourse, level: e.target.value as any })} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-dark">
                                        <option value="Beginner">مبتدأ</option>
                                        <option value="Intermediate">متوسط</option>
                                        <option value="Advanced">متقدم</option>
                                    </select>
                                </div>
                                <input placeholder="التاجات (مفصولة بفاصلة)" value={editingCourse?.tags?.toString() || ''} onChange={e => setEditingCourse({ ...editingCourse, tags: e.target.value })} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-dark" />
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
                                <input placeholder="عنوان المحاضرة" value={editingLesson?.title || ''} onChange={e => setEditingLesson({ ...editingLesson, title: e.target.value })} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-dark" />
                                <input placeholder="المدة (مثال: 10:00)" value={editingLesson?.duration || ''} onChange={e => setEditingLesson({ ...editingLesson, duration: e.target.value })} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-dark" />
                                <input placeholder="رابط الفيديو (جوجل درايف)" value={editingLesson?.videoUrl || ''} onChange={e => setEditingLesson({ ...editingLesson, videoUrl: e.target.value })} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-dark" dir="ltr" />
                                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                                    <span className="font-bold text-sm text-gray-600">قفل المحاضرة</span>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(editingLesson?.isLocked ?? editingLesson?.is_locked)}
                                        onChange={(e) => setEditingLesson({ ...editingLesson, isLocked: e.target.checked })}
                                    />
                                </label>
                                <textarea placeholder="وصف المحاضرة" value={editingLesson?.description || ''} onChange={e => setEditingLesson({ ...editingLesson, description: e.target.value })} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-dark" rows={2} />

                                {/* Quick PDF Adder */}
                                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                                    <h4 className="font-bold text-red-500 text-sm mb-2">ملفات PDF (Google Drive URL)</h4>
                                    <div className="space-y-2">
                                        {(editingLesson?.pdfUrls || []).map((pdf, i) => (
                                            <div key={i} className="flex gap-2">
                                                <input value={pdf.title} onChange={e => {
                                                    const newPdfs = [...(editingLesson?.pdfUrls || [])];
                                                    newPdfs[i].title = e.target.value;
                                                    setEditingLesson({ ...editingLesson, pdfUrls: newPdfs });
                                                }} className="flex-1 text-sm p-2 rounded-lg border border-red-200" placeholder="الاسم" />
                                                <input value={pdf.url} onChange={e => {
                                                    const newPdfs = [...(editingLesson?.pdfUrls || [])];
                                                    newPdfs[i].url = e.target.value;
                                                    setEditingLesson({ ...editingLesson, pdfUrls: newPdfs });
                                                }} className="flex-1 text-sm p-2 rounded-lg border border-red-200 text-left" dir="ltr" placeholder="URL" />
                                            </div>
                                        ))}
                                        <button onClick={() => setEditingLesson({ ...editingLesson, pdfUrls: [...(editingLesson?.pdfUrls || []), { title: '', url: '' }] })} className="text-xs font-bold text-red-500 bg-white px-3 py-1 rounded-full border border-red-200">+ إضافة ملف</button>
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
                                                    setEditingLesson({ ...editingLesson, audioUrls: newAudios });
                                                }} className="flex-1 text-sm p-2 rounded-lg border border-purple-200" placeholder="الاسم" />
                                                <input value={audio.url} onChange={e => {
                                                    const newAudios = [...(editingLesson?.audioUrls || [])];
                                                    newAudios[i].url = e.target.value;
                                                    setEditingLesson({ ...editingLesson, audioUrls: newAudios });
                                                }} className="flex-1 text-sm p-2 rounded-lg border border-purple-200 text-left" dir="ltr" placeholder="URL" />
                                            </div>
                                        ))}
                                        <button onClick={() => setEditingLesson({ ...editingLesson, audioUrls: [...(editingLesson?.audioUrls || []), { title: '', url: '' }] })} className="text-xs font-bold text-purple-500 bg-white px-3 py-1 rounded-full border border-purple-200">+ إضافة صوت</button>
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
