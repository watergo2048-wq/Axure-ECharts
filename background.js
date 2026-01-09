chrome.action.onClicked.addListener(async (tab) => {
  // 有 popup 时，点击图标通常会打开 popup；
  // 这里留作兜底：如果用户关闭 popup 配置，也可以在这里扩展逻辑。
  if (!tab?.id) return;

  // 可选：仅在目标页面提示
  if (tab.url && tab.url.includes("echarts.apache.org/examples") && tab.url.includes("editor.html")) {
    // 这里不做剪贴板写入（service worker 没有稳定的用户手势）
    // 需要复制请使用 popup 按钮
    console.log("[Axure-ECharts] Action clicked on editor page.");
  }
});
