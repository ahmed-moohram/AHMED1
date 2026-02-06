
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ArrowUpLeft, ArrowRight, LogOut, Shield, Download } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import Navbar from './components/Navbar';
import Background from './components/Background';
import CourseCard from './components/CourseCard';
import VideoPlayer from './components/VideoPlayer';
import CourseDetail from './components/CourseDetail';
import Auth from './components/Auth';
import AdminDashboard from './components/AdminDashboard';
import SupportChatWidget from './components/SupportChatWidget';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { Course, Lesson, ViewState } from './types';
import { COURSES as MOCK_COURSES } from './constants';

const apkHref = new URL('./components/Nursing-Pulse.apk', import.meta.url).href;

function App() {
  // Default to HOME so everyone can see the interface
  const [viewState, setViewState] = useState<ViewState>('HOME');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [didAutoRouteAdmin, setDidAutoRouteAdmin] = useState(false);
  const [userName, setUserName] = useState(''); // Store User Name
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);

  const isNativePlatform = Capacitor.isNativePlatform?.() ?? false;

  // Check Session on Mount
  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data } = supabase.auth.onAuthStateChange(() => {
      checkSession();
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  // Auto-route admin users once per app load (helps when session is restored after refresh)
  useEffect(() => {
    if (!isAhmedMohramPath() && !didAutoRouteAdmin && isAuthenticated && isAdmin && viewState === 'HOME') {
      setDidAutoRouteAdmin(true);
      setViewState('ADMIN_DASHBOARD');
    }
  }, [didAutoRouteAdmin, isAuthenticated, isAdmin, viewState]);

  const isAhmedMohramPath = () => {
    try {
      const path = window.location.pathname.replace(/\/+$/, '');
      return path === '/ahmed-mohram';
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!isAhmedMohramPath()) return;
    if (!isAuthenticated) {
      setViewState('AUTH');
      return;
    }
    if (isMasterAdmin) {
      setViewState('AHMED_MOHRAM');
      return;
    }
    setViewState('HOME');
  }, [isAuthenticated, isMasterAdmin]);

  const getOrCreateDeviceId = () => {
    try {
      const key = 'academy_device_id';
      const existing = window.localStorage.getItem(key);
      if (existing) return existing;

      const bytes = new Uint8Array(16);
      window.crypto?.getRandomValues?.(bytes);
      if (bytes.every((b) => b === 0)) {
        for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
      }
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
      const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      window.localStorage.setItem(key, uuid);
      return uuid;
    } catch {
      return 'unknown-device';
    }
  };

  const checkSession = async () => {
    if (!isSupabaseConfigured) {
      console.log("App running in Demo Mode (No Backend)");
      setIsAuthenticated(false);
      fetchCourses();
      return;
    }

    const deviceId = getOrCreateDeviceId();
    // Device ban check (best effort)
    try {
      const { data: banReasonFromRpc, error: rpcError } = await supabase
        .rpc('check_device_ban', { p_device_id: deviceId });

      if (!rpcError && banReasonFromRpc) {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setIsMasterAdmin(false);
        setUserName('');
        setBanReason(String(banReasonFromRpc) || 'تم حظرك');
        setViewState('BANNED');
        return;
      }
    } catch {
      // Ignore if table/policy doesn't exist yet
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session && !error) {
        setIsAuthenticated(true);

        // Best-effort: store device_id on the profile so admin can ban a device later
        try {
          await supabase.rpc('set_device_id', { p_device_id: deviceId });
        } catch {
          // Ignore (RLS may block)
        }

        // Get Role and ID to force admin check
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if ((profile as any)?.is_banned) {
          setIsAuthenticated(false);
          setIsAdmin(false);
          setIsMasterAdmin(false);
          setUserName('');
          setBanReason(String((profile as any)?.ban_reason) || 'تم حظرك');
          setViewState('BANNED');
          return;
        }
        
        // Allow access if Role is admin OR if it is the Master ID (Frontend Override)
        // Note: Added 0005209667 to handle the typo case shown in screenshots
        const masterIds = ['01005209667', '0005209667'];
        const email = session.user.email || '';
        const emailId = email.includes('@') ? email.split('@')[0] : email;
        setIsMasterAdmin(masterIds.includes(emailId));
        setIsAdmin(
          (profile as any)?.role === 'admin' ||
          masterIds.includes((profile as any)?.student_id) ||
          masterIds.includes(emailId)
        );
        setUserName(profile?.full_name || 'طالب مجتهد');

        // If user was previously blocked but got unbanned, return them to HOME
        if (viewState === 'BANNED') {
          setViewState('HOME');
          setBanReason('');
        }
        fetchCourses();
      } else {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setIsMasterAdmin(false);
        setUserName('');
        setBanReason('');
        // Even if not logged in, fetch courses to display them
        fetchCourses();
      }
    } catch (e) {
      console.warn("Supabase session check failed");
      setIsAuthenticated(false);
      setIsMasterAdmin(false);
      setBanReason('');
      fetchCourses();
    }
  };

  const fetchCourses = async () => {
    setLoadingCourses(true);
    
    if (!isSupabaseConfigured) {
        setCourses(MOCK_COURSES);
        setLoadingCourses(false);
        return;
    }

    try {
      const { data, error } = await supabase
          .from('courses')
          .select(`*, lessons (*)`)
          .order('created_at', { ascending: false });
      
      if (!error && data && data.length > 0) {
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
      } else {
          console.log("Using Mock Data");
          setCourses(MOCK_COURSES);
      }
    } catch (e) {
      console.log("Using Mock Data due to error");
      setCourses(MOCK_COURSES);
    }
    setLoadingCourses(false);
  };

  const handleLoginSuccess = (isAdminUser: boolean) => {
    setIsAuthenticated(true);
    setIsAdmin(isAdminUser);
    if (isAhmedMohramPath()) {
      setViewState('AHMED_MOHRAM');
    } else {
      setViewState(isAdminUser ? 'ADMIN_DASHBOARD' : 'HOME');
    }
    // Refresh session to get name
    checkSession();
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
        await supabase.auth.signOut();
    }
    setIsAuthenticated(false);
    setIsAdmin(false);
    setIsMasterAdmin(false);
    setUserName('');
    setBanReason('');
    setViewState('HOME');
    setSelectedCourse(null);
    setSelectedLesson(null);
  };

  // --- Navigation Handlers ---
  
  // Home -> Course Detail (Protected)
  const handleCourseClick = (course: Course) => {
    if (!isAuthenticated) {
      setViewState('AUTH');
      return;
    }
    setSelectedCourse(course);
    setViewState('COURSE_DETAIL');
  };

  const handleBackToHome = () => {
    setViewState('HOME');
    setTimeout(() => {
      setSelectedCourse(null);
      setSelectedLesson(null);
    }, 300);
  };

  const handleLessonSelect = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setViewState('PLAYER');
  };

  const handleBackToCourse = () => {
    setViewState('COURSE_DETAIL');
    setSelectedLesson(null);
  };

  if (viewState === 'AUTH') {
    return (
      <Auth 
        onLoginSuccess={handleLoginSuccess} 
        onBack={() => setViewState('HOME')} 
      />
    );
  }

  if (viewState === 'BANNED') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/10 mx-auto mb-6 flex items-center justify-center">
            <Shield size={28} />
          </div>
          <h1 className="text-2xl font-black mb-3">تم حظرك</h1>
          <p className="text-white/70 font-bold text-sm leading-relaxed">{banReason || 'تم حظرك من استخدام المنصة'}</p>
          <button
            onClick={handleLogout}
            className="mt-8 w-full py-3 rounded-2xl bg-white text-black font-black"
          >
            تسجيل خروج
          </button>
        </div>
      </div>
    );
  }

  if (viewState === 'ADMIN_DASHBOARD') {
      return <AdminDashboard onLogout={handleLogout} />;
  }

  if (viewState === 'AHMED_MOHRAM') {
      return <AdminDashboard onLogout={handleLogout} initialTab="students" showAllUsers />;
  }

  return (
    <div className="min-h-screen text-dark font-cairo">
      <Background />
      
      {/* Global Navbar */}
      <Navbar 
        onHomeClick={handleBackToHome} 
        isAuthenticated={isAuthenticated}
        userName={userName}
        onAuthClick={() => setViewState('AUTH')}
        onLogoutClick={handleLogout}
      />
      
      {/* Admin Button (Floating) */}
      {isAdmin && viewState === 'HOME' && (
          <button 
            onClick={() => setViewState('ADMIN_DASHBOARD')}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 bg-dark text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-full font-bold shadow-xl hover:scale-105 transition-transform flex items-center gap-2 text-xs sm:text-sm"
          >
              <Shield size={18} />
              لوحة التحكم
          </button>
      )}
      
      {/* Home View */}
      <div className={viewState === 'HOME' ? 'block' : 'hidden'}>
        <main className="container mx-auto px-3 sm:px-4 lg:px-8 relative z-10">
          
          {/* Luxury Hero Section */}
          <div className="pt-28 sm:pt-32 pb-16 sm:pb-24 text-center max-w-5xl mx-auto">
             <motion.div
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.8, ease: "easeOut" }}
               className="relative"
             >
               {/* Decorative Glow */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[500px] h-[220px] sm:h-[300px] bg-gradient-to-r from-primary/20 to-secondary/20 blur-[110px] sm:blur-[120px] rounded-full pointer-events-none -z-10" />

               <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white border border-gray-200/60 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] mb-8 backdrop-blur-sm">
                 <span className="flex h-1.5 w-1.5 rounded-full bg-secondary"></span>
                 <span className="text-[10px] sm:text-xs font-bold tracking-wide text-gray-500 uppercase">مستقبل التعليم الرقمي</span>
               </div>
               
               <h1 className="text-4xl sm:text-6xl md:text-8xl font-black mb-6 sm:mb-8 tracking-tighter leading-[0.95] text-dark">
                 أطلق العنان <br />
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">لقدراتك الكامنة.</span>
               </h1>
               
               <p className="text-base sm:text-lg md:text-xl text-subtle max-w-2xl mx-auto mb-8 sm:mb-12 font-medium leading-relaxed">
                 منصة تعليمية بتجربة سينمائية فريدة. نجمع بين جمال التصميم وقوة المحتوى لنقدم لك تجربة تعليمية لا تُنسى.
               </p>

               <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
                 <button onClick={() => window.scrollTo({top: 800, behavior: 'smooth'})} className="h-12 sm:h-14 px-6 sm:px-8 rounded-full bg-dark text-white font-bold text-sm hover:shadow-lg hover:shadow-dark/20 hover:scale-105 transition-all duration-300 flex items-center gap-2 group">
                    تصفح الكورسات
                    <ArrowUpLeft size={18} className="group-hover:-translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </button>
                  {!isAuthenticated && (
                     <button onClick={() => setViewState('AUTH')} className="h-12 sm:h-14 px-6 sm:px-8 rounded-full bg-white text-dark border border-gray-200 font-bold text-sm hover:bg-gray-50 transition-all duration-300">
                        تسجيل الدخول
                     </button>
                  )}
               </div>
             </motion.div>
          </div>

          {/* Section Divider */}
          <div className="flex items-center justify-center mb-20 opacity-20">
             <div className="h-24 w-px bg-gradient-to-b from-transparent via-dark to-transparent"></div>
          </div>

          {/* Featured Courses Grid */}
          <div className="pb-32">
            <div className="flex items-end justify-between mb-10 px-2">
               <div>
                  <h2 className="text-3xl font-black text-dark tracking-tight mb-2">مختارات لك</h2>
                  <p className="text-subtle text-sm">أحدث المواد التعليمية المضافة حديثاً</p>
               </div>
            </div>

            {loadingCourses ? (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {courses.length > 0 ? courses.map((course, index) => (
                    <CourseCard 
                    key={course.id} 
                    course={course} 
                    onClick={handleCourseClick}
                    index={index}
                    />
                )) : (
                    <div className="col-span-full text-center py-20 text-gray-400">
                        لا توجد كورسات متاحة حالياً
                    </div>
                )}
                </div>
            )}
          </div>
        </main>

        <footer className="relative overflow-hidden border-t border-gray-200/60 py-14 bg-gradient-to-b from-white/70 to-white/40 backdrop-blur-md">
           <div className="absolute inset-0 pointer-events-none">
             <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[280px] bg-gradient-to-r from-primary/15 to-secondary/15 blur-[120px] rounded-full" />
           </div>
           <div className="container mx-auto px-4 text-center relative">
             <div className="max-w-4xl mx-auto">
               <h2 className="text-2xl font-black text-dark tracking-tighter">نبض التمريض</h2>
               <div className="mt-2 text-[12px] font-bold text-gray-400">نبض التمريض</div>

               {!isNativePlatform && (
                 <div className="mt-10 grid grid-cols-1 gap-4 sm:gap-6 text-right">
                   <motion.div
                     whileHover={{ y: -3 }}
                     transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                     className="rounded-3xl border border-gray-200/70 bg-white/80 p-4 sm:p-6 shadow-[0_8px_26px_-18px_rgba(0,0,0,0.22)] hover:shadow-[0_18px_50px_-22px_rgba(0,0,0,0.26)] transition-shadow"
                   >
                     <div className="text-[13px] sm:text-sm font-black text-dark">تحميل التطبيق</div>
                     <div className="mt-2 text-[12px] font-black text-dark/80">نبض التمريض</div>
                     <div className="mt-1 text-[11px] font-bold text-gray-400">Android APK</div>
                     <a
                       href={apkHref}
                       download="nursing-pulse.apk"
                       className="group mt-5 w-full inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-dark text-white font-black text-[12px] sm:text-sm hover:bg-black transition-all shadow-lg hover:shadow-xl active:scale-[0.99]"
                     >
                       <Download size={18} className="transition-transform group-hover:-translate-y-0.5" />
                       لو عايز تحمل التطبيق اضغط هنا
                     </a>
                     <div className="mt-3 text-[11px] font-bold text-gray-500 text-center">بعد التحميل فعّل (Install from unknown sources)</div>
                   </motion.div>
                 </div>
               )}

               <div className="mt-10 text-[11px] text-gray-400">جميع الحقوق محفوظة ل احمد محرم© 2026.</div>
             </div>
           </div>
        </footer>
      </div>

      {/* Course Detail View */}
      {viewState === 'COURSE_DETAIL' && selectedCourse && (
        <CourseDetail 
          course={selectedCourse} 
          onBack={handleBackToHome}
          onLessonSelect={handleLessonSelect}
        />
      )}

      {/* Player View */}
      {viewState === 'PLAYER' && selectedCourse && selectedLesson && (
        <VideoPlayer 
          course={selectedCourse} 
          lesson={selectedLesson}
          onBack={handleBackToCourse} 
        />
      )}
      <SupportChatWidget isAuthenticated={isAuthenticated} isAdmin={isAdmin} />
    </div>
  );
}

export default App;
