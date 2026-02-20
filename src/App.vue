<template>
  <div class="bg-white flex flex-col font-sans text-gray-800">
    <template v-if="isSupportedSite">
      <header class="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between sticky top-0 z-10">
        <div class="flex items-center gap-2">
          <h1 class="text-[14px] font-bold text-gray-700">XDU 选课助手</h1>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto px-4 py-2">
        <div class="mb-2">
          <SettingItem 
            title="强制进入选课系统" 
            description="跳过时间限制直接进入选课系统"
          >
            <template #action>
              <ChromeSwitch v-model="extConfig.enableJumpXK" />
            </template>
            <template #warning v-if="extConfig.enableJumpXK">
              <div class="bg-red-50 px-2 py-1.5 rounded text-[11px] text-red-600 flex items-start gap-1">
                <span class="mt-[1px]">⚠️</span>
                <span>正常选课时间不建议开启。</span>
              </div>
            </template>
            <template #default v-if="extConfig.enableJumpXK">
              <ChromeButton block variant="primary" :disabled="isPending" @click="handleForceEnter">
                {{ isPending ? '正在连接...' : '🚀 立即进入选课系统' }}
              </ChromeButton>
            </template>
          </SettingItem>

          <SettingItem 
            title="出错时自动重定向" 
            description="NullPointer时自动清除Cookie并重定向到登录页"
          >
            <template #action>
              <ChromeSwitch v-model="extConfig.redirectOnError" />
            </template>
          </SettingItem>

          <SettingItem 
            title="修改每页条数" 
            description="修改选课列表每页显示的课程条数"
          >
            <template #action>
              <ChromeSwitch v-model="extConfig.enablePageSizeChange" />
            </template>
            <template #warning v-if="extConfig.enablePageSizeChange">
              <div class="bg-yellow-50 px-2 py-1.5 rounded text-[11px] text-yellow-700 flex items-start gap-1">
                <span class="mt-[1px]">⚠️</span>
                <span>过大可能导致页面卡顿，建议不超过100。</span>
              </div>
            </template>
            <template #default v-if="extConfig.enablePageSizeChange">
              <input 
                type="number" 
                v-model.number="extConfig.pageSize" 
                class="w-full px-2 py-1.5 text-[12px] border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                min="10" max="100"
                placeholder="请输入条数"
              >
            </template>
          </SettingItem>

          <SettingItem 
            title="记住账号密码" 
            description="只保存加密后的密码,不建议在公共电脑使用"
          >
            <template #action>
              <ChromeSwitch v-model="extConfig.rememberMe" />
            </template>
            <template v-if="extConfig.rememberMe" #default>
              <div class="bg-gray-50 border border-gray-200 rounded-md p-3 flex flex-col gap-2">
                <h3 class="text-[12px] font-bold text-gray-700 mb-1">系统登录</h3>
                <ChromeButton block variant="secondary" @click="handleGetVcodeToken">
                  📄 获取验证码
                </ChromeButton>

                <template v-if="vcodeToken">
                  <div class="flex items-center gap-2 mt-1">
                    <img :src="vcodeUrl" alt="验证码" class="h-8 border border-gray-300 rounded bg-white shrink-0 cursor-pointer"
                    @click="handleGetVcodeToken">
                    <input 
                      type="text" 
                      placeholder="输入验证码" 
                      v-model="vcodeText"
                      @keyup.enter="handleLogin"
                      class="flex-1 w-0 px-2 py-1.5 text-[12px] border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    >
                  </div>
                  
                  <div class="flex gap-2 mt-1">
                    <ChromeButton block variant="primary" @click="handleLogin">登录</ChromeButton>
                    <ChromeButton block variant="primary" @click="handleAutoLogin">自动识别登录</ChromeButton>
                  </div>
                </template>

                <div v-if="loginResponse" class="mt-2 p-2 bg-blue-50 border border-blue-100 rounded text-[11px] text-blue-800 break-all">
                  <strong>响应:</strong> {{ loginResponse.data.msg }}
                </div>
              </div>
            </template>
          </SettingItem>
        </div>

        <div class="mt-2 pt-4 border-t border-gray-200">
          <p class="text-[11px] text-gray-500 mb-2">遇到白屏或系统异常(Null Pointer)？</p>
          <ChromeButton block variant="danger" @click="handleClearCookies">
            🧹 清理Cookie并重新登录
          </ChromeButton>
        </div>
      </div>

      <footer class="p-3 bg-gray-50 border-t border-gray-200 text-center flex justify-between items-center text-[11px] text-gray-500">
        <span>© 2026 XDU Helper</span>
        <a href="https://github.com/lvttt/xdu-course-helper" target="_blank" class="text-blue-600 hover:underline">GitHub</a>
      </footer>
      </template>
      <template v-else>
        <div class="p-4 text-center text-gray-600">
          <h2 class="text-lg font-bold mb-2">不支持的页面</h2>
          <p>请在西电选课系统页面打开插件设置。</p>
        </div>
      </template>
    </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import ChromeSwitch from './ui/ChromeSwitch.vue'
