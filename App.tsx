
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
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

function App() {
  const [viewState, setViewState] = useState<ViewState>('HOME');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [didAutoRouteAdmin, setDidAutoRouteAdmin] = useState(false);
  const [userName, setUserName] = useState('');
  const [userProfile, setUserProfile] = useState<{ phone?: string; student_id?: string } | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);

  const isNativePlatform = Capacitor.isNativePlatform?.() ?? false;

  useEffect(() => { checkSession(); }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data } = supabase.auth.onAuthStateChange(() => { checkSession(); });
    return () => { data.subscription.unsubscribe(); };
  }, []);

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
    } catch { return false; }
  };

  useEffect(() => {
    if (!isAhmedMohramPath()) return;
    if (!isAuthenticated) { setViewState('AUTH'); return; }
    if (isMasterAdmin) { setViewState('AHMED_MOHRAM'); return; }
    setViewState('HOME');
  }, [isAuthenticated, isMasterAdmin]);

  // Handle hardware/browser back button
  useEffect(() => {
    const handleBackButton = (e: PopStateEvent) => {
      e.preventDefault();
      setViewState((currentView) => {
        if (currentView === 'PLAYER') {
          setSelectedLesson(null);
          return 'COURSE_DETAIL';
        }
        if (currentView === 'COURSE_DETAIL') {
          setSelectedCourse(null);
          return 'HOME';
        }
        if (currentView === 'ADMIN_DASHBOARD' || currentView === 'AHMED_MOHRAM') {
          return 'HOME';
        }
        return currentView;
      });
    };

    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
  }, []);

  // Push history state when navigating forward into a view
  useEffect(() => {
    if (viewState !== 'HOME' && viewState !== 'AUTH') {
      window.history.pushState({ view: viewState }, '');
    }
  }, [viewState]);

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
      const uuid = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
      window.localStorage.setItem(key, uuid);
      return uuid;
    } catch { return 'unknown-device'; }
  };

  const checkSession = async () => {
    if (!isSupabaseConfigured) {
      setIsAuthenticated(false);
      fetchCourses();
      return;
    }
    const deviceId = getOrCreateDeviceId();
    try {
      const { data: banReasonFromRpc, error: rpcError } = await supabase.rpc('check_device_ban', { p_device_id: deviceId });
      if (!rpcError && banReasonFromRpc) {
        setIsAuthenticated(false); setIsAdmin(false); setIsMasterAdmin(false); setUserName('');
        setBanReason(String(banReasonFromRpc) || 'تم حظرك');
        setViewState('BANNED'); return;
      }
    } catch {}
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session && !error) {
        setIsAuthenticated(true);
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        const isBanned = Boolean((profile as any)?.is_banned === true);
        if (isBanned) {
          setIsAuthenticated(false); setIsAdmin(false); setIsMasterAdmin(false); setUserName('');
          setBanReason(String((profile as any)?.ban_reason) || 'تم حظرك');
          setViewState('BANNED'); return;
        }
        const masterIds = ['01005209667', '0005209667', '01273460425'];
        const email = session.user.email || '';
        const emailId = email.includes('@') ? email.split('@')[0] : email;
        const isPrivileged =
          (profile as any)?.role === 'admin' ||
          masterIds.includes((profile as any)?.student_id) ||
          masterIds.includes(emailId);
        if (!isPrivileged) {
          const boundDeviceId = String((profile as any)?.device_id || '').trim();
          if (boundDeviceId && boundDeviceId !== deviceId) {
            await supabase.auth.signOut();
            setIsAuthenticated(false); setIsAdmin(false); setIsMasterAdmin(false); setUserName('');
            setBanReason('الحساب مسجل على جهاز آخر. تواصل مع الأدمن لفك الربط.');
            setViewState('BANNED'); return;
          }
          if (!boundDeviceId && deviceId && deviceId !== 'unknown-device') {
            try { await supabase.rpc('set_device_id', { p_device_id: deviceId }); } catch {}
          }
        }
        setIsMasterAdmin(masterIds.includes(emailId));
        setIsAdmin(
          (profile as any)?.role === 'admin' ||
          masterIds.includes((profile as any)?.student_id) ||
          masterIds.includes(emailId)
        );
        setUserName(profile?.full_name || 'طالب مجتهد');
        setUserProfile({ phone: (profile as any)?.phone || '', student_id: (profile as any)?.student_id || '' });
        if (viewState === 'BANNED') { setViewState('HOME'); setBanReason(''); }
        fetchCourses();
      } else {
        setIsAuthenticated(false); setIsAdmin(false); setIsMasterAdmin(false); setUserName(''); setBanReason('');
        fetchCourses();
      }
    } catch {
      setIsAuthenticated(false); setIsMasterAdmin(false); setBanReason('');
      fetchCourses();
    }
  };

  const fetchCourses = async () => {
    setLoadingCourses(true);
    if (!isSupabaseConfigured) { setCourses(MOCK_COURSES); setLoadingCourses(false); return; }
    try {
      const { data, error } = await supabase.from('courses').select(`*, lessons (*)`).order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        const mappedCourses = data.map((c: any) => ({
          ...c,
          lessons: (c.lessons || []).map((l: any) => ({
            ...l,
            videoUrl: l.video_url,
            pdfUrls: l.pdf_urls || [],
            audioUrls: l.audio_urls || [],
            isLocked: l.is_locked,
          })),
        }));
        setCourses(mappedCourses);
      } else { setCourses(MOCK_COURSES); }
    } catch { setCourses(MOCK_COURSES); }
    setLoadingCourses(false);
  };

  const handleLoginSuccess = (isAdminUser: boolean) => {
    setIsAuthenticated(true); setIsAdmin(isAdminUser);
    if (isAhmedMohramPath()) { setViewState('AHMED_MOHRAM'); }
    else { setViewState(isAdminUser ? 'ADMIN_DASHBOARD' : 'HOME'); }
    checkSession();
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setIsAuthenticated(false); setIsAdmin(false); setIsMasterAdmin(false);
    setUserName(''); setBanReason(''); setViewState('HOME');
    setSelectedCourse(null); setSelectedLesson(null);
  };

  const handleCourseClick = (course: Course) => {
    if (!isAuthenticated) { setViewState('AUTH'); return; }
    setSelectedCourse(course); setViewState('COURSE_DETAIL');
  };

  const handleBackToHome = () => {
    setViewState('HOME');
    setTimeout(() => { setSelectedCourse(null); setSelectedLesson(null); }, 300);
  };

  const handleLessonSelect = (lesson: Lesson) => { setSelectedLesson(lesson); setViewState('PLAYER'); };
  const handleBackToCourse = () => { setViewState('COURSE_DETAIL'); setSelectedLesson(null); };

  /* ─── Early-return views ─── */
  if (viewState === 'AUTH') return <Auth onLoginSuccess={handleLoginSuccess} onBack={() => setViewState('HOME')} />;

  if (viewState === 'BANNED') return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/10 mx-auto mb-6 flex items-center justify-center"><Shield size={28} /></div>
        <h1 className="text-2xl font-black mb-3">تم حظرك</h1>
        <p className="text-white/70 font-bold text-sm leading-relaxed">{banReason || 'تم حظرك من استخدام المنصة'}</p>
        <button onClick={handleLogout} className="mt-8 w-full py-3 rounded-2xl bg-white text-black font-black">تسجيل خروج</button>
      </div>
    </div>
  );

  if (viewState === 'ADMIN_DASHBOARD') return <AdminDashboard onLogout={handleLogout} />;
  if (viewState === 'AHMED_MOHRAM') return <AdminDashboard onLogout={handleLogout} initialTab="students" showAllUsers />;

  /* ─── Main app ─── */
  return (
    <div className="min-h-screen text-white font-cairo" style={{ background: '#020818' }}>
      <Background />

      <Navbar
        onHomeClick={handleBackToHome}
        isAuthenticated={isAuthenticated}
        userName={userName}
        onAuthClick={() => setViewState('AUTH')}
        onLogoutClick={handleLogout}
      />

      {/* Admin floating button */}
      {isAdmin && viewState === 'HOME' && (
        <button
          onClick={() => setViewState('ADMIN_DASHBOARD')}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 px-5 py-2.5 rounded-full font-bold shadow-xl hover:scale-105 transition-transform flex items-center gap-2 text-sm text-dark"
          style={{ background: 'linear-gradient(135deg,#00d4ff,#38bdf8)' }}
        >
          <Shield size={15} />
          لوحة التحكم
        </button>
      )}

      {/* ═══════ HOME VIEW ═══════ */}
      <div className={viewState === 'HOME' ? 'block' : 'hidden'}>
        <main className="container mx-auto px-3 sm:px-4 lg:px-8 relative z-10">

          {/* ── HERO ── */}
          <div className="pt-24 sm:pt-28 pb-10 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-4 items-center min-h-[88vh]">

              {/* Text column — first on mobile, right on desktop */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="order-1 text-center lg:text-right flex flex-col items-center lg:items-end gap-5 lg:pr-8"
              >
                {/* Badge */}
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full glass">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="ping-ring absolute inline-flex h-full w-full rounded-full" style={{ background: '#00d4ff' }} />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: '#00d4ff' }} />
                  </span>
                  <span className="text-xs font-bold tracking-widest uppercase text-neon">نبض التمريض</span>
                  <span className="w-px h-3 opacity-30 bg-cyan-400" />
                  <span className="text-xs text-slate-400">تعليم احترافي</span>
                </div>

                {/* Heading */}
                <div className="relative">
                  <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tight text-white">
                    ارتقِ بمهاراتك
                    <br />
                    <span className="gradient-text">في عالم التمريض</span>
                  </h1>
                  <div
                    className="absolute -bottom-2 left-1/2 lg:left-auto lg:right-0 -translate-x-1/2 lg:translate-x-0 w-36 h-1 rounded-full blur-md"
                    style={{ background: 'rgba(0,212,255,0.6)' }}
                  />
                </div>

                {/* Description */}
                <p className="text-sm sm:text-base text-slate-400 max-w-md leading-relaxed">
                  منصة تعليمية احترافية متخصصة في علوم التمريض — محتوى عالي الجودة، مسارات مدروسة، وخبراء متميزون.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={() => window.scrollTo({ top: 900, behavior: 'smooth' })}
                    className="shimmer-btn px-8 py-3.5 rounded-full font-black text-dark text-sm shadow-glow hover:scale-105 transition-transform duration-300 flex items-center gap-2"
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" strokeLinecap="round"/>
                    </svg>
                    تصفح الكورسات
                  </button>
                  {!isAuthenticated && (
                    <button
                      onClick={() => setViewState('AUTH')}
                      className="glass px-8 py-3.5 rounded-full text-white font-bold text-sm hover:border-cyan-400 transition-all duration-300 flex items-center gap-2"
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      سجّل دخولك
                    </button>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-xs sm:max-w-sm">
                  {[
                    { val: '١٠٠+', lbl: 'محاضرة' },
                    { val: '٢٤/٧',  lbl: 'متاح دائماً' },
                    { val: '٥ ★',   lbl: 'تقييم' },
                  ].map((s, i) => (
                    <div key={i} className="stat-card rounded-2xl py-3 px-2 text-center">
                      <div className="text-base sm:text-lg font-black text-neon">{s.val}</div>
                      <div className="text-[10px] text-slate-500 font-bold mt-0.5">{s.lbl}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Sphere column — second on mobile, left on desktop */}
              <motion.div
                initial={{ opacity: 0, scale: 0.55 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
                className="order-2 flex justify-center items-center py-4 lg:py-0"
              >
                <div
                  className="relative flex items-center justify-center"
                  style={{ width: 'min(280px, 72vw)', height: 'min(280px, 72vw)' }}
                >
                  {/* Perspective wrapper — no extra transform */}
                  <div className="sphere-scene" style={{ width: '100%', height: '100%', position: 'relative' }}>

                    {/* STATIC: sphere ball */}
                    <div
                      className="sphere-inner absolute rounded-full"
                      style={{
                        inset: '18%',
                        background: 'radial-gradient(circle at 35% 30%, rgba(0,212,255,0.65) 0%, rgba(0,90,160,0.9) 50%, rgba(2,8,24,1) 100%)',
                        border: '1px solid rgba(0,212,255,0.45)',
                        zIndex: 2,
                      }}
                    />

                    {/* STATIC: gloss */}
                    <div
                      className="absolute"
                      style={{
                        top: '24%', left: '28%',
                        width: '14%', height: '9%',
                        background: 'radial-gradient(ellipse, rgba(255,255,255,0.3) 0%, transparent 70%)',
                        transform: 'rotate(-20deg)',
                        zIndex: 3,
                      }}
                    />

                    {/* STATIC: medical cross */}
                    <div
                      className="absolute"
                      style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 4 }}
                    >
                      <svg width="34" height="34" viewBox="0 0 44 44" fill="none">
                        <rect x="16" y="4" width="12" height="36" rx="5" fill="rgba(0,212,255,0.95)" />
                        <rect x="4" y="16" width="36" height="12" rx="5" fill="rgba(0,212,255,0.95)" />
                        <rect x="16" y="4" width="12" height="36" rx="5" fill="rgba(255,255,255,0.14)" />
                      </svg>
                    </div>

                    {/* ROTATING: rings only */}
                    <div
                      className="sphere-wrapper gpu"
                      style={{ position: 'absolute', inset: 0, zIndex: 1 }}
                    >
                      <div className="ring ring-1" style={{ border: '1.5px solid rgba(0,212,255,0.65)', inset: '-10%' }} />
                      <div className="ring ring-2" style={{ border: '1px solid rgba(0,212,255,0.45)', inset: '0' }} />
                      <div className="ring ring-3" style={{ border: '1px solid rgba(56,189,248,0.3)', inset: '10%' }} />
                    </div>

                    {/* Orbit dots */}
                    <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 5 }}>
                      <div className="orbit-dot-1 absolute rounded-full" style={{ width: 10, height: 10, background: '#00d4ff', boxShadow: '0 0 14px rgba(0,212,255,1)' }} />
                      <div className="orbit-dot-2 absolute rounded-full" style={{ width: 7, height: 7, background: '#38bdf8', boxShadow: '0 0 10px rgba(56,189,248,1)' }} />
                    </div>
                  </div>

                  {/* Pedestal glow */}
                  <div
                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 blur-2xl"
                    style={{ width: '55%', height: '26px', background: 'rgba(0,212,255,0.4)', borderRadius: '50%' }}
                  />
                </div>
              </motion.div>
            </div>
          </div>

          {/* Divider */}
          <div className="flex justify-center mb-12 opacity-20">
            <div className="h-16 w-px" style={{ background: 'linear-gradient(to bottom, transparent, #00d4ff, transparent)' }} />
          </div>

          {/* ── COURSES GRID ── */}
          <div className="pb-28">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="mb-10 px-1"
            >
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1">مختارات لك</h2>
              <p className="text-slate-500 text-sm">أحدث المواد التعليمية</p>
              <div className="w-10 h-1 mt-2 rounded-full" style={{ background: 'linear-gradient(90deg, #00d4ff, transparent)' }} />
            </motion.div>

            {loadingCourses ? (
              <div className="flex justify-center py-20">
                <div
                  className="w-10 h-10 border-[3px] rounded-full animate-spin"
                  style={{ borderColor: 'rgba(0,212,255,0.4)', borderTopColor: 'transparent' }}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {courses.length > 0 ? courses.map((course, index) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: Math.min(index * 0.1, 0.35) }}
                  >
                    <CourseCard course={course} onClick={handleCourseClick} index={index} />
                  </motion.div>
                )) : (
                  <div className="col-span-full text-center py-20 text-slate-600 font-bold">
                    لا توجد كورسات متاحة حالياً
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* ── FOOTER ── */}
        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
          className="relative border-t pt-14 pb-8"
          style={{ borderColor: 'rgba(0,212,255,0.12)', background: 'rgba(2,8,24,0.98)' }}
        >
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-24 blur-[60px] pointer-events-none"
            style={{ background: 'rgba(0,212,255,0.1)' }}
          />
          <div className="container mx-auto px-4 relative">
            <div className="flex flex-col items-center text-center gap-3 mb-8">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)' }}
              >
                <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                  <rect x="12" y="2" width="8" height="28" rx="3" fill="rgba(0,212,255,0.9)" />
                  <rect x="2" y="12" width="28" height="8" rx="3" fill="rgba(0,212,255,0.9)" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-black gradient-text">نبض التمريض</h2>
                <p className="text-2xl mt-1 tracking-wider" style={{ fontFamily: '"Aref Ruqaa", serif', color: '#00d4ff', textShadow: '0 0 15px rgba(0,212,255,0.6)' }}>أحمد محرم</p>
              </div>
            </div>
            <div className="h-px w-full mb-6" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.18), transparent)' }} />
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-start">
              <p className="text-xs" style={{ color: 'rgba(100,116,139,0.65)' }}>جميع الحقوق محفوظة © 2026</p>
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: 'rgba(100,116,139,0.5)' }}>تصميم وتطوير</span>
                <span className="text-xs font-black gradient-text">أحمد محرم</span>
              </div>
            </div>
          </div>
        </motion.footer>
      </div>

      {/* Course Detail */}
      {viewState === 'COURSE_DETAIL' && selectedCourse && (
        <CourseDetail
          course={selectedCourse}
          onBack={handleBackToHome}
          onLessonSelect={handleLessonSelect}
        />
      )}

      {/* Player */}
      {viewState === 'PLAYER' && selectedCourse && selectedLesson && (
        <VideoPlayer
          course={selectedCourse}
          lesson={selectedLesson}
          onBack={handleBackToCourse}
          userProfile={userProfile}
        />
      )}

      <SupportChatWidget isAuthenticated={isAuthenticated} isAdmin={isAdmin} />
    </div>
  );
}

export default App;
