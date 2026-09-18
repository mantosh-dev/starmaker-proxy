const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

// Aapka exact persistent cookie
const OAUTH_COOKIE = 'oauth_token=pwowkqOBGM3U5qGzIkdczjpFig3AmY0r;';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
  'Cookie': OAUTH_COOKIE,
  'Referer': 'https://m.starmakerstudios.com/v/rhapsody-music/index?promotion_id=2711',
  'Origin': 'https://m.starmakerstudios.com'
};

// Profile API se SID fetch karna
async function getSID(uid) {
  try {
    const url = `https://api-rush.starmakerstudios.com/v1/users/profile?user_id=${uid}`;
    const res = await axios.get(url, { headers });
    return res.data?.data?.sid || res.data?.data?.user_sid || uid;
  } catch (e) {
    return uid;
  }
}

app.get('/api/live-status', async (req, res) => {
  try {
    const ts = Date.now();
    
    // Star Treasure / Rhapsody Music endpoints (promotion_id=2711)
    const [refreshRes, resultRes] = await Promise.all([
      axios.get(`https://m.starmakerstudios.com/go-v1/rhapsody-music/game-refresh?promotion_id=2711&_sx_ts=${ts}`, { headers }),
      axios.get(`https://m.starmakerstudios.com/go-v1/rhapsody-music/game-result?promotion_id=2711&_sx_ts=${ts}`, { headers })
    ]);

    const roundData = refreshRes.data?.data || {};
    const resultData = resultRes.data?.data || {};
    
    // Winners list extraction
    const rawList = resultData.gods_reward_gold_list || resultData.top3_user_list || [];

    const top3 = [];
    for (let i = 0; i < Math.min(rawList.length, 3); i++) {
      const u = rawList[i];
      let uid = u.id || u.user_id;

      // Profile URL se UID extract karna agar direct UID na ho
      if (!uid && (u.profile_image || u.user_cover)) {
        const m = (u.profile_image || u.user_cover).match(/users\/(\d+)\//);
        uid = m ? m[1] : null;
      }

      if (uid) {
        const sid = await getSID(uid);
        top3.push({
          rank: i + 1,
          sid: sid,
          name: u.name || u.stage_name || `Player_${sid}`,
          coins: u.reward_gold || u.user_reward_gold || 0
        });
      }
    }

    res.json({
      success: true,
      round: roundData.curr_round || roundData.round || 'Active',
      timeLeft: roundData.round_left_time || 0,
      top3: top3
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Rhapsody Proxy running on port ${PORT}`));
