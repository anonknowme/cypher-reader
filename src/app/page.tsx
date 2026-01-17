import Link from 'next/link';
import { Card } from '@/components/Card';
import { ContentCard } from '@/components/ContentCard';
import { getAllCoursesV3Mock } from '@/actions/course-actions-v3-mock';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const courses = await getAllCoursesV3Mock();

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
          <div className="relative inline-block mb-4">
            <h1 className="text-[3.5rem] md:text-[5rem] font-bold text-foreground-primary tracking-tight leading-tight">
              Cypher<span className="text-accent-default">Reader</span>
            </h1>
            <span className="absolute -bottom-2 right-0 md:-right-10 text-small md:text-regular text-foreground-tertiary font-medium rotate-[-2deg] opacity-80">
              by 네딸바
            </span>
          </div>
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
              level="Learn Now"
              thumbnailColor={getGradient(course.id)}
              imgUrl={course.img_url}
              href={`/learn/${course.id}`}
            />
          ))}


        </div>

      </div>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto py-12 md:py-20 mt-12 border-t border-border-primary/50 relative z-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">

        {/* Brand */}
        <div className="mb-6">
          <span className="text-2xl font-bold tracking-tight">
            Cypher<span className="text-accent-default">Reader</span>
          </span>
        </div>

        {/* Creator Info */}
        <div className="flex flex-col items-center gap-4 text-foreground-secondary">
          <img
            src="https://yt3.googleusercontent.com/xidCi5f1Dongukq1Kr_SuHkzBbZSfb6SigLFixy7CvW-dh8E0FzNxVtlUvCxYQ-ku8lUimrp2Q=s900-c-k-c0x00ffffff-no-rj"
            alt="Logo"
            className="w-16 h-16 rounded-full shadow-lg border-2 border-background-level1"
          />
        </div>

        {/* Social Links */}
        <div className="flex justify-center gap-6 mt-6">
          <a
            href="https://x.com/nldd21"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground-tertiary hover:text-foreground-primary hover:scale-110 transition-all"
            aria-label="Twitter (X)"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a
            href="https://youtube.com/@네딸바"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground-tertiary hover:text-red-500 hover:scale-110 transition-all"
            aria-label="YouTube"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
            </svg>
          </a>
        </div>

        <p className="mt-8 text-mini text-foreground-tertiary">
          © {new Date().getFullYear()} CypherReader. All rights reserved.
        </p>
      </footer>

    </div>
  );
}
