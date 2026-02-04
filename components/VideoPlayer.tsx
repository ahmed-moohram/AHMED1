
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Play, FileText, Mic, Download, ExternalLink, Headphones } from 'lucide-react';
import { Course, Lesson } from '../types';

interface VideoPlayerProps {
  course: Course;
  lesson: Lesson;
  onBack: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ course, lesson, onBack }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const isYouTubeUrl = (url: string) => {
    try {
      const u = new URL(url);
      return (
        u.hostname.includes('youtube.com') ||
        u.hostname.includes('youtu.be')
      );
    } catch {
      return false;
    }
  };

  const getYouTubeEmbedUrl = (url: string) => {
    try {
      const u = new URL(url);
      let id = '';
      if (u.hostname.includes('youtu.be')) {
        id = u.pathname.replace('/', '');
      } else {
        id = u.searchParams.get('v') || '';
      }
      if (!id) return '';
      return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sm:mb-8">
           <button 
            onClick={onBack}
            className="w-12 h-12 rounded-full bg-white border border-gray-100 flex items-center justify-center hover:bg-dark hover:text-white transition-all shadow-sm hover:shadow-lg"
          >
            <ArrowRight size={22} />
          </button>
          <div>
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
               <h2 className="text-sm font-bold text-gray-400">{course.title}</h2>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-dark">{lesson.title}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* Main Content (Video & Description) - Spans 2 cols on desktop */}
           <div className="lg:col-span-2 space-y-8">
              {/* Video Player Container */}
              <div className="aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl shadow-primary/5 relative group border-4 border-white/50 ring-1 ring-black/5">
                {isPlaying ? (
                  isYouTubeUrl(lesson.videoUrl) ? (
                    <iframe
                      src={getYouTubeEmbedUrl(lesson.videoUrl)}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                      title={lesson.title}
                    />
                  ) : (
                    <video 
                      src={lesson.videoUrl} 
                      className="w-full h-full" 
                      controls 
                      autoPlay
                    />
                  )
                 ) : (
                   <div className="absolute inset-0 flex items-center justify-center bg-gray-900 cursor-pointer overflow-hidden" onClick={() => setIsPlaying(true)}>
                      <motion.img 
                        initial={{ scale: 1 }}
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.7 }}
                        src={course.thumbnail} 
                        className="absolute inset-0 w-full h-full object-cover opacity-60" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      
                      <div className="relative z-10 flex flex-col items-center gap-5 sm:gap-6">
                        <motion.div 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          className="w-20 h-20 sm:w-24 sm:h-24 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/30 shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                        >
                          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center shadow-lg text-dark pl-1">
                             <Play fill="currentColor" size={32} />
                          </div>
                        </motion.div>
                        <span className="text-white font-bold tracking-widest uppercase text-xs sm:text-sm border px-4 py-1 rounded-full border-white/30 backdrop-blur-md">اضغط للمشاهدة</span>
                      </div>
                   </div>
                 )}
              </div>

              {/* Description */}
              <div className="bg-white rounded-[2rem] p-5 sm:p-8 border border-gray-100 shadow-sm">
                 <h2 className="text-xl sm:text-2xl font-black text-dark mb-4 flex items-center gap-2">
                    تفاصيل المحاضرة
                    <span className="h-2 w-2 rounded-full bg-secondary"></span>
                 </h2>
                 <p className="text-gray-600 leading-relaxed text-base sm:text-lg font-medium">
                   {lesson.description || 'لا يوجد وصف متاح لهذه المحاضرة حالياً.'}
                 </p>
              </div>
           </div>

           {/* Sidebar (Resources) - Spans 1 col on desktop */}
           <div className="lg:col-span-1 space-y-6">
              
              {/* PDF Resources Card */}
              <div className="bg-white rounded-[2.5rem] p-5 sm:p-6 border border-gray-100 shadow-card relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                 {/* Decorative Background */}
                 <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-red-50 to-transparent rounded-bl-[100px] -mr-10 -mt-10 opacity-50 group-hover:scale-110 transition-transform duration-500" />
                 
                 <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/20">
                              <FileText size={28} />
                            </div>
                            <div>
                               <h3 className="text-lg sm:text-xl font-black text-dark">المرفقات</h3>
                               <p className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full w-fit mt-1">
                                 {lesson.pdfUrls?.length || 0} ملفات PDF
                               </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {lesson.pdfUrls && lesson.pdfUrls.length > 0 ? (
                        lesson.pdfUrls.map((pdf, idx) => (
                          <a 
                            key={idx}
                            href={pdf.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-transparent hover:bg-white hover:border-red-100 hover:shadow-md transition-all group/item"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="min-w-[32px] h-8 rounded-full bg-white flex items-center justify-center text-red-400 group-hover/item:text-red-600 group-hover/item:bg-red-50 transition-colors">
                                 <FileText size={16} />
                              </div>
                              <span className="font-bold text-gray-700 group-hover/item:text-dark truncate text-sm">{pdf.title}</span>
                            </div>
                            <ExternalLink size={16} className="text-gray-300 group-hover/item:text-red-500 transition-colors" />
                          </a>
                        ))
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <p className="text-gray-400 font-medium text-sm">لا توجد ملفات مرفقة</p>
                        </div>
                      )}
                    </div>
                 </div>
              </div>

              {/* Audio Resources Card */}
               <div className="bg-white rounded-[2.5rem] p-5 sm:p-6 border border-gray-100 shadow-card relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                 {/* Decorative Background */}
                 <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-50 to-transparent rounded-bl-[100px] -mr-10 -mt-10 opacity-50 group-hover:scale-110 transition-transform duration-500" />
                 
                 <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/20">
                              <Headphones size={28} />
                            </div>
                            <div>
                               <h3 className="text-lg sm:text-xl font-black text-dark">الصوتيات</h3>
                               <p className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full w-fit mt-1">
                                 {lesson.audioUrls?.length || 0} تسجيلات
                               </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {lesson.audioUrls && lesson.audioUrls.length > 0 ? (
                        lesson.audioUrls.map((audio, idx) => (
                          <a 
                            key={idx}
                            href={audio.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-transparent hover:bg-white hover:border-purple-100 hover:shadow-md transition-all group/item"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="min-w-[32px] h-8 rounded-full bg-white flex items-center justify-center text-purple-500 group-hover/item:text-purple-700 group-hover/item:bg-purple-50 transition-colors">
                                 <Play fill="currentColor" size={12} />
                              </div>
                              <span className="font-bold text-gray-700 group-hover/item:text-dark truncate text-sm">{audio.title}</span>
                            </div>
                            <span className="text-[10px] font-bold text-white bg-purple-400 px-2 py-1 rounded-full group-hover/item:bg-purple-600 transition-colors">استماع</span>
                          </a>
                        ))
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <p className="text-gray-400 font-medium text-sm">لا توجد تسجيلات</p>
                        </div>
                      )}
                    </div>
                 </div>
              </div>

           </div>

        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
