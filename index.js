// ====================================
// 洗衣店 AI 客服系統 - 精簡版
// 只保留核心 AI 對話功能
// ====================================

require('dotenv').config();
const express = require('express');
const { Client } = require('@line/bot-sdk');

// ====== 載入 AI 客服模組 ======
console.log('🤖 正在載入 AI 客服模組...');
const claudeAI = require('./services/claudeAI');
console.log('✅ AI 客服模組已載入');

// ====== Express 設定 ======
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====== LINE Bot 設定 ======
const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

// ====== 健康檢查 ======
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'AI 洗衣客服'
  });
});

// ====== LINE Webhook ======
app.post('/webhook', async (req, res) => {
  // 先回覆 LINE Server 200 OK
  res.status(200).end();

  try {
    const events = req.body.events || [];
    
    for (const event of events) {
      // 只處理文字訊息
      if (event.type !== 'message' || event.message.type !== 'text') {
        continue;
      }

      const userId = event.source.userId;
      const userMessage = event.message.text.trim();

      console.log(`📩 收到訊息: ${userMessage} (來自 ${userId})`);

      try {
        // 呼叫 Claude AI 處理訊息
        const aiResponse = await claudeAI.handleTextMessage(userMessage, userId);

        if (aiResponse) {
          // 回覆給用戶
          await client.pushMessage(userId, {
            type: 'text',
            text: aiResponse
          });
          console.log(`✅ AI 已回覆: ${userId}`);
        } else {
          console.log(`🔇 AI 判斷為無關問題,不回覆`);
        }
      } catch (aiError) {
        console.error(`❌ AI 處理失敗:`, aiError.message);
      }
    }
  } catch (error) {
    console.error(`❌ Webhook 處理失敗:`, error.message);
  }
});

// ====== 啟動伺服器 ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 伺服器啟動成功!`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🤖 AI 客服系統運行中...`);
});
