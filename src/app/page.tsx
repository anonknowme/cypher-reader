import Link from 'next/link';
import { Card } from '@/components/Card';
import { ContentCard } from '@/components/ContentCard';
import { getAllCourses } from '@/actions/course-actions';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const courses = await getAllCourses();

  // Helper to generate deterministic gradient based on string
  const getGradient = (str: string) => {
    const gradients = [
      "bg-gradient-to-br from-orange-400 to-red-500",
      "bg-gradient-to-br from-blue-400 to-indigo-500",
      "bg-gradient-to-br from-emerald-400 to-teal-500",
      "bg-gradient-to-br from-purple-400 to-pink-500",
      "bg-gradient-to-br from-yellow-400 to-orange-500",
      "bg-gradient-to-br from-cyan-400 to-blue-500",
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  };

  return (
    <div className="min-h-screen bg-background-level0 flex flex-col p-page-padding-inline relative overflow-x-hidden font-regular text-foreground-primary">

      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-default/5 rounded-full blur-[128px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-semantic-blue/5 rounded-full blur-[128px]" />
      </div>

      <div className="max-w-6xl mx-auto w-full relative z-10 py-12 md:py-20 space-y-12">

        {/* Header */}
        <div className="text-center space-y-6 max-w-2xl mx-auto">
          <h1 className="text-[3.5rem] md:text-[5rem] font-bold text-foreground-primary tracking-tight leading-tight mb-4">
            Cypher<span className="text-accent-default">Reader</span>
          </h1>
          <p className="text-title3 text-foreground-secondary leading-relaxed">
            비트코인을 <span className="text-foreground-primary font-medium border-b border-accent-default/30">영어 원문</span>으로 직접 읽고,<br className="hidden md:block" />
            듣고, 말하며 깊이 있게 이해합니다.
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">

          {/* Dynamic Courses */}
          {courses.map((course) => (
            <ContentCard
              key={course.id}
              title={course.title}
              description={course.description || "No description available."}
              category="Course"
              level={`${course.lessons.length} Lessons`}
              thumbnailColor={getGradient(course.id)}
              imgUrl={course.img_url}
              href={`/courses/${course.id}`}
            />
          ))}


        </div>

      </div>
    </div>
  );
}
