export default async function handler(req, res) {
  try {
    // Get Spotify access token
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' +
          Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString('base64'),
      },
      body: 'grant_type=client_credentials',
    });

    const tokenData = await tokenRes.json();

    // Search Spotify for Taylor Swift
    const artistRes = await fetch(
      'https://api.spotify.com/v1/search?q=Taylor%20Swift&type=artist&limit=1',
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    const artistData = await artistRes.json();

    res.status(200).json({
      success: true,
      artist: artistData.artists.items[0],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
