export default async function handler(req, res) {
  try {
    // Get artist from URL query
    const artist = req.query.artist || "Taylor Swift";

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

    // STEP 2: Search Spotify
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

    // STEP 3: Extract artist
    const artistInfo = artistData.artists.items[0];

    // STEP 4: Handle no results
    if (!artistInfo) {
      return res.status(404).json({
        success: false,
        error: "Artist not found",
      });
    }

    // STEP 5: Custom response format
    const customResponse = {
      success: true,

      search: {
        searchedArtist: artist,
      },

      spotify: {
        id: artistInfo.id,
        uri: artistInfo.uri,
        url: artistInfo.external_urls.spotify,
      },

      profile: {
        name: artistInfo.name,
        type: artistInfo.type,
        genres: artistInfo.genres,
        popularity: artistInfo.popularity,
      },

      followers: {
        total: artistInfo.followers.total,
      },

      images: {
        large: artistInfo.images[0]?.url || null,
        medium: artistInfo.images[1]?.url || null,
        small: artistInfo.images[2]?.url || null,
      },

      stats: {
        spotifyPopularityScore: artistInfo.popularity,
        followerCount: artistInfo.followers.total,
      },
    };

    // STEP 6: Return cleaned response
    res.status(200).json(customResponse);

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
