
export interface Lesson {
  id: string;
  course_id?: string;
  title: string;
  duration: string;
  videoUrl: string;
  description?: string;
  isLocked?: boolean;
  is_locked?: boolean;
  pdfUrls?: { title: string; url: string }[];
  audioUrls?: { title: string; url: string }[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  thumbnail: string;
  tags: string[];
  lessons: Lesson[]; // In frontend we nest them, backend separates them
  color: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  student_id: string;
  role: 'admin' | 'student';
  is_banned?: boolean;
  ban_reason?: string | null;
  device_id?: string | null;
}

export type ViewState = 'AUTH' | 'HOME' | 'COURSE_DETAIL' | 'PLAYER' | 'ADMIN_DASHBOARD' | 'AHMED_MOHRAM' | 'BANNED';