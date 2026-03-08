
import React from 'react';
import { ArrowUpLeft } from 'lucide-react';
import { Course } from '../types';

interface CourseCardProps {
  course: Course;
  onClick: (course: Course) => void;
  index: number;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, onClick }) => {
  const tags = Array.isArray((course as any)?.tags) ? (course as any).tags : [];
  const lessonsCount = Array.isArray((course as any)?.lessons) ? (course as any).lessons.length : 0;

  return (
    <div
      onClick={() => onClick(course)}
      className="card-3d group relative cursor-pointer rounded-[1.5rem] overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, rgba(13,31,60,0.95), rgba(8,18,38,0.98))',
        border: '1px solid rgba(0,212,255,0.15)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      {/* Shine overlay */}
      <div className="card-3d-shine rounded-[1.5rem]" />

      {/* Top neon strip on hover */}
      <div
        className="absolute top-0 inset-x-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, #00d4ff, transparent)' }}
      />

      {/* Image */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {/* Overlay gradient */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(8,18,38,0.9) 0%, rgba(8,18,38,0.2) 60%, transparent 100%)' }}
        />

        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          /* Fallback when no image */
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(0,80,140,0.6), rgba(2,8,24,0.9))' }}
          >
            <svg width="48" height="48" viewBox="0 0 44 44" fill="none" className="opacity-40">
              <rect x="16" y="4" width="12" height="36" rx="5" fill="rgba(0,212,255,0.6)" />
              <rect x="4" y="16" width="36" height="12" rx="5" fill="rgba(0,212,255,0.6)" />
            </svg>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 right-3 z-20">
          <span
            className="px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase rounded-full"
            style={{
              background: 'rgba(0,10,20,0.6)',
              border: '1px solid rgba(0,212,255,0.5)',
              color: '#00d4ff',
              backdropFilter: 'blur(8px)',
            }}
          >
            {course.level || 'متوسط'}
          </span>
        </div>
        <div className="absolute bottom-3 left-3 z-20">
          <span
            className="px-2.5 py-1 text-[10px] font-bold rounded-full text-white/80"
            style={{
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {lessonsCount} محاضرة
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="p-5 relative z-10">
        {/* Tag */}
        {tags[0] && (
          <div className="flex items-center gap-2 mb-3">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#00d4ff', boxShadow: '0 0 6px rgba(0,212,255,0.8)' }}
            />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(0,212,255,0.75)' }}>
              {tags[0]}
            </span>
          </div>
        )}

        {/* Title */}
        <h3 className="text-sm sm:text-base font-black text-white mb-4 leading-snug">
          {course.title}
        </h3>

        {/* Neon divider */}
        <div
          className="h-px w-full mb-4 opacity-20 group-hover:opacity-50 transition-opacity duration-500"
          style={{ background: 'linear-gradient(90deg, #00d4ff, transparent)' }}
        />

        {/* Footer row */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 group-hover:text-cyan-400 transition-colors duration-300 font-bold">
            عرض المحتوى
          </span>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
            style={{
              background: 'rgba(0,212,255,0.08)',
              border: '1px solid rgba(0,212,255,0.22)',
              color: '#00d4ff',
            }}
          >
            <ArrowUpLeft size={14} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
