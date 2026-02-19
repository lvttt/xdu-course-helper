// src/background/tasks/config.js

// 默认扩展配置
const defaultConfig = {
    enableJumpXK: false,
    pageSize: 30,
    rememberMe: false
};

// 获取扩展配置
export async function handleGetConfig(tabId) {
    return chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: () => {
            return window.xdu_course_helper.getLocalStorage('extConfig');
        }
    }).then((results) => {
        const [{ result }] = results;
        return result || defaultConfig;
    });
}

// 更新扩展配置
export async function handleUpdateConfig(tabId, newConfig) {
    return chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: (config) => {
            window.xdu_course_helper.setLocalStorage('extConfig', config);
        },
        args: [newConfig]
    });
}

// 修改PageSize
export async function handleUpdatePageSize(tabId, pageSize) {
    return chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: (size) => {
            window.WIS_XTCS.xkgl_xsxkmymrxsjls = size.toString();
            console.log(`已更新页面课程列表数量为: ${size}`);
        },
        args: [pageSize]
    }); 
}