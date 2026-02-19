<template>
  <div class="p-4 bg-gray-50 flex flex-col gap-4">
    <header class="flex items-center justify-between mb-2">
      <h1 class="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-green-500">
        XDU 选课助手
      </h1>
    </header>

    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-sm font-bold text-gray-800">启动注入模式</h2>
          <p class="text-[11px] text-gray-400">跳过时间限制直接进入选课系统</p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" v-model="extConfig.enableJumpXK" class="sr-only peer">
          <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
        </label>
      </div>

      <div v-if="extConfig.enableJumpXK" class="bg-red-50 p-2 rounded text-[11px] text-red-600 flex gap-1">
        <span>⚠️</span>
        <span>正常选课时间不建议开启。</span>
      </div>

      <button 
        @click="handleForceEnter"
        v-if="extConfig.enableJumpXK"
        :disabled="isPending"
        class="group relative w-full py-3 overflow-hidden rounded-lg bg-green-500 text-white font-bold shadow-md transition-all hover:bg-green-600 active:scale-[0.98] disabled:bg-gray-300"
      >
        <span class="relative z-10 flex items-center justify-center gap-2">
          {{ isPending ? '正在连接...' : '🚀 立即进入选课系统' }}
        </span>
      </button>
    </div>

    <div class="mt-auto pt-4 border-t border-gray-200">
      <div>
        每页显示数据条数: 
        <input 
          type="number" 
          v-model.number="extConfig.pageSize" 
          class="w-16 px-2 py-1 border rounded text-sm focus:ring-1 focus:ring-blue-300"
          min="10" max="100"
        >
      </div>
    </div>

    <!-- 获取验证码 -->
    <div class="mt-auto pt-4 border-t border-gray-200">
      <button 
        @click="handleGetVcodeToken"
        class="w-full py-2 border-2 border-gray-200 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-100 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
      >
        📄 获取验证码Token
      </button>
      <div v-if="vcodeToken" class="mt-2 p-2 bg-gray-100 rounded text-sm text-gray-700 break-all">
        <strong>验证码Token:</strong> {{ vcodeToken }}
      </div>
      <template v-if="vcodeToken">
        <img 
          :src="vcodeUrl" 
          alt="验证码图片" 
          class="mt-2 border rounded"
        >
      </template>
      <input 
        v-if="vcodeToken" 
        type="text" 
        placeholder="输入验证码文本" 
        v-model="vcodeText"
        class="mt-2 w-full px-3 py-2 border rounded focus:ring-1 focus:ring-blue-300"
      >
      <button 
        v-if="vcodeToken" 
        @click="handleLogin"
        class="mt-2 w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        登录
      </button>

      <button 
        v-if="vcodeToken" 
        @click="handleAutoLogin"
        class="mt-2 w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        自动验证码登录
      </button>
      <div v-if="loginResponse" class="mt-2 p-2 bg-gray-100 rounded text-sm text-gray-700 break-all">
        <strong>登录响应:</strong> {{ loginResponse.data.msg }}
      </div>
    </div>

    <!-- 记住账号密码 -->
    <div class="mt-auto pt-4 border-t border-gray-200">
      <div class="flex items-center gap-2">
        <input type="checkbox" id="remember" v-model="extConfig.rememberMe" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500">
        <label for="remember" class="text-sm text-gray-500">记住账号密码（只保存加密后的密码,不建议在公共电脑使用）</label>
      </div>
    </div>

    <div class="mt-auto pt-4 border-t border-gray-200">
      <div class="flex flex-col gap-2">
        <p class="text-[11px] text-gray-400 text-center mb-1">遇到白屏或系统异常(Null Pointer)？</p>
        <button 
          @click="handleClearCookies"
          class="w-full py-2 border-2 border-gray-200 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-100 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
        >
          🧹 清理Cookie并重新登录
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'

const extConfig = ref({
  enableJumpXK: false,
  pageSize: 30,
  rememberMe: false
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
const handleLogin = async () => {
  if (!vcodeToken.value || !vcodeText.value) {
    alert("请先获取验证码Token并输入验证码文本");
    return;
  }
  const response = await bridge.sendToMain('LOGIN_WITH_VCODE', {
    vcodeToken: vcodeToken.value,
    vcode: vcodeText.value
  });
  console.log("登录响应:", response);
  loginResponse.value = response;
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
  console.log("自动登录响应:", response);
  loginResponse.value = response;
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
});
</script>