"use client";

import React, { useState } from "react";

type SongData = {
  trackName: string;
  playlists: {
    playlistId: string;
    playlistName: string;
  }[];
};

type UserData = {
  userId: string;
  data: Record<string, SongData>;
  playlists: { playlistId: string; playlistName: string }[];
};

export default function HomePage() {
  const [userIdInput, setUserIdInput] = useState("");
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
    null
  );

  const handleAddUser = async () => {
    if (!userIdInput.trim()) return;

    try {
      const res = await fetch(`/api/user?userId=${userIdInput}`);
      if (!res.ok) {
        throw new Error(`Failed to load data for user ID: ${userIdInput}`);
      }

      const newApiData: Record<string, SongData> = await res.json();

      const uniquePlaylists = getUniquePlaylists(newApiData);
      const newUser: UserData = {
        userId: userIdInput,
        data: newApiData,
        playlists: uniquePlaylists,
      };

      setUsers((prev) => [...prev, newUser]);
      setUserIdInput("");
      setSelectedUserIndex(users.length);
      setSelectedPlaylistId(null);
    } catch (error) {
      console.error(error);
      alert(`Error: ${error}`);
    }
  };

  const getUniquePlaylists = (
    data: Record<string, SongData>
  ): { playlistId: string; playlistName: string }[] => {
    const playlistMap: Record<string, string> = {};

    Object.values(data).forEach((song) => {
      song.playlists.forEach((p) => {
        if (!playlistMap[p.playlistId]) {
          playlistMap[p.playlistId] = p.playlistName;
        }
      });
    });

    return Object.entries(playlistMap).map(([id, name]) => ({
      playlistId: id,
      playlistName: name,
    }));
  };

  const getTracksForPlaylist = (
    data: Record<string, SongData>,
    playlistId: string
  ) => {
    return Object.entries(data).filter(([_, song]) =>
      song.playlists.some((p) => p.playlistId === playlistId)
    );
  };

  const isTrackShared = (trackId: string) => {
    let count = 0;
    for (let i = 0; i < users.length; i++) {
      if (users[i].data[trackId]) {
        count++;
        if (count > 1) return true;
      }
    }
    return false;
  };

  const getSharedPlaylistsForTrack = (
    trackId: string,
    excludeIndex: number
  ): { userId: string; playlistNames: string[] }[] => {
    const results: { userId: string; playlistNames: string[] }[] = [];

    users.forEach((user, i) => {
      if (i !== excludeIndex && user.data[trackId]) {
        // This user also has the track
        const track = user.data[trackId];
        const playlistNames = track.playlists.map((p) => p.playlistName);
        results.push({
          userId: user.userId,
          playlistNames,
        });
      }
    });

    return results;
  };

  const handleSharedTrackClick = (
    trackId: string,
    currentUserIndex: number
  ) => {
    const sharedList = getSharedPlaylistsForTrack(trackId, currentUserIndex);
    if (!sharedList.length) return;

    let msg = "This track also appears in:\n";
    sharedList.forEach((item) => {
      msg += `\nUser "${item.userId}" => ${item.playlistNames.join(", ")}`;
    });

    alert(msg);
  };

  return (
    <main className="p-6 flex flex-col items-start space-y-6">
      <h1 className="text-2xl font-bold">Spotify Multi-User Library</h1>

      {/* Add User */}
      <div className="flex items-center space-x-2">
        <input
          type="text"
          className="border p-2 rounded"
          placeholder="Enter Spotify User ID"
          value={userIdInput}
          onChange={(e) => setUserIdInput(e.target.value)}
        />
        <button
          onClick={handleAddUser}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500"
        >
          Load User
        </button>
      </div>

      {users.length > 0 && (
        <div className="flex space-x-2">
          {users.map((user, index) => (
            <button
              key={user.userId}
              className={`px-4 py-2 rounded ${
                selectedUserIndex === index
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-black hover:bg-gray-300"
              }`}
              onClick={() => {
                setSelectedUserIndex(index);
                setSelectedPlaylistId(null);
              }}
            >
              {user.userId}
            </button>
          ))}
        </div>
      )}

      {users.length > 0 && (
        <>
          <h2 className="text-xl font-semibold mt-4">
            Playlists for user: {users[selectedUserIndex].userId}
          </h2>
          <div className="flex flex-wrap gap-3 mt-2 text-black">
            {users[selectedUserIndex].playlists.map((pl) => (
              <button
                key={pl.playlistId}
                onClick={() => setSelectedPlaylistId(pl.playlistId)}
                className={`px-3 py-2 rounded border cursor-pointer ${
                  selectedPlaylistId === pl.playlistId
                    ? "bg-gray-300 border-gray-400"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                {pl.playlistName}
              </button>
            ))}
          </div>
        </>
      )}

      {selectedPlaylistId && (
        <div className="mt-6 w-full max-w-2xl">
          <h3 className="text-lg font-semibold mb-2">
            Songs in:{" "}
            {
              users[selectedUserIndex].playlists.find(
                (p) => p.playlistId === selectedPlaylistId
              )?.playlistName
            }
          </h3>
          <div className="bg-white shadow-md rounded p-4">
            <ul className="space-y-2">
              {getTracksForPlaylist(
                users[selectedUserIndex].data,
                selectedPlaylistId
              ).map(([trackId, songData]) => {
                const shared = isTrackShared(trackId);

                return (
                  <li
                    key={trackId}
                    onClick={
                      shared
                        ? () =>
                            handleSharedTrackClick(trackId, selectedUserIndex)
                        : undefined
                    }
                    className={`p-2 rounded cursor-pointer ${
                      shared
                        ? "font-bold text-blue-600 hover:underline"
                        : "text-gray-800"
                    }`}
                    title={
                      shared
                        ? "Click to see which other playlists (users) this track is on."
                        : ""
                    }
                  >
                    {songData.trackName}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}
