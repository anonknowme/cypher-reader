import { NextRequest, NextResponse } from 'next/server';

export const config = {
    matcher: ['/admin/:path*', '/components/:path*'],
};

export function middleware(req: NextRequest) {
    const basicAuth = req.headers.get('authorization');

    if (basicAuth) {
        const authValue = basicAuth.split(' ')[1];
        const [user, pwd] = atob(authValue).split(':');

        // Create explicit variables for env vars to ensure we don't use defaults
        const validUser = process.env.ADMIN_USER;
        const validPass = process.env.ADMIN_PASS;

        // Strictly require env vars to be present
        if (!validUser || !validPass) {
            console.error("ADMIN_USER or ADMIN_PASS is not set in environment variables.");
            // Fall through to 401
        } else if (user === validUser && pwd === validPass) {
            return NextResponse.next();
        }
    }

    return new NextResponse('Auth Required', {
        status: 401,
        headers: {
            'WWW-Authenticate': 'Basic realm="Secure Area"',
        },
    });
}
