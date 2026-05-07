export default async function handler(req, res) {
  try {
    const artist = req.query.artist || "Metallica";

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

    const spotifyFetch = async (url) => {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });
      return response.json();
    };

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

    const artistProfile = await spotifyFetch(
      `https://api.spotify.com/v1/artists/${artistId}`
    );

    const artistAlbums = await spotifyFetch(
      `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single,appears_on,compilation&limit=10`
    );

    const topTracks = await spotifyFetch(
      `https://api.spotify.com/v1/artists/${artistId}/top-tracks`
    );

    const firstAlbumId = artistAlbums.items?.[0]?.id;

    let firstAlbumTracks = null;

    if (firstAlbumId) {
      firstAlbumTracks = await spotifyFetch(
        `https://api.spotify.com/v1/albums/${firstAlbumId}/tracks?limit=20`
      );
    }

    res.status(200).json({
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
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
