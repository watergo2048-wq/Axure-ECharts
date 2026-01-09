// 目前方案由 popup.js 通过 chrome.scripting.executeScript(world:"MAIN") 读取 ace。
// content.js 仅预留：未来如果需要页面提示、注入 UI（但要注意 CSP），可在此扩展。
console.log("[Axure-ECharts] content script loaded");
