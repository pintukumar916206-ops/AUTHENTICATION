import core from "./core.mjs";



export async function getRealTimeBaseline(title, category, fallbackRef) {

  try {
    const dbClient = await core.getReports(100); 
    if (dbClient && dbClient.length > 0) {

      const keywords = title.toLowerCase().split(' ').slice(0, 3).filter(k => k.length > 3);
      
      const similarProducts = dbClient.filter(report => {
        if (!report.product || !report.product.price) return false;
        const targetTitle = (report.product.title || '').toLowerCase();
        return keywords.some(k => targetTitle.includes(k));
      }).map(r => r.product.price);

      if (similarProducts.length >= 3) {
        const sum = similarProducts.reduce((acc, val) => acc + val, 0);
        const mean = sum / similarProducts.length;

        const squaredDiffs = similarProducts.map(val => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / similarProducts.length;
        const stdDev = Math.sqrt(variance);


        const safeFloor = Math.max(mean - stdDev, fallbackRef.min);
        
        console.log(`[MARKET-DATA] Dynamic baseline established for "${title.substring(0, 20)}...". Mean: ${mean.toFixed(2)}, Floor: ${safeFloor.toFixed(2)}`);
        
        return {
          avg: mean,
          min: safeFloor,
          max: mean + (stdDev * 2),
          isDynamic: true
        };
      }
    }
  } catch {
    console.warn("[MARKET-DATA] Failed to calculate dynamic baseline, using static fallback.");
  }


  console.log(`[MARKET-DATA] Using static baseline for category: ${category}`);
  return {
    ...fallbackRef,
    isDynamic: false
  };
}
