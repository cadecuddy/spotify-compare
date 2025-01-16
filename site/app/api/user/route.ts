import { NextRequest } from "next/server";
import pLimit from "p-limit";

interface Track {
    id: string;
    name: string;
}

interface TrackPage {
    items: Array<{
        track: {
            id: string;
            name: string;
        };
    }>;
    next: string | null;
}

const limit = pLimit(2);

export async function GET(request: NextRequest) {
    const userId = request.nextUrl.searchParams.get("userId");
    const accessToken = request.cookies.get("accessToken");

    if (userId == undefined) {
        return Response.json(`Error fetching user library for ${userId}`);
    }

    try {
        const userPlaylists = await getAllUserPlaylists(userId, accessToken?.value);

        const trackMap: Record<
            string,
            {
                trackName: string;
                playlists: Array<{ playlistId: string; playlistName: string }>;
            }
        > = {};

        const playlistPromises = userPlaylists.map(({ id: playlistId, name: playlistName }) =>
            limit(async () => {
                const tracks = await getTracksFromPlaylist(playlistId, accessToken?.value);
                return { playlistId, playlistName, tracks };
            })
        );

        const allPlaylistsTracks = await Promise.all(playlistPromises);

        allPlaylistsTracks.forEach(({ playlistId, playlistName, tracks }) => {
            tracks.forEach((track) => {
                if (!trackMap[track.id]) {
                    trackMap[track.id] = {
                        trackName: track.name,
                        playlists: [],
                    };
                }
                trackMap[track.id].playlists.push({ playlistId, playlistName });
            });
        });

        return Response.json(trackMap);
    } catch (error) {
        console.error("Error fetching playlists:", error);
        return Response.json(`Error fetching user library for ${userId}`);
    }
}

async function getTracksFromPlaylist(
    playlistId: string,
    accessToken: string | undefined
): Promise<Track[]> {
    const playlistTracksUri = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=next%2Citems%28track%28id%2C+name%29%29&limit=50`;
    const tracks: Track[] = [];

    try {
        let response = await fetch(playlistTracksUri, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        let data: TrackPage = await response.json();

        tracks.push(
            ...data.items
                .filter((item) => item.track)
                .map((item) => ({
                    id: item.track.id,
                    name: item.track.name,
                }))
        );

        // Keep fetching while there is a next
        while (data.next) {
            response = await fetch(data.next, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            data = await response.json();
            tracks.push(
                ...data.items
                    .filter((item) => item.track)
                    .map((item) => ({
                        id: item.track.id,
                        name: item.track.name,
                    }))
            );
        }

        return tracks;
    } catch (error) {
        throw error;
    }
}

async function getAllUserPlaylists(
    userId: string,
    accessToken: string | undefined
): Promise<Array<{ id: string; name: string }>> {
    const userPlaylistUri = `https://api.spotify.com/v1/users/${userId}/playlists?limit=50&offset=0`;
    const allPlaylists: SpotifyApi.PlaylistObjectSimplified[] = [];

    try {
        let response = await fetch(userPlaylistUri, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        let data: SpotifyApi.PagingObject<SpotifyApi.PlaylistObjectSimplified> =
            await response.json();

        allPlaylists.push(...data.items);

        while (data.next) {
            response = await fetch(data.next, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            data = await response.json();
            allPlaylists.push(...data.items);
        }

        const userCreatedPlaylists = allPlaylists.filter(
            (playlist) =>
                playlist.public &&
                playlist.owner.uri !== "spotify:user:spotify" &&
                playlist.tracks.total > 0
        );

        return userCreatedPlaylists.map((p) => ({
            id: p.id,
            name: p.name,
        }));
    } catch (error) {
        throw error;
    }
}
