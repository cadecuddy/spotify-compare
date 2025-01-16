import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let accessTokenCookie = request.cookies.get("accessToken");

    const response = NextResponse.next();
    // check if access token expired
    if (!accessTokenCookie) {
        const accessToken = await getSpotifyAccessToken();
        response.cookies.set({
            name: 'accessToken',
            value: accessToken,
            maxAge: 3600
        })
        console.log("no access token at time of request, fetched access token: ", accessToken)
    }

    return response;
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: '/api/:path*',
}

export async function getSpotifyAccessToken(): Promise<string> {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error(
            "Spotify client ID or secret is not set. Please add them to your environment variables."
        );
    }

    const tokenUrl = "https://accounts.spotify.com/api/token";
    const authHeader =
        "Basic " + btoa(`${clientId}:${clientSecret}`);

    const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "client_credentials",
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to get Spotify token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
}
