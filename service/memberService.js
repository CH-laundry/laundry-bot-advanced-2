const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID || process.env.SPREADSHEET_ID;
const CREDENTIALS = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS || process.env.GOOGLE_CREDENTIALS_JSON);

/**
 * 取得 Google Sheets 認證
 */
async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return await auth.getClient();
}

/**
 * 檢查用戶是否存在
 */
async function isUserExists(userId) {
  try {
    console.log(`🔍 正在查詢用戶: ${userId}`);
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: '會員資料!C:C'
    });
    
    const rows = result.data.values || [];
    console.log(`📊 會員資料表共有 ${rows.length} 行`);
    
    const exists = rows.some(row => row[0] === userId);
    
    if (exists) {
      console.log(`✅ 用戶已存在: ${userId}`);
    } else {
      console.log(`❌ 用戶不存在: ${userId}`);
    }
    
    return exists;
  } catch (error) {
    console.error('❌ 檢查用戶時出錯:', error.message);
    return false;
  }
}

/**
 * 新增未綁定會員(自動抓取 LINE 顯示名稱)
 */
async function addUnboundMember(userId, displayName = '') {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const now = new Date();
    const timestamp = now.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    
    console.log(`📝 準備新增會員: ${userId}, 名稱: ${displayName}`);
    
    const values = [[
      '',           // A: 會員編號(空白)
      displayName || '(未設定)',  // B: 客戶姓名(LINE 顯示名稱)
      userId,       // C: 客戶ID
      '',           // D: 客戶電話(空白)
      timestamp,    // E: 綁定日期
      '未綁定'      // F: 狀態
    ]];
    
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: '會員資料!A:F',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: values }
    });
    
    console.log(`✅ 已記錄未綁定會員: ${userId} (${displayName})`);
    console.log(`📊 更新範圍: ${result.data.updates.updatedRange}`);
    return true;
    
  } catch (error) {
    console.error('❌ 新增未綁定會員時出錯:', error.message);
    console.error('錯誤詳情:', error);
    return false;
  }
}

/**
 * 記錄對話
 */
async function logConversation(userId, userMessage, aiReply) {
  try {
    console.log(`💬 準備記錄對話: ${userId}`);
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    // 先取得會員資料
    const memberResult = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: '會員資料!A:C'
    });
    
    const memberRows = memberResult.data.values || [];
    let memberInfo = { memberId: '', name: '' };
    
    for (let i = 1; i < memberRows.length; i++) {
      if (memberRows[i][2] === userId) {
        memberInfo = {
          memberId: memberRows[i][0] || '',
          name: memberRows[i][1] || ''
        };
        break;
      }
    }
    
    const now = new Date();
    const timestamp = now.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    
    const values = [[
      timestamp,           // A: 時間
      memberInfo.memberId, // B: 會員編號
      memberInfo.name,     // C: 客戶姓名
      userId,              // D: 客戶ID
      userMessage,         // E: 客戶訊息
      aiReply              // F: AI回覆
    ]];
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: '對話紀錄!A:F',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: values }
    });
    
    console.log(`✅ 已記錄對話: ${userId}`);
    return true;
    
  } catch (error) {
    console.error('❌ 記錄對話時出錯:', error.message);
    console.error('錯誤詳情:', error);
    return false;
  }
}

module.exports = {
  isUserExists,
  addUnboundMember,
  logConversation
};
