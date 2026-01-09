const $ = (id) => document.getElementById(id);

function setStatus(msg) {
  $("status").textContent = msg;
}

function buildAxureSnippet({ dataLabel, processedCode }) {
  return `javascript:
var script = document.createElement('script');
script.type = "text/javascript";
script.src ="https://registry.npmmirror.com/echarts/5.5.1/files/dist/echarts.min.js";
document.head.appendChild(script);
setTimeout(function(){
  var dom =$('[data-label=${dataLabel}]').get(0);
  var myChart = echarts.init(dom);

var option;

${processedCode}

if (option && typeof option === "object"){
  myChart.setOption(option, true);
}}, 100);`;
}

function stripCommentsKeepFormat(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "")
    .trim();
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/**
 * 在页面主世界读取 ace 编辑器内容（避开 CSP 的 inline script 注入问题）
 */
async function extractEchartsCodeFromPage(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: () => {
      try {
        const aceEditorEl = document.querySelector(".ace_editor");
        if (!aceEditorEl) return { ok: false, error: "未找到 .ace_editor 元素" };

        if (!window.ace || typeof window.ace.edit !== "function") {
          return { ok: false, error: "页面未暴露 ace 对象（window.ace 不存在）" };
        }

        const editor = window.ace.edit(aceEditorEl);
        if (!editor) return { ok: false, error: "ace.edit 返回为空" };

        // 展开折叠（如果该 API 不存在也不致命）
        try {
          const session = editor.getSession && editor.getSession();
          if (session && typeof session.unfold === "function") session.unfold();
        } catch (e) {}

        const code = editor.getValue && editor.getValue();
        if (!code || !code.trim()) return { ok: false, error: "编辑器内容为空" };

        return { ok: true, code };
      } catch (e) {
        return { ok: false, error: String(e && e.message ? e.message : e) };
      }
    }
  });

  if (!result || !result.ok) {
    throw new Error(result?.error || "读取代码失败（未知原因）");
  }
  return result.code;
}

async function copyToClipboard(text) {
  // popup 页面有用户点击手势，navigator.clipboard 更稳定
  await navigator.clipboard.writeText(text);
}

$("copyBtn").addEventListener("click", async () => {
  try {
    setStatus("处理中...");

    const dataLabel = $("dataLabel").value.trim();
    if (!dataLabel) {
      setStatus("请先输入 data-label（Axure 组件的 data-label 值）。");
      return;
    }

    const tab = await getActiveTab();
    if (!tab?.id) {
      setStatus("未找到当前标签页。");
      return;
    }

    if (!tab.url || !tab.url.includes("echarts.apache.org/examples") || !tab.url.includes("editor.html")) {
      setStatus("请先打开 ECharts 示例编辑器页面（.../editor.html）。");
      return;
    }

    const rawCode = await extractEchartsCodeFromPage(tab.id);
    const processedCode = stripCommentsKeepFormat(rawCode);

    if (!processedCode) {
      setStatus("代码处理后为空，请确认编辑器内有 option 配置。");
      return;
    }

    const finalText = buildAxureSnippet({ dataLabel, processedCode });
    await copyToClipboard(finalText);

    setStatus("复制成功。");
  } catch (e) {
    setStatus("失败：\n" + (e && e.message ? e.message : String(e)));
  }
});
