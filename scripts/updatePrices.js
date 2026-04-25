import fs from 'fs';
import path from 'path';

// 示範腳本：實際應用建議使用 axios 或 node-fetch 呼叫真正的金融 API
async function updatePrices() {
  console.log('正在取得最新股價...');

  // TODO: 這裡請替換成您實際串接 API 的邏輯 (例如呼叫 Yahoo Finance)
  // 此處先模擬產生資料
  const data = {
    updated: new Date().toISOString(),
    prices: {
        "0050.TW": (Math.random() * 10 + 145).toFixed(2),
        "2330.TW": (Math.random() * 20 + 790).toFixed(2)
    }
  };

  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
  }
  
  fs.writeFileSync(path.join(dir, 'prices.json'), JSON.stringify(data, null, 2));
  console.log('股價資料已更新至 data/prices.json');
}

updatePrices().catch(err => {
  console.error('更新失敗:', err);
  process.exit(1);
});
