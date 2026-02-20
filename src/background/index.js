// background/index.js
import { handleForceEnter, handleClearCookies } from './tasks/entrance';
import { handleUpdateConfig, handleGetConfig, handleUpdatePageSize } from './tasks/config';
import { getVcodeToken } from './tasks/vcode';
import { handleLoginWithVcode } from './tasks/login';

// 当用户点击扩展图标时触发
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

async function updateSidePanelState(tabId, url) {
  if (!url) return;

  const isCourseSite = url.includes("https://yjsxk.xidian.edu.cn/yjsxkapp/sys/xsxkapp/");

  if (isCourseSite) {
    // 目标网站：启用侧边栏
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'index.html',
      enabled: true
    });
  } else {
    // 非目标网站：禁用
    await chrome.sidePanel.setOptions({
      tabId,
      enabled: false
    });
  }
}

// 监听标签页更新
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.status === 'complete') {
    await updateSidePanelState(tabId, tab.url);
  }
});

// 监听标签页切换
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  await updateSidePanelState(activeInfo.tabId, tab.url);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, tabId, payload } = message;

  if (action === 'CALL_MAIN_FUNCTION') {
    // 异步执行分发逻辑
    dispatchTask(tabId, payload)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    
    return true; // 保持异步连接
  }
});

async function dispatchTask(tabId, { taskType, data }) {
  switch (taskType) {
    case 'FORCE_ENTER':
      return await handleForceEnter(tabId);
    case 'CLEAR_COOKIES':
      return await handleClearCookies(tabId);
    case 'UPDATE_CONFIG':
      return await handleUpdateConfig(tabId, data);
    case 'GET_CONFIG':
      return await handleGetConfig(tabId);
    case 'UPDATE_PAGE_SIZE':
      return await handleUpdatePageSize(tabId, data);
    case 'GET_VCODE_TOKEN':
      return await getVcodeToken(tabId);
    case 'LOGIN_WITH_VCODE':
      return await handleLoginWithVcode(tabId, data);
    default:
      throw new Error(`未知的任务类型: ${taskType}`);
  }
}