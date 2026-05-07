export default async function handler(req, res) {
  try {
    const artist = req.query.artist || "Taylor Swift";

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

    const artistRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        artist
      )}&type=artist&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    const artistData = await artistRes.json();
    const artistInfo = artistData.artists.items[0];

    if (!artistInfo) {
      return res.status(404).json({
        success: false,
        error: "Artist not found",
      });
    }

    const customResponse = {
      success: true,

      search: {
        searchedArtist: artist,
      },

      spotify: {
        id: artistInfo.id,
        uri: artistInfo.uri,
        url: artistInfo.external_urls?.spotify || null,
      },

      profile: {
        name: artistInfo.name,
        type: artistInfo.type,
        genres: artistInfo.genres || [],
        popularity: artistInfo.popularity ?? null,
      },

      followers: {
        total: artistInfo.followers?.total ?? null,
      },

      images: {
        large: artistInfo.images?.[0]?.url || null,
        medium: artistInfo.images?.[1]?.url || null,
        small: artistInfo.images?.[2]?.url || null,
      },

      stats: {
        spotifyPopularityScore: artistInfo.popularity ?? null,
        followerCount: artistInfo.followers?.total ?? null,
      },
    };

    res.status(200).json(customResponse);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
