const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

// Aapke complete injected cookies
const COOKIE_HEADER = [
  'oauth_token=pwowkqOBGM3U5qGzIkdczjpFig3AmY0r',
  'PHPSESSID=qmnd88sup6pur82idvrrsavsos',
  'X-Rce-Token=11yVtdU0iI9K-7MGSmqjG896U3y6ACfiv3-jM0tw==',
  'uid=562949968068375'
].join('; ');

const baseHeaders = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36',
  'Cookie': COOKIE_HEADER,
  'Referer': 'https://m.starmakerstudios.com/v/rhapsody-music/index?promotion_id=2711',
  'Origin': 'https://m.starmakerstudios.com',
  'Accept': 'application/json, text/plain, */*'
};

// api-rush profile API se 11-digit SID aur Name nikalna
async function getUserProfile(uid) {
  try {
    const url = `https://api-rush.starmakerstudios.com/v1/users/profile?user_id=${uid}`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': baseHeaders['User-Agent'],
        'Cookie': COOKIE_HEADER,
        'Referer': 'https://m.starmakerstudios.com/',
        'Origin': 'https://m.starmakerstudios.com'
      },
      timeout: 4000
    });

    const profile = res.data?.data || res.data || {};
    return {
      sid: profile.sid || profile.user_sid || uid,
      name: profile.stage_name || profile.name || null
    };
  } catch (e) {
    return { sid: uid, name: null };
  }
}

app.get('/api/live-status', async (req, res) => {
  try {
    const ts = Date.now();

    // Live Round & Results APIs
    const [refreshRes, resultRes] = await Promise.all([
      axios.get(`https://m.starmakerstudios.com/go-v1/ssc/2711/refresh?ts=${ts}`, {
        headers: baseHeaders,
        timeout: 5000
      }),
      axios.get(`https://m.starmakerstudios.com/go-v1/ssc/2711/result?ts=${ts}`, {
        headers: baseHeaders,
        timeout: 5000
      })
    ]);

    const refreshData = refreshRes.data || {};
    const resultData = resultRes.data || {};

    const roundInfo = refreshData.curr_round_info || resultData.curr_round_info || {};
    const winnersList = resultData.gods_reward_gold_list || resultData.last_gods_list || [];

    const top3 = [];
    for (let i = 0; i < Math.min(winnersList.length, 3); i++) {
      const u = winnersList[i];
      let uid = u.id || u.user_id;

      if (!uid && u.profile_image) {
        const m = u.profile_image.match(/users\/(\d+)\//);
        uid = m ? m[1] : null;
      }

      if (uid) {
        const prof = await getUserProfile(uid);
        top3.push({
          rank: u.rank || (i + 1),
          sid: prof.sid,
          name: prof.name || u.stage_name || u.name || `Player_${prof.sid}`,
          coins: u.reward_gold || u.last_round_golds || 0
        });
      }
    }

    res.json({
      success: true,
      round: roundInfo.curr_round || 'Live',
      timeLeft: roundInfo.round_left_time ?? 0,
      top3
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.response ? `HTTP ${err.response.status}` : err.message
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Proxy listening on port ${PORT}`));
