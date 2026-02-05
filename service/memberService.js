// ====================================
// 會員管理服務 - Google Sheets 整合
// ====================================

const { google } = require('googleapis');

// 你的 Google Sheets ID
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

/**
 * 取得 Google Sheets 認證
 */
function getAuthClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
  
  const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  
  return auth;
}

/**
 * 檢查用戶是否已經存在於「會員資料」表
 */
async function isUserExists(userId) {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: '會員資料!C:C', // C 欄是 LINE User ID
    });
    
    const rows = response.data.values || [];
    
    // 檢查是否有這個 User ID（跳過標題列）
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === userId) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('❌ 檢查用戶是否存在時出錯:', error.message);
    return false;
  }
}

/**
 * 新增未綁定會員（只有 User ID，沒有編號和姓名）
 */
async function addUnboundMember(userId) {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const now = new Date();
    const timestamp = now.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    
    const values = [[
      '',           // A: 會員編號（空白）
      '',           // B: 客戶姓名（空白）
      userId,       // C: LINE User ID
      '',           // D: 手機號碼（空白）
      timestamp,    // E: 綁定日期
      '未綁定'      // F: 狀態
    ]];
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: '會員資料!A:F',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: values }
    });
    
    console.log(`✅ 已記錄未綁定會員: ${userId}`);
    return true;
    
  } catch (error) {
    console.error('❌ 新增未綁定會員時出錯:', error.message);
    return false;
  }
}

/**
 * 記錄對話到「對話紀錄」工作表
 */
async function logConversation(userId, userMessage, aiReply) {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const now = new Date();
    const timestamp = now.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    
    // 查詢該用戶的會員編號和姓名
    const memberInfo = await getMemberInfo(userId);
    
    const values = [[
      timestamp,                    // A: 時間
      memberInfo.memberId || '',    // B: 會員編號
      memberInfo.name || '',        // C: 客戶姓名
      userId,                       // D: LINE User ID
      userMessage,                  // E: 客戶訊息
      aiReply                       // F: AI回覆
    ]];
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: '對話紀錄!A:F',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: values }
    });
    
    console.log(`✅ 已記錄對話: ${userId}`);
    
  } catch (error) {
    console.error('❌ 記錄對話時出錯:', error.message);
  }
}

/**
 * 查詢會員資訊
 */
async function getMemberInfo(userId) {
  try {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: '會員資料!A:C',
    });
    
    const rows = response.data.values || [];
    
    // 尋找匹配的 User ID
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][2] === userId) { // C 欄是 User ID
        return {
          memberId: rows[i][0] || '',  // A 欄是會員編號
          name: rows[i][1] || ''        // B 欄是姓名
        };
      }
    }
    
    return { memberId: '', name: '' };
    
  } catch (error) {
    console.error('❌ 查詢會員資訊時出錯:', error.message);
    return { memberId: '', name: '' };
  }
}

module.exports = {
  isUserExists,
  addUnboundMember,
  logConversation,
  getMemberInfo
};
