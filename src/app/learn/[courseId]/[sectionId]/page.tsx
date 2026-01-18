import Link from 'next/link';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { getCourseV3Mock, getSectionV3Mock, getLessonsV3Mock } from '@/actions/course-actions';
import { SectionLessonList } from './SectionLessonList';

export default async function LearnSectionPage({
    params
}: {
    params: Promise<{ courseId: string; sectionId: string }>
}) {
    const { courseId, sectionId } = await params;

    const [course, section, lessons] = await Promise.all([
        getCourseV3Mock(courseId),
        getSectionV3Mock(sectionId),
        getLessonsV3Mock(sectionId)
    ]);

    if (!course || !section) {
        return (
            <div className="min-h-screen bg-background-level0 p-page-padding-block flex flex-col items-center justify-center space-y-4">
                <h1 className="text-title1 font-bold">Section Not Found</h1>
                <Link href={`/learn/${courseId}`}>
                    <Button variant="primary">Back to Sections</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background-level0 py-page-padding-block px-page-padding-inline font-regular text-foreground-primary">
            <div className="max-w-3xl mx-auto space-y-8">

                {/* Header */}
                <header className="space-y-4">
                    <Link
                        href={`/learn/${courseId}`}
                        className="inline-flex items-center gap-2 text-foreground-tertiary hover:text-foreground-primary transition-colors mb-2"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Back to Sections
                    </Link>
                    <div className="space-y-2">
                        <Badge color="orange" variant="soft">Section {section.order}</Badge>
                        <h1 className="text-display font-black leading-tight break-keep">{section.title}</h1>
                        <p className="text-large text-foreground-secondary leading-relaxed max-w-2xl break-keep">
                            {course.title}
                        </p>
                    </div>
                </header>

                {/* Lesson List with Progress Tracking */}
                <main>
                    <SectionLessonList
                        courseId={courseId}
                        sectionId={sectionId}
                        lessons={lessons}
                    />
                </main>

            </div>
        </div>
    );
}
