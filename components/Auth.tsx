
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowLeft, Loader2, User, Fingerprint, X, Eye, EyeOff } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthProps {
  onLoginSuccess: (isAdmin: boolean) => void;
  onBack?: () => void;
}

// --- Hyper-Realistic Eye Component (Mascot) ---
const RealisticEye = ({ isOpen, inputValue, isFocused }: { isOpen: boolean; inputValue: string; isFocused: boolean }) => {
  // Calculate pupil position
  const { pupilX, pupilY } = useMemo(() => {
    // 1. Horizontal Tracking (RTL Awareness)
    const maxChars = 25; 
    const length = Math.min(inputValue.length, maxChars);
    const progress = length / maxChars;
    
    // Range of eye movement (pixels)
    const xRange = 22; 
    
    // Start at right (+xRange), end at left (-xRange)
    let x = 0;
    if (isFocused || inputValue.length > 0) {
        x = xRange - (progress * (xRange * 2));
    }

    // 2. Vertical Tracking (Looking Down)
    let y = 0;
    if (isFocused) {
        y = 30; // Look down at the input field
    } else if (inputValue.length > 0) {
        y = 10; // Slightly down if there is text but not focused
    }

    return { pupilX: x, pupilY: y };
  }, [inputValue, isFocused]);

  return (
    <div className="w-full h-full flex items-center justify-center drop-shadow-2xl">
      <svg width="100%" height="100%" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="overflow-visible">
        <defs>
          <clipPath id="eyeMask">
             <path d="M10,60 Q60,10 110,60 Q60,110 10,60 Z" />
          </clipPath>
          <radialGradient id="scleraGrad" cx="50%" cy="50%" r="50%">
            <stop offset="80%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </radialGradient>
          <radialGradient id="irisGrad" cx="50%" cy="50%" r="50%">
            <stop offset="20%" stopColor="#000000" />
            <stop offset="40%" stopColor="#1d4ed8" />
            <stop offset="70%" stopColor="#3b82f6" />
            <stop offset="90%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
        </defs>

        {/* Sclera */}
        <path 
          d="M10,60 Q60,10 110,60 Q60,110 10,60 Z" 
          fill="url(#scleraGrad)" 
          stroke="#CBD5E1"
          strokeWidth="1"
        />

        {/* Iris Group */}
        <g clipPath="url(#eyeMask)">
          <motion.g
            animate={{ x: pupilX, y: pupilY }}
            transition={{ type: "spring", stiffness: 150, damping: 20, mass: 0.8 }}
          >
            <circle cx="60" cy="60" r="26" fill="url(#irisGrad)" />
            <circle cx="60" cy="60" r="10" fill="#000000" />
            <ellipse cx="70" cy="50" rx="8" ry="5" fill="white" opacity="0.9" transform="rotate(-45 70 50)" />
            <circle cx="54" cy="68" r="3" fill="white" opacity="0.5" />
          </motion.g>
        </g>

        {/* Eyelid */}
        <path d="M10,60 Q60,10 110,60" fill="none" stroke="black" strokeOpacity="0.05" strokeWidth="4" />
      </svg>
    </div>
  );
};

