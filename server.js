const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

// Aapka persistent cookie
const OAUTH_COOKIE = 'oauth_token=pwowkqOBGM3U5qGzIkdczjpFig3AmY0r;';

const baseHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
  'Cookie': OAUTH_COOKIE,
  'Referer': 'https://m.starmakerstudios.com/v/rhapsody-music/index?promotion_id=2711',
  'Origin': 'https://m.starmakerstudios.com'
};

// Profile API se SID fetch karna
async function getUserProfile(uid) {
  try {
    const url = `https://api-rush.starmakerstudios.com/v1/users/profile?user_id=${uid}`;
    const res = await axios.get(url, { headers: baseHeaders, timeout: 5000 });
    const profile = res.data?.data || res.data || {};
    return {
      sid: profile.sid || profile.user_sid || uid,
      name: profile.stage_name || profile.name || null
    };
  } catch (e) {
    return { sid: uid, name: null };
  }
}

// Endpoint helper jo query aur path dono variants check karega
async function fetchGameData(action) {
  const ts = Date.now();
  const urls = [
    `https://m.starmakerstudios.com/go-v1/rhapsody-music/game-${action}?promotion_id=2711&_sx_ts=${ts}`,
    `https://m.starmakerstudios.com/go-v1/rhapsody-music/2711/game-${action}?_sx_ts=${ts}`,
    `https://m.starmakerstudios.com/go-v1/rhapsody-music/${action}?promotion_id=2711&_sx_ts=${ts}`
  ];

  for (const u of urls) {
    try {
      const res = await axios.get(u, { headers: baseHeaders, timeout: 5000 });
      if (res.data) return res.data;
    } catch (e) {
      // agla URL format try karein
    }
  }
  return null;
}

app.get('/api/live-status', async (req, res) => {
  try {
    const [refreshJson, resultJson] = await Promise.all([
      fetchGameData('refresh'),
      fetchGameData('result')
    ]);

    if (!refreshJson && !resultJson) {
      return res.status(404).json({
        success: false,
        error: "Both refresh and result endpoints returned 404. Check promotion_id path."
      });
    }

    const roundData = refreshJson?.data || {};
    const resultData = resultJson?.data || {};

    const rawList = resultData.gods_reward_gold_list || resultData.top3_user_list || [];

    const top3 = [];
    for (let i = 0; i < Math.min(rawList.length, 3); i++) {
      const u = rawList[i];
      let uid = u.id || u.user_id;

      if (!uid && (u.profile_image || u.user_cover)) {
        const m = (u.profile_image || u.user_cover).match(/users\/(\d+)\//);
        uid = m ? m[1] : null;
      }

      if (uid) {
        const profile = await getUserProfile(uid);
        top3.push({
          rank: i + 1,
          sid: profile.sid,
          name: profile.name || u.name || u.stage_name || `Player_${profile.sid}`,
          coins: u.reward_gold || u.user_reward_gold || 0
        });
      }
    }

    res.json({
      success: true,
      round: roundData.curr_round || roundData.round || 'Active',
      timeLeft: roundData.round_left_time || 0,
      top3
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Proxy active on port ${PORT}`));
