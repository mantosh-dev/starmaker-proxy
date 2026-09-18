const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

// Exact persistent cookies
const OAUTH_COOKIE = 'oauth_token=pwowkqOBGM3U5qGzIkdczjpFig3AmY0r; PHPSESSID=khu8s2rsb8qlfs0r1r56sj3tk1;';

// Exact headers matched from your DevTools Network capture
const baseHeaders = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36',
  'Cookie': OAUTH_COOKIE,
  'Referer': 'https://m.starmakerstudios.com/v/rhapsody-music/index?promotion_id=2711',
  'Origin': 'https://m.starmakerstudios.com',
  'Accept': 'application/json, text/plain, */*'
};

// api-rush profile API se SID aur Stage Name fetch karna
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

app.get('/api/live-status', async (req, res) => {
  try {
    const ts = Date.now();

    // Exact paths from your network capture: /go-v1/ssc/2711/refresh & /go-v1/ssc/2711/result
    const [refreshRes, resultRes] = await Promise.all([
      axios.get(`https://m.starmakerstudios.com/go-v1/ssc/2711/refresh?ts=${ts}`, { headers: baseHeaders }),
      axios.get(`https://m.starmakerstudios.com/go-v1/ssc/2711/result?ts=${ts}`, { headers: baseHeaders })
    ]);

    const roundData = refreshRes.data?.data || refreshRes.data || {};
    const resultData = resultRes.data?.data || resultRes.data || {};

    const rawList = resultData.gods_reward_gold_list || resultData.top3_user_list || resultData.user_list || [];

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
      round: roundData.curr_round || roundData.round || roundData.today_round || 'Active',
      timeLeft: roundData.round_left_time || roundData.left_time || 0,
      top3
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Star Treasure Proxy listening on port ${PORT}`));
