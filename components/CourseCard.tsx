
import React from 'react';
import { ArrowUpLeft, PlayCircle } from 'lucide-react';
import { Course } from '../types';

interface CourseCardProps {
  course: Course;
  onClick: (course: Course) => void;
  index: number;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, onClick, index }) => {
  const firstTag = Array.isArray((course as any)?.tags) ? (course as any).tags[0] : undefined;
  const lessonsCount = Array.isArray((course as any)?.lessons) ? (course as any).lessons.length : 0;

  return (
    <div
      onClick={() => onClick(course)}
      className="gpu-accelerate group relative bg-surface rounded-[2rem] p-3 cursor-pointer border border-gray-100/50 shadow-card hover:shadow-card-hover transition-all duration-500 hover:-translate-y-1"
    >
      {/* Image Wrapper */}
      <div className="relative aspect-[4/3] rounded-[1.5rem] overflow-hidden mb-5">
        <div className="absolute inset-0 bg-dark/0 group-hover:bg-dark/10 transition-colors duration-500 z-10" />
        <img 
          src={course.thumbnail} 
          alt={course.title} 
          loading="lazy" 
          className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110"
        />
        
        {/* Floating Tag */}
        <div className="absolute top-4 right-4 z-20">
          <span className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-white/90 text-dark rounded-full shadow-sm border border-white/20">
            {course.level}
          </span>
        </div>

        {/* Play Button Overlay (appears on hover) */}
        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-90 group-hover:scale-100">
            <div className="w-14 h-14 rounded-full bg-white/30 border border-white/40 flex items-center justify-center">
                <PlayCircle className="text-white fill-white/20" size={32} />
            </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="px-2 pb-4">
        {/* Meta Info */}
        <div className="flex items-center gap-2 mb-3 opacity-60">
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                {firstTag || ''}
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span className="text-xs text-gray-500">
                {lessonsCount} دروس
            </span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-dark mb-3 leading-tight group-hover:text-primary transition-colors">
          {course.title}
        </h3>
        
        {/* Divider */}
        <div className="h-px w-full bg-gradient-to-r from-gray-100 to-transparent my-4" />

        {/* Footer (Simplified - No Instructor) */}
        <div className="flex items-center justify-between">
           <span className="text-xs font-bold text-gray-400 group-hover:text-primary transition-colors">
             شاهد المحتوى
           </span>
          
          <div className="w-8 h-8 rounded-full bg-white border border-gray-100 text-dark flex items-center justify-center group-hover:bg-dark group-hover:text-white group-hover:border-dark transition-all duration-300 shadow-sm">
             <ArrowUpLeft size={14} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
