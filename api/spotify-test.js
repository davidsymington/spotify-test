export default async function handler(req, res) {
  try {
    const artist = req.query.artist || "Taylor Swift";
    const debug = req.query.debug === "true";

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

    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(artist)}&type=artist&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    const searchData = await searchRes.json();
    const searchResult = searchData.artists?.items?.[0];

    if (!searchResult) {
      return res.status(404).json({
        success: false,
        error: "Artist not found",
        rawSearchData: debug ? searchData : undefined,
      });
    }

    const fullArtistRes = await fetch(
      `https://api.spotify.com/v1/artists/${searchResult.id}`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    const fullArtist = await fullArtistRes.json();

    if (debug) {
      return res.status(200).json({
        success: true,
        debug: true,
        searchResult,
        fullArtist,
      });
    }

    res.status(200).json({
      success: true,
      search: {
        searchedArtist: artist,
        matchedArtist: fullArtist.name,
      },
      spotify: {
        id: fullArtist.id,
        uri: fullArtist.uri,
        url: fullArtist.external_urls?.spotify || null,
      },
      profile: {
        name: fullArtist.name,
        type: fullArtist.type,
        genres: fullArtist.genres || [],
        popularity: fullArtist.popularity ?? null,
      },
      followers: {
        total: fullArtist.followers?.total ?? null,
      },
      images: {
        large: fullArtist.images?.[0]?.url || null,
        medium: fullArtist.images?.[1]?.url || null,
        small: fullArtist.images?.[2]?.url || null,
      },
      stats: {
        spotifyPopularityScore: fullArtist.popularity ?? null,
        followerCount: fullArtist.followers?.total ?? null,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
