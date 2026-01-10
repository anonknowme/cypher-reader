import Link from 'next/link';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { getCourse } from '@/actions/course-actions';
import { getLessonSummaries } from '@/actions/lesson-actions';
import { CourseLessonList } from './CourseLessonList';

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const course = await getCourse(slug);

    if (!course) {
        return (
            <div className="min-h-screen bg-background-level0 p-page-padding-block flex flex-col items-center justify-center space-y-4">
                <h1 className="text-title1 font-bold">Course Not Found</h1>
                <Link href="/">
                    <Button variant="primary">Return Home</Button>
                </Link>
            </div>
        );
    }

    // Fetch summaries for all lessons in one go (Server-side)
    const lessons = await getLessonSummaries(course.lessons, slug);

    return (
        <div className="min-h-screen bg-background-level0 py-page-padding-block px-page-padding-inline font-regular text-foreground-primary">
            <div className="max-w-3xl mx-auto space-y-8">

                {/* Header */}
                <header className="space-y-4">
                    <Link href="/" className="inline-flex items-center gap-2 text-foreground-tertiary hover:text-foreground-primary transition-colors mb-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        서재로 돌아가기
                    </Link>
                    <div className="space-y-2">
                        <Badge color="orange" variant="soft">코스 (Course)</Badge>
                        <h1 className="text-display font-black leading-tight break-keep">{course.title}</h1>
                        <p className="text-large text-foreground-secondary leading-relaxed max-w-2xl break-keep">
                            {course.description}
                        </p>
                    </div>
                </header>

                {/* Lesson List (Client Component for Progress Tracking) */}
                <main>
                    <CourseLessonList courseId={slug} lessons={lessons} />
                </main>

            </div>
        </div>
    );
}
