require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const claudeAI = require('./service/claudeAI');
const memberService = require('./service/memberService');

const app = express();

// LINE Bot 設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);

// Webhook endpoint
app.post('/webhook', line.middleware(config), async (req, res) => {
  res.status(200).end();
  
  try {
    const events = req.body.events || [];
    
    for (const event of events) {
      if (event.type !== 'message' || event.message.type !== 'text') {
        continue;
      }
      
      const userId = event.source.userId;
      const userMessage = event.message.text.trim();
      console.log(`📩 收到訊息: ${userMessage} (來自 ${userId})`);
      
      try {
        // ✅ 抓取用戶的 LINE 顯示名稱
        let displayName = '';
        try {
          const profile = await client.getProfile(userId);
          displayName = profile.displayName || '';
          console.log(`👤 用戶名稱: ${displayName}`);
        } catch (profileError) {
          console.log(`⚠️ 無法取得用戶資料: ${profileError.message}`);
        }
        
        // 檢查是否為首次對話用戶
        console.log(`🔍 檢查用戶是否存在: ${userId}`);
        const userExists = await memberService.isUserExists(userId);
        
        if (!userExists) {
          console.log(`🆕 偵測到新用戶: ${userId} (${displayName})`);
          await memberService.addUnboundMember(userId, displayName);
          console.log(`✅ 已記錄新用戶到 Google Sheets`);
        } else {
          console.log(`✅ 用戶已存在: ${userId}`);
        }
        
        // 呼叫 Claude AI 處理訊息
        console.log(`🤖 正在呼叫 AI 處理訊息...`);
        const aiResponse = await claudeAI.handleTextMessage(userMessage, userId);
        
        if (aiResponse) {
          await client.pushMessage(userId, {
            type: 'text',
            text: aiResponse
          });
          console.log(`✅ AI 已回覆給用戶: ${userId}`);
          
          // 記錄對話到 Google Sheets
          console.log(`💾 記錄對話到 Google Sheets...`);
          await memberService.logConversation(userId, userMessage, aiResponse);
          console.log(`✅ 對話已記錄`);
        } else {
          console.log(`🔇 AI 判斷為無關問題,不回覆`);
        }
      } catch (aiError) {
        console.error(`❌ AI 處理失敗:`, aiError.message);
        console.error(aiError.stack);
      }
    }
  } catch (error) {
    console.error(`❌ Webhook 處理失敗:`, error.message);
    console.error(error.stack);
  }
});

// 健康檢查
app.get('/', (req, res) => {
  res.send('LINE Bot is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
