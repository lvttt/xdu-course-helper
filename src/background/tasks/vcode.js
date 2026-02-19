// src/background/tasks/vcode.js

// 获取验证码token
export async function getVcodeToken(tabId) {
    return chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: async () => {
            const vcode_url = "https://yjsxk.xidian.edu.cn/yjsxkapp/sys/xsxkapp/login/4/vcode.do";

            return await fetch(vcode_url).then(response => response.json()).then(data => {
                console.log("获取验证码token成功:", data);
                return data.data.token;
            }).catch(err => {
                console.error("获取验证码token失败:", err);
                throw err;
            });
        }
    }).then((results) => {
        const [{ result }] = results;
        return result;
    });
}