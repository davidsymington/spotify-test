export default async function handler(req, res) {
  // CORS headers so theticketoracle.com can call this API
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const artist = req.query.artist || "Metallica";

    // STEP 1: Get Spotify access token
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString("base64"),
      },
      body: "grant_type=client_credentials",
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      return res.status(tokenRes.status).json({
        success: false,
        error: "Failed to get Spotify access token",
        details: tokenData,
      });
    }

    const spotifyFetch = async (url) => {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          `Spotify API error: ${response.status} ${JSON.stringify(data)}`
        );
      }

      return data;
    };

    // STEP 2: Search artist
    const searchData = await spotifyFetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        artist
      )}&type=artist&limit=1`
    );

    const artistMatch = searchData.artists?.items?.[0];

    if (!artistMatch) {
      return res.status(404).json({
        success: false,
        error: "Artist not found",
        searchedArtist: artist,
      });
    }

    const artistId = artistMatch.id;

    // STEP 3: Get artist profile
    const artistProfile = await spotifyFetch(
      `https://api.spotify.com/v1/artists/${artistId}`
    );

    // STEP 4: Get albums/releases
    const artistAlbums = await spotifyFetch(
      `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single,appears_on,compilation&limit=10`
    );

    // STEP 5: Try top tracks. This may return empty due to Spotify API changes.
    let topTracks = { tracks: [] };

    try {
      topTracks = await spotifyFetch(
        `https://api.spotify.com/v1/artists/${artistId}/top-tracks`
      );
    } catch (topTracksError) {
      topTracks = {
        tracks: [],
        error: topTracksError.message,
      };
    }

    // STEP 6: Get tracks from first returned album
    const firstAlbumId = artistAlbums.items?.[0]?.id;
    let firstAlbumTracks = null;

    if (firstAlbumId) {
      firstAlbumTracks = await spotifyFetch(
        `https://api.spotify.com/v1/albums/${firstAlbumId}/tracks?limit=50`
      );
    }

    // STEP 7: Return structured response
    return res.status(200).json({
      success: true,
      searchedArtist: artist,

      artist: {
        id: artistProfile.id,
        name: artistProfile.name,
        type: artistProfile.type,
        uri: artistProfile.uri,
        spotifyUrl: artistProfile.external_urls?.spotify || null,
        images: artistProfile.images || [],
        genres: artistProfile.genres || [],
        raw: artistProfile,
      },

      albums: {
        totalReturned: artistAlbums.items?.length || 0,
        items:
          artistAlbums.items?.map((album) => ({
            id: album.id,
            name: album.name,
            type: album.album_type,
            releaseDate: album.release_date,
            totalTracks: album.total_tracks,
            spotifyUrl: album.external_urls?.spotify || null,
            images: album.images || [],
            raw: album,
          })) || [],
      },

      topTracks: {
        totalReturned: topTracks.tracks?.length || 0,
        error: topTracks.error || null,
        items:
          topTracks.tracks?.map((track) => ({
            id: track.id,
            name: track.name,
            durationMs: track.duration_ms,
            explicit: track.explicit,
            spotifyUrl: track.external_urls?.spotify || null,
            previewUrl: track.preview_url || null,
            album: {
              id: track.album?.id,
              name: track.album?.name,
              releaseDate: track.album?.release_date,
              images: track.album?.images || [],
            },
            artists:
              track.artists?.map((a) => ({
                id: a.id,
                name: a.name,
                spotifyUrl: a.external_urls?.spotify || null,
              })) || [],
            externalIds: track.external_ids || {},
            raw: track,
          })) || [],
      },

      firstAlbumTracks: firstAlbumTracks
        ? {
            albumId: firstAlbumId,
            totalReturned: firstAlbumTracks.items?.length || 0,
            items:
              firstAlbumTracks.items?.map((track) => ({
                id: track.id,
                name: track.name,
                durationMs: track.duration_ms,
                explicit: track.explicit,
                trackNumber: track.track_number,
                discNumber: track.disc_number,
                spotifyUrl: track.external_urls?.spotify || null,
                previewUrl: track.preview_url || null,
                artists:
                  track.artists?.map((a) => ({
                    id: a.id,
                    name: a.name,
                    spotifyUrl: a.external_urls?.spotify || null,
                  })) || [],
                raw: track,
              })) || [],
          }
        : null,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