const Auth: React.FC<AuthProps> = ({ onLoginSuccess, onBack }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  
  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // Helper: Sanitize Input (Arabic numerals to English, remove spaces, handle prefixes)
  const sanitizeInput = (str: string) => {
    // 1. Handle explicit email
    if (str.includes('@')) {
        return str.trim().toLowerCase();
    }

    // 2. Normalize numerals (Arabic/Persian to English)
    let clean = str
      .replace(/[\u0660-\u0669]/g, c => (c.charCodeAt(0) - 0x0660).toString()) 
      .replace(/[\u06f0-\u06f9]/g, c => (c.charCodeAt(0) - 0x06f0).toString());

    // 3. Remove non-numeric characters (allow only digits for ID)
    clean = clean.replace(/[^0-9]/g, '');

    // 4. Handle Country Codes (Egypt +20 / 0020)
    // If starts with 201, remove 2 (common mistake from +2010...)
    if (clean.startsWith('201') && clean.length > 10) clean = '0' + clean.substring(2);
    // If starts with 00201, remove 002
    if (clean.startsWith('00201')) clean = '0' + clean.substring(4);
    
    return clean;
  };

  const generatedPassword = useMemo(() => {
    if (isLogin) return '';
    const cleanId = sanitizeInput(studentId);
    if (!cleanId || cleanId.includes('@')) return '';
    return `Ahmed@${cleanId}`;
  }, [isLogin, studentId]);

  const displayPassword = isLogin ? password : generatedPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Clean the input
      const cleanId = sanitizeInput(studentId);
      const cleanPassword = isLogin ? password.trim() : (cleanId && !cleanId.includes('@') ? `Ahmed@${cleanId}` : '');
      
      if (!cleanId || (!isLogin && cleanId.includes('@'))) {
        throw new Error('الرجاء إدخال الرقم التعريفي');
      }

      if (isLogin && !cleanPassword) {
        throw new Error('الرجاء إدخال كلمة المرور');
      }

      if (!isSupabaseConfigured) {
        await new Promise(resolve => setTimeout(resolve, 800));
        // Mock Admin Logic (Accept variations)
        if (['01005209667', '0005209667'].includes(cleanId)) {
           onLoginSuccess(true);
        } else {
           onLoginSuccess(false);
        }
        return;
      }

      if (isLogin) {
        // --- SMART LOGIN LOGIC ---
        // Attempts multiple variations to handle typos and legacy domains
        
        let success = false;
        let lastError = null;

        // 1. Prepare candidates to try (Using Set to avoid duplicates)
        const candidates = new Set<string>();
        candidates.add(cleanId);

        // Fix typo: 0005209667 -> 01005209667 (Common mistake)
        if (cleanId.startsWith('000') && cleanId.length >= 10) {
             candidates.add(cleanId.replace(/^000/, '0100'));
        }

        // Fix inverse typo: 01005209667 -> 0005209667 (if user registered with the wrong form)
        if (cleanId.startsWith('0100') && cleanId.length >= 11) {
            candidates.add(cleanId.replace(/^0100/, '000'));
        }

        // Fix missing zero: 1005209667 -> 01005209667
        if (cleanId.startsWith('1') && cleanId.length === 10) {
            candidates.add('0' + cleanId);
        }

        // 2. Iterate candidates
        for (const candidateId of Array.from(candidates)) {
            if (success) break;

            // If user entered full email, just try that
            if (candidateId.includes('@')) {
                 const { data, error } = await supabase.auth.signInWithPassword({
                    email: candidateId,
                    password: cleanPassword,
                });
                if (!error && data.user) {
                    success = true;
                    await handlePostLogin(data.user.id, candidateId);
                } else {
                    lastError = error;
                }
                continue;
            }

            // Try with domains
            const domains = ['@mohram.com', '@academy.local', '@academy.com'];
            for (const domain of domains) {
                if (success) break;
                
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: `${candidateId}${domain}`,
                    password: cleanPassword,
                });

                if (!error && data.user) {
                    success = true;
                    await handlePostLogin(data.user.id, candidateId);
                } else {
                    lastError = error;
                }
            }
        }

        if (!success) {
            throw lastError || new Error('Invalid login credentials');
        }

      } else {
        // Registration Logic: Enforce @academy.local
        const email = `${cleanId}@academy.local`;
        
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: cleanPassword,
          options: {
            data: {
              full_name: fullName,
              student_id: cleanId,
            }
          }
        });
        if (error) throw error;
        // Treat 000... typo as admin too just in case
        const masterIds = ['01005209667', '0005209667'];
        onLoginSuccess(masterIds.includes(cleanId));
      }
    } catch (err: any) {
      console.error(err);
      let msg = err.message;

      // Translate Errors
      if (msg.includes('Email not confirmed')) msg = 'الرقم التعريفي أو كلمة المرور غير صحيحة';
      else if (msg.includes('Email logins are disabled')) msg = 'تسجيل الدخول بالبريد الإلكتروني متعطّل من إعدادات Supabase. فعّل Email Provider من Authentication ثم جرّب مرة أخرى.';
      else if (msg === 'Invalid login credentials' || msg.includes('Invalid')) msg = 'الرقم التعريفي أو كلمة المرور غير صحيحة';
      else if (msg.includes('Email address') || msg.includes('validation')) msg = 'رقم الهوية غير صالح (تأكد من الأرقام وعدم وجود مسافات)';
      else if (msg.includes('User already registered')) msg = 'هذا الحساب مسجل بالفعل، حاول تسجيل الدخول';
      else if (msg.includes('Password should be')) msg = 'كلمة المرور ضعيفة (يجب أن تكون 6 أحرف على الأقل)';
      else if (msg.includes('rate limit')) msg = 'حاول مرة أخرى بعد قليل';
      
      setError(msg);
    } finally {
      if (isSupabaseConfigured) setLoading(false); 
    }
  };

  const handlePostLogin = async (userId: string, usedId: string) => {
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
    
    // Check for Master Admin IDs (including common typo)
    const masterIds = ['01005209667', '0005209667'];
    const usedKey = usedId.includes('@') ? usedId.split('@')[0] : usedId;
    onLoginSuccess(profile?.role === 'admin' || masterIds.includes(usedKey));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#FAFAFA]">
      {/* Background Elements */}
      <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary/10 blur-[120px] -z-10" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-secondary/10 blur-[120px] -z-10" />

      {/* Close Button */}
      {onBack && (
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 w-10 h-10 bg-white hover:bg-gray-50 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 z-50 text-dark"
        >
          <X size={20} />
        </button>
      )}

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white border border-white/60 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] rounded-[3rem] p-8 md:p-12 relative pt-20"
      >
        {/* --- Mascot Eye (Centered Top) --- */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-32 h-32 z-20">
            <motion.div 
                className="w-full h-full"
                animate={{ 
                    y: isPasswordFocused ? 10 : 0,
                    scale: isPasswordFocused ? 1.05 : 1
                }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
                <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="w-full h-full cursor-pointer focus:outline-none"
                    title="إظهار/إخفاء كلمة المرور"
                >
                    <RealisticEye isOpen={showPassword} inputValue={displayPassword} isFocused={isPasswordFocused} />
                </button>
            </motion.div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-dark tracking-tight mb-2">
            {isLogin ? 'أهلاً بك' : 'حساب جديد'}
          </h1>
          <p className="text-subtle text-sm font-medium">
             منصة نبض التمريض التعليمية
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode='popLayout'>
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="relative group">
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="الاسم الثلاثي"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 pr-12 pl-4 text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold"
                    required={!isLogin}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative group">
            <Fingerprint className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="الـ ID الخاص بك"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 pr-12 pl-4 text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold"
              required
            />
          </div>

          <div className="relative group">
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors focus:outline-none"
            >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            
            <input
              type={showPassword ? "text" : "password"}
              placeholder="كلمة المرور"
              value={displayPassword}
              readOnly={!isLogin}
              onChange={(e) => {
                if (isLogin) setPassword(e.target.value);
              }}
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={() => setIsPasswordFocused(false)}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 pr-6 pl-12 text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold"
              required
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-red-500 text-xs font-bold text-center bg-red-50 py-2 rounded-lg"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-dark text-white rounded-2xl py-4 font-bold text-lg hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-dark/10 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'دخول' : 'تسجيل')}
            {!loading && <ArrowLeft size={20} />}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => {
                setIsLogin(!isLogin);
                setError('');
            }}
            className="text-sm text-gray-500 font-medium hover:text-primary transition-colors underline decoration-dotted underline-offset-4"
          >
            {isLogin ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