import SettingItem from './ui/SettingItem.vue'
import ChromeButton from './ui/ChromeButton.vue'

const isSupportedSite = ref(false); 
const checkUrl = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  isSupportedSite.value = tab?.url?.includes("yjsxk.xidian.edu.cn/yjsxkapp/sys/xsxkapp/") || false;
};

const extConfig = ref({
  enableJumpXK: false,
  pageSize: 30,
  rememberMe: false,
  redirectOnError: false,
  enablePageSizeChange: false
});

const bridge = {
  async sendToMain(taskType, data = {}) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error("无法获取当前标签页");

      return await chrome.runtime.sendMessage({
        action: 'CALL_MAIN_FUNCTION',
        tabId: tab.id,
        payload: { taskType, data }
      });
    } catch (err) {
      console.error("通信失败:", err);
    }
  }
};

const isPending = ref(false);

const handleForceEnter = async () => {
  isPending.value = true;
  await bridge.sendToMain('FORCE_ENTER');
  isPending.value = false;
};

const handleClearCookies = () => {
  bridge.sendToMain('CLEAR_COOKIES');
}

const vcodeToken = ref('');
const vcodeUrl = computed(() => {
  return vcodeToken.value ? `https://yjsxk.xidian.edu.cn/yjsxkapp/sys/xsxkapp/login/vcode/image.do?vtoken=${vcodeToken.value}` : '';
});
const handleGetVcodeToken = async () => {
  const response = await bridge.sendToMain('GET_VCODE_TOKEN');
  if (response && response.data) {
    vcodeToken.value = response.data;
    return true;
  }
  return false;
};
const recognizeCaptcha = async (imageUrl) => {
    try {
        const response = await fetch(`https://api.vitphp.cn/Yzcode/?img=${encodeURIComponent(imageUrl)}`);
        const data = await response.json();

        if (data.code === 1) {
            console.log("识别结果:", data.captcha);
            return data.captcha;
        } else {
            console.error("请求错误:", data.message);
            return null;
        }
    } catch (error) {
        console.error("发生异常:", error);
        return null;
    }
}

const vcodeText = ref('');
const loginResponse = ref(null);
const handleLoginResponse = (response) => {
  console.log("登录响应:", response);
  loginResponse.value = response;

  if (response && response.data && response.data.code === "3") {
    // 验证码不正确
    handleGetVcodeToken();
    return;
  }

  setTimeout(() => {
    loginResponse.value = null;
    vcodeToken.value = '';
    vcodeText.value = '';
  }, 10000);
};
const handleLogin = async () => {
  if (!vcodeToken.value || !vcodeText.value) {
    return;
  }
  const response = await bridge.sendToMain('LOGIN_WITH_VCODE', {
    vcodeToken: vcodeToken.value,
    vcode: vcodeText.value
  });
  handleLoginResponse(response);
};
const handleAutoLogin = async () => {
  const getVcodeTokenRes = await handleGetVcodeToken();
  if (!getVcodeTokenRes) {
    console.error("获取验证码Token失败,无法进行自动登录");
    return;
  }
  const vcode = await recognizeCaptcha(vcodeUrl.value);
  console.log("开始自动登录，使用验证码Token:", vcodeToken.value, "和验证码文本:", vcode);
  const response = await bridge.sendToMain('LOGIN_WITH_VCODE', {
    vcodeToken: vcodeToken.value,
    vcode: vcode
  });
  handleLoginResponse(response);
};

onMounted(async () => {
  const savedConfig = (await bridge.sendToMain('GET_CONFIG')).data;
  if (savedConfig) {
    extConfig.value = { ...extConfig.value, ...savedConfig };
  }

  watch(extConfig, (newConfig) => {
    bridge.sendToMain('UPDATE_CONFIG', newConfig);
  }, { deep: true });

  watch(() => extConfig.value.pageSize, (newPageSize) => {
    bridge.sendToMain('UPDATE_PAGE_SIZE', newPageSize);
  });

  watch(() => extConfig.value.rememberMe, (newRememberMe) => {
    if (!newRememberMe) {
      vcodeToken.value = '';
      vcodeText.value = '';
      loginResponse.value = null;
    }
  });

  await checkUrl();
  // 监听 Tab 切换，实时更新 App 内的状态
  chrome.tabs.onActivated.addListener(checkUrl);
  chrome.tabs.onUpdated.addListener(checkUrl);
});
</script>