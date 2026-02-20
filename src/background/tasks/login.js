// src/background/tasks/login.js

export async function handleLoginWithVcode(tabId, { vcodeToken, vcode }) {
    return chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: async (loginData) => {
            const loginUrl = "https://yjsxk.xidian.edu.cn/yjsxkapp/sys/xsxkapp/login/check/login.do";
            const { vcodeToken, vcode } = loginData;
            const loginInfo = window.xdu_course_helper.getLocalStorage("loginInfo");
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
                if (result.code === "1") {
                    // 登录成功，刷新页面
                    window.location.reload();
                }

                console.log("登录请求结果:", result);
                return result;
            } catch (err) {
                console.error("登录请求失败:", err);
                if (err instanceof SyntaxError) {
                    // 登录错误次数过多,限制5分钟内禁止登录
                    return { code: "4", msg: "登录错误次数过多,限制5分钟内禁止登录" };
                }
                throw err;
            }
        },
        args: [{ vcodeToken, vcode }]
    }).then((results) => {
        const [{ result }] = results;
        return result;
    });
}