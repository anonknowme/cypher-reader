export default function Loading() {
    return (
        <div className="min-h-screen bg-background-level0 flex flex-col items-center justify-center p-4">
            <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-700">
                <h2 className="text-3xl font-bold bg-gradient-to-br from-orange-400 to-red-500 bg-clip-text text-transparent">
                    Cypher<span className="text-foreground-primary">Reader</span>
                </h2>
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-accent-default/30 border-t-accent-default rounded-full animate-spin" />
                    <p className="text-foreground-secondary animate-pulse">
                        Loading Library...
                    </p>
                </div>
                <p className="text-small text-foreground-tertiary max-w-xs mx-auto">
                    첫 로딩 시 서버 연결로 인해 시간이 조금 더 걸릴 수 있습니다. 잠시만 기다려주세요!
                </p>
            </div>
        </div>
    );
}
