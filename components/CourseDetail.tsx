
import React from 'react';
import { ArrowRight, Play, Clock, Lock, FileText, Mic } from 'lucide-react';
import { Course, Lesson } from '../types';

interface CourseDetailProps {
  course: Course;
  onBack: () => void;
  onLessonSelect: (lesson: Lesson) => void;
}

const CourseDetail: React.FC<CourseDetailProps> = ({ course, onBack, onLessonSelect }) => {
  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start gap-4 mb-12">
          <button 
            onClick={onBack}
            className="mt-1 w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-dark hover:text-white transition-all shadow-sm"
          >
            <ArrowRight size={20} />
          </button>
          
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                {course.level}
              </span>
              <span className="text-gray-400 text-sm">{course.lessons.length} محاضرات</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-dark mb-4">{course.title}</h1>
            <p className="text-lg text-subtle max-w-2xl">{course.description}</p>
          </div>
        </div>

        {/* Lectures Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {course.lessons.map((lesson, index) => (
            <div
              key={lesson.id}
              onClick={() => !lesson.isLocked && onLessonSelect(lesson)}
              className={`
                group relative bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300
                ${lesson.isLocked ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1'}
              `}
            >
              {/* Thumbnail Area */}
              <div className="relative h-48 bg-gray-100 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                <img 
                  src={course.thumbnail} 
                  alt={lesson.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                
                {/* Play Button or Lock */}
                <div className="absolute inset-0 z-20 flex items-center justify-center">
                  {lesson.isLocked ? (
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                      <Lock className="text-white" size={24} />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-white text-dark flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play fill="currentColor" size={24} className="ml-1" />
                    </div>
                  )}
                </div>

                {/* Duration Badge */}
                <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 px-2 py-1 rounded-md bg-black/40 text-white text-xs font-bold">
                  <Clock size={12} />
                  <span>{lesson.duration}</span>
                </div>
              </div>

              {/* Content Area */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                   <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                     {index + 1}
                   </span>
                   <span className="text-xs font-bold text-primary">محاضرة فيديو</span>
                </div>
                
                <h3 className="text-xl font-bold text-dark mb-2 leading-tight group-hover:text-primary transition-colors">
                  {lesson.title}
                </h3>
                
                {/* Resources Icons Preview */}
                {!lesson.isLocked && (lesson.pdfUrls || lesson.audioUrls) && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
                     {lesson.pdfUrls && lesson.pdfUrls.length > 0 && (
                       <div className="flex items-center gap-1 text-xs text-gray-400">
                          <FileText size={14} />
                          <span>{lesson.pdfUrls.length} ملفات</span>
                       </div>
                     )}
                     {lesson.audioUrls && lesson.audioUrls.length > 0 && (
                       <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Mic size={14} />
                          <span>صوتيات</span>
                       </div>
                     )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
