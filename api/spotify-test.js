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

res.status(200).json({
  success: true,
  artist: artistInfo.name,
  followers: artistInfo.followers.total,
  popularity: artistInfo.popularity,
  image: artistInfo.images[0]?.url,
  spotifyUrl: artistInfo.external_urls.spotify,
});
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
