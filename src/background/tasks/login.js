// src/background/tasks/login.js

export async function handleLoginWithVcode(tabId, { vcodeToken, vcode }) {
    return chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: async (loginData) => {
            const loginUrl = "https://yjsxk.xidian.edu.cn/yjsxkapp/sys/xsxkapp/login/check/login.do";
            const { vcodeToken, vcode } = loginData;
            const loginInfo = getLocalStorage("loginInfo");
            if (!loginInfo) {
                throw new Error("未找到登录信息，请先登录一次并勾选记住账号密码");
            }
            const payload = new URLSearchParams();
            payload.append("loginName", loginInfo.loginName);
            payload.append("loginPwd", loginInfo.loginPwd);
            payload.append("vtoken", vcodeToken);
            payload.append("verifyCode", vcode);

            try {
                const response = await fetch(loginUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: payload.toString()
                });
                const result = await response.json();
                console.log("登录请求结果:", result);
                return result;
            } catch (err) {
                console.error("登录请求失败:", err);
                throw err;
            }
        },
        args: [{ vcodeToken, vcode }]
    }).then((results) => {
        const [{ result }] = results;
        return result;
    });
}