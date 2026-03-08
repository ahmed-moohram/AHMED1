import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { motion } from 'framer-motion';
import { User, ShieldAlert, KeyRound, Smartphone, LogOut } from 'lucide-react';

export default function MohramPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [needsLogin, setNeedsLogin] = useState(false);

    useEffect(() => {
        checkAuthAndFetch();
    }, []);

    const checkAuthAndFetch = async () => {
        if (!isSupabaseConfigured) {
            setError('قاعدة البيانات غير متصلة');
            setLoading(false);
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setNeedsLogin(true);
            setLoading(false);
            return;
        }

        fetchData();
    };

    const fetchData = async () => {
        if (!isSupabaseConfigured) {
            setError('قاعدة البيانات غير متصلة');
            setLoading(false);
            return;
        }

        try {
            // First get the profiles
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, student_id, phone, role')
                .order('created_at', { ascending: false });

            if (profilesError) throw profilesError;

            // Then get the passwords
            const { data: credsData, error: credsError } = await supabase
                .from('student_credentials')
                .select('user_id, password');

            if (credsError) throw credsError;

            // Map passwords to user profiles
            const pwMap = new Map(credsData.map((c: any) => [c.user_id, c.password]));

            const combined = profilesData.map((p: any) => ({
                ...p,
                password: pwMap.get(p.id) || '—'
            }));

            setUsers(combined);
        } catch (e: any) {
            setError(e?.message || 'فشل في جلب البيانات');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-[#020818] text-white flex items-center justify-center font-cairo">جاري التحميل...</div>;
    }

    if (needsLogin) {
        return (
            <div className="min-h-screen bg-[#020818] text-white flex items-center justify-center font-cairo flex-col gap-4">
                <ShieldAlert size={48} className="text-yellow-500" />
                <div className="text-xl font-bold">يجب تسجيل الدخول كأدمن أولاً</div>
                <button onClick={() => window.location.href = '/'} className="bg-white text-black px-6 py-2 rounded-xl font-bold mt-4">الذهاب لتسجيل الدخول</button>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#020818] text-white flex items-center justify-center font-cairo flex-col gap-4">
                <ShieldAlert size={48} className="text-red-500" />
                <div className="text-xl font-bold">{error}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020818] font-cairo text-right p-4 sm:p-8" dir="rtl">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-white mb-2">بيانات الدخول الشاملة</h1>
                        <p className="text-gray-400">صفحة خاصة لعرض كلمات السر وأرقام الهواتف</p>
                    </div>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-colors font-bold flex gap-2 items-center"
                    >
                        العودة للمنصة <LogOut size={16} />
                    </button>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-white text-sm">
                            <thead className="bg-white/5 border-b border-white/10">
                                <tr>
                                    <th className="p-4 text-right font-bold text-gray-400 whitespace-nowrap">الاسم</th>
                                    <th className="p-4 text-right font-bold text-gray-400 whitespace-nowrap">
                                        <div className="flex items-center gap-1"><User size={14} /> ID (الرقم التعريفي)</div>
                                    </th>
                                    <th className="p-4 text-right font-bold text-gray-400 whitespace-nowrap">
                                        <div className="flex items-center gap-1"><Smartphone size={14} /> رقم الهاتف (Phone)</div>
                                    </th>
                                    <th className="p-4 text-right font-bold text-gray-400 whitespace-nowrap">
                                        <div className="flex items-center gap-1"><KeyRound size={14} /> كلمة السر</div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-bold">
                                            {user.full_name}
                                            {user.role === 'admin' && <span className="ml-2 text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">أدمن</span>}
                                        </td>
                                        <td className="p-4 font-mono text-cyan-300">{user.student_id || '—'}</td>
                                        <td className="p-4 font-mono text-green-300" dir="ltr">{user.phone || '—'}</td>
                                        <td className="p-4 font-mono text-yellow-300">{user.password}</td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-400">لا يوجد مستخدمين</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
