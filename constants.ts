
import { Course } from './types';

export const COURSES: Course[] = [
  {
    id: 'fund-1',
    title: 'Fundamental of Nursing',
    description: 'المبادئ الأساسية والمهارات السريرية الضرورية لممارسة مهنة التمريض بكفاءة وأمان.',
    instructor: 'أكاديمية التمريض',
    level: 'Beginner',
    thumbnail: 'https://images.unsplash.com/photo-1584634731339-252c581abfc5?q=80&w=800&auto=format&fit=crop', // Medical equipment / Basics
    tags: ['Nursing', 'Basics', 'Clinical'],
    color: '#0ea5e9', // Sky Blue
    lessons: [
      { 
        id: 'fund-l1', 
        title: 'Introduction to Nursing', 
        duration: '15:00', 
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        description: 'تاريخ التمريض ومفاهيمه الأساسية ودور الممرض في الرعاية الصحية.',
        pdfUrls: [{ title: 'ملخص المحاضرة', url: '#' }],
        audioUrls: []
      },
      { 
        id: 'fund-l2', 
        title: 'Vital Signs', 
        duration: '20:30', 
        videoUrl: 'https://www.w3schools.com/html/movie.mp4',
        description: 'كيفية قياس العلامات الحيوية: الضغط، الحرارة، النبض، والتنفس.',
        pdfUrls: [],
        audioUrls: [] 
      }
    ]
  },
  {
    id: 'health-2',
    title: 'Health Assessment',
    description: 'تعلم كيفية إجراء فحص شامل للمريض وتقييم حالته الصحية بدقة.',
    instructor: 'أكاديمية التمريض',
    level: 'Intermediate',
    thumbnail: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=800&auto=format&fit=crop', // Doctor checking / Stethoscope
    tags: ['Assessment', 'Diagnosis', 'Patient Care'],
    color: '#10b981', // Emerald Green
    lessons: [
      { 
        id: 'ha-l1', 
        title: 'Physical Examination', 
        duration: '18:45', 
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        pdfUrls: [{ title: 'Checklist PDF', url: '#' }],
        audioUrls: []
      }
    ]
  },
  {
    id: 'patho-3',
    title: 'Pathology',
    description: 'فهم طبيعة الأمراض، مسبباتها، وتأثيراتها الفسيولوجية على جسم الإنسان.',
    instructor: 'أكاديمية الطب',
    level: 'Advanced',
    thumbnail: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?q=80&w=800&auto=format&fit=crop', // Microscope / Lab
    tags: ['Science', 'Biology', 'Diseases'],
    color: '#ef4444', // Red
    lessons: [
      { 
        id: 'path-l1', 
        title: 'Cell Injury', 
        duration: '22:10', 
        videoUrl: 'https://www.w3schools.com/html/movie.mp4',
        description: 'كيف تتضرر الخلايا وتستجيب للإصابات.',
        pdfUrls: [],
        audioUrls: []
      }
    ]
  },
  {
    id: 'infect-4',
    title: 'Infection Control',
    description: 'البروتوكولات والمعايير العالمية لمنع انتشار العدوى في المنشآت الصحية.',
    instructor: 'وحدة مكافحة العدوى',
    level: 'Intermediate',
    thumbnail: 'https://images.unsplash.com/photo-1584036561566-b93a94680c8e?q=80&w=800&auto=format&fit=crop', // Gloves / Sanitizer
    tags: ['Safety', 'Hygiene', 'Protocols'],
    color: '#8b5cf6', // Violet
    lessons: [
      { 
        id: 'ic-l1', 
        title: 'Hand Hygiene', 
        duration: '10:00', 
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        pdfUrls: [{ title: 'WHO Guidelines', url: '#' }],
        audioUrls: []
      }
    ]
  },
  {
    id: 'eng-5',
    title: 'English',
    description: 'المصطلحات الطبية والمهارات اللغوية اللازمة للتواصل الفعال في المجال الطبي.',
    instructor: 'قسم اللغات',
    level: 'Beginner',
    thumbnail: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=800&auto=format&fit=crop', // Books / Library
    tags: ['Language', 'Terminology', 'Communication'],
    color: '#f59e0b', // Amber
    lessons: [
      { 
        id: 'eng-l1', 
        title: 'Medical Terminology 101', 
        duration: '14:30', 
        videoUrl: 'https://www.w3schools.com/html/movie.mp4',
        description: 'البادئات واللواحق الطبية الأكثر شيوعاً.',
        pdfUrls: [],
        audioUrls: [{ title: 'Pronunciation Guide', url: '#' }]
      }
    ]
  },
  {
    id: 'growth-6',
    title: 'Growth',
    description: 'دراسة مراحل النمو والتطور البشري من الولادة وحتى الشيخوخة.',
    instructor: 'قسم الأطفال',
    level: 'Intermediate',
    thumbnail: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?q=80&w=800&auto=format&fit=crop', // Child / Growth
    tags: ['Development', 'Pediatrics', 'Life Span'],
    color: '#ec4899', // Pink
    lessons: [
      { 
        id: 'gr-l1', 
        title: 'Stages of Development', 
        duration: '25:00', 
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        pdfUrls: [],
        audioUrls: []
      }
    ]
  },
  {
    id: 'qual-7',
    title: 'Quality',
    description: 'مفاهيم الجودة الشاملة في الرعاية الصحية وكيفية تحسين الأداء وسلامة المرضى.',
    instructor: 'إدارة الجودة',
    level: 'Advanced',
    thumbnail: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=800&auto=format&fit=crop', // Charts / Planning
    tags: ['Management', 'Safety', 'Standards'],
    color: '#6366f1', // Indigo
    lessons: [
      { 
        id: 'q-l1', 
        title: 'Quality Indicators', 
        duration: '30:00', 
        videoUrl: 'https://www.w3schools.com/html/movie.mp4',
        pdfUrls: [],
        audioUrls: []
      }
    ]
  },
  {
    id: 'eth-8',
    title: 'Ethics',
    description: 'المبادئ الأخلاقية والقانونية التي تحكم ممارسة المهن الطبية والتعامل مع المرضى.',
    instructor: 'قسم القوانين',
    level: 'Beginner',
    thumbnail: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=800&auto=format&fit=crop', // Justice / Law
    tags: ['Law', 'Rights', 'Professionalism'],
    color: '#64748b', // Slate
    lessons: [
      { 
        id: 'eth-l1', 
        title: 'Patient Rights', 
        duration: '12:00', 
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        pdfUrls: [{ title: 'Code of Ethics', url: '#' }],
        audioUrls: []
      }
    ]
  }
];
