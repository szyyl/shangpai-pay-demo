// State Management
let state = {
  currentState: 'entry', // 'entry', 'pricing', 'checkout', 'success'
  entryScenario: 'quota', // 'quota', 'profile'
  pricingMode: 'subscription', // 'subscription', 'token'
  selectedPlan: 'monthly', // 'weekly', 'monthly', 'pack-a', 'pack-b', 'pack-c'
  paymentMethod: 'wechat', // 'wechat', 'alipay'
  userIsVIP: false,
  vipType: null, // 'subscription' or 'token'
  tokensRemaining: 0,
  history: [],
  photosGenerated: 0
};

// Available Pricing Data
const plansData = {
  subscription: {
    weekly: { name: '商拍专业版 - 周度订阅', price: 0.99, originalPrice: 9.99, period: '/周', desc: '适合短期尝鲜<br><span class="plan-badge-inline">每周 600 点</span>' },
    monthly: { name: '商拍专业版 - 月度订阅', price: 2.99, originalPrice: 29.99, period: '/月', desc: '尊享全套特权<br><span class="plan-badge-inline">每月无限生成</span>', hot: true }
  },
  token: {
    'pack-a': { name: '500 点算力包', price: 1.99, val: 500, desc: '约可生成 50 张超清场景图', unitDesc: '约合 $0.004/点' },
    'pack-b': { name: '1200 点算力包', price: 4.99, val: 1200, desc: '加赠 200 算力点，多机批量生成', unitDesc: '约合 $0.004/点', hot: true },
    'pack-c': { name: '2500 点算力包', price: 9.99, val: 2500, desc: '加赠 500 算力点，商业摄影工作室首选', unitDesc: '约合 $0.004/点' }
  }
};

// UI Elements
const appContainer = document.getElementById('app-container');
const logBody = document.getElementById('log-body');
const statusTime = document.getElementById('status-time');

// Update Phone Status Bar Time
function updateStatusBarTime() {
  const now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  hours = hours < 10 ? '0' + hours : hours;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  statusTime.textContent = `${hours}:${minutes}`;
}
setInterval(updateStatusBarTime, 1000);
updateStatusBarTime();

// Event Logger Utility
function addLog(message, type = 'info') {
  const logItem = document.createElement('div');
  logItem.className = `log-item event-${type}`;
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  logItem.textContent = `[${timeStr}] ${message}`;
  logBody.appendChild(logItem);
  logBody.scrollTop = logBody.scrollHeight;
}

// Navigation / Screen Renderer Router
function navigateTo(screenName) {
  state.currentState = screenName;
  renderScreen(screenName);
  updateFlowchartState(screenName);
}

// Update Left Panel Flow Chart Node Highlights
function updateFlowchartState(screenName) {
  // Clear all
  document.querySelectorAll('.flow-node').forEach(node => {
    node.className = 'flow-node';
  });

  const nodeEntry = document.getElementById('node-entry');
  const nodePricing = document.getElementById('node-pricing');
  const nodeCheckout = document.getElementById('node-checkout');
  const nodeSuccess = document.getElementById('node-success');

  if (screenName === 'entry') {
    nodeEntry.classList.add('active');
    addLog('手机端进入 APP 入口页面', 'click');
  } else if (screenName === 'pricing') {
    nodeEntry.classList.add('completed');
    nodePricing.classList.add('active');
    addLog(`展示权益与资费方案选择 (模式: ${state.pricingMode === 'subscription' ? '订阅会员' : '算力充值'})`, 'click');
  } else if (screenName === 'checkout') {
    nodeEntry.classList.add('completed');
    nodePricing.classList.add('completed');
    nodeCheckout.classList.add('active');
    addLog(`呼起收银台底部支付弹窗 (方案: ${getSelectedPlanName()})`, 'click');
  } else if (screenName === 'success') {
    nodeEntry.classList.add('completed');
    nodePricing.classList.add('completed');
    nodeCheckout.classList.add('completed');
    nodeSuccess.classList.add('active');
    addLog('支付成功，展现订单信息与退款细则', 'payment');
  }
}

// Helper to get selected plan details
function getSelectedPlanName() {
  const category = plansData[state.pricingMode];
  return category[state.selectedPlan] ? category[state.selectedPlan].name : '未知套餐';
}

function getSelectedPlanPrice() {
  const category = plansData[state.pricingMode];
  return category[state.selectedPlan] ? category[state.selectedPlan].price : 0;
}

// Screen Rendering Engine
function renderScreen(screenName) {
  // Remove dark mode class by default
  document.querySelector('.phone-screen').classList.remove('app-dark-mode');
  
  if (screenName === 'entry') {
    if (state.entryScenario === 'quota') {
      renderWorkspaceScreen();
    } else {
      renderProfileScreen();
    }
  } else if (screenName === 'pricing') {
    document.querySelector('.phone-screen').classList.add('app-dark-mode');
    renderPricingScreen();
  } else if (screenName === 'checkout') {
    // Checkout is represented as pricing screen with overlay active
    document.querySelector('.phone-screen').classList.add('app-dark-mode');
    renderPricingScreen(true); // render pricing with checkout sheet open
  } else if (screenName === 'success') {
    renderSuccessScreen();
  }
}

// --- Specific Screen Builders ---

// 1. Generation Workspace (Entry)
function renderWorkspaceScreen() {
  const isVIP = state.userIsVIP;
  const isSubscription = state.vipType === 'subscription';
  const hasToken = state.vipType === 'token' && state.tokensRemaining > 0;
  
  let quotaHTML = '';
  let canvasHTML = '';
  
  if (isVIP) {
    if (isSubscription) {
      quotaHTML = `
        <div class="quota-indicator-bar">
          <span class="quota-label">商拍专业版 - 无限生成特权已激活</span>
          <span class="quota-value has-quota">无限次</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width: 100%; background: var(--vip-gold);"></div></div>
      `;
    } else {
      const percentage = Math.min(100, (state.tokensRemaining / 2500) * 100);
      quotaHTML = `
        <div class="quota-indicator-bar">
          <span class="quota-label">算力剩余点数</span>
          <span class="quota-value has-quota">${state.tokensRemaining} 算力</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width: ${percentage}%; background: var(--success-color);"></div></div>
      `;
    }
  } else {
    quotaHTML = `
      <div class="quota-indicator-bar">
        <span class="quota-label">免费试用额度已消耗完</span>
        <span class="quota-value">0 / 3 次</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width: 100%; background: #ef4444;"></div></div>
    `;
  }

  // Predefined gorgeous product mockup SVGs for demoing commercial output
  if (state.photosGenerated > 0) {
    canvasHTML = `
      <div class="generated-grid">
        <div class="grid-item">
          <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; background: linear-gradient(to bottom, #dbeafe, #eff6ff);">
            <rect x="30" y="30" width="40" height="50" rx="4" fill="#1e293b" />
            <ellipse cx="50" cy="50" rx="12" ry="6" fill="#e2b053" />
            <circle cx="50" cy="15" r="4" fill="#f87171" opacity="0.8"/>
            <text x="50" y="70" fill="#fff" font-size="6" text-anchor="middle">AI SHOT 1</text>
          </svg>
        </div>
        <div class="grid-item">
          <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; background: linear-gradient(to bottom, #fef3c7, #fffbef);">
            <rect x="35" y="25" width="30" height="55" rx="6" fill="#0f172a" />
            <path d="M35 50 h30 v6 h-30 z" fill="#f59e0b" />
            <text x="50" y="70" fill="#fff" font-size="6" text-anchor="middle">AI SHOT 2</text>
          </svg>
        </div>
        <div class="grid-item">
          <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; background: linear-gradient(to bottom, #ecfdf5, #f0fdf4);">
            <rect x="30" y="35" width="40" height="40" rx="20" fill="#334155" />
            <text x="50" y="60" fill="#fff" font-size="6" text-anchor="middle">AI SHOT 3</text>
          </svg>
        </div>
        <div class="grid-item">
          <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; background: linear-gradient(to bottom, #fce7f3, #fdf2f8);">
            <circle cx="50" cy="50" r="25" fill="#1e1b4b" />
            <text x="50" y="53" fill="#fbcfe8" font-size="5" text-anchor="middle">COSMETIC</text>
          </svg>
        </div>
      </div>
    `;
  } else {
    canvasHTML = `
      <div class="canvas-placeholder">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <span>AI 智能商品背景生成</span>
        <p>上传您的产品图，秒级合成高保真商业大片</p>
      </div>
    `;
  }

  appContainer.innerHTML = `
    <div class="screen active">
      <header class="workspace-header">
        <div class="logo-text" style="font-weight: 800; font-size: 16px; color: #0f172a; display: flex; align-items: center; gap: 6px;">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          商拍大师
        </div>
        <div class="user-profile-badge" onclick="navigateToProfile()">
          ${isVIP ? `<span class="vip-badge-mini">PRO VIP</span>` : ''}
          <div class="user-avatar">U</div>
        </div>
      </header>

      <div class="workspace-content">
        <h2 class="workspace-title">智能场景工作室</h2>
        <p class="workspace-desc">当前场景：简约大理石背景（数码配件）</p>

        <div class="image-canvas">
          ${canvasHTML}
        </div>

        <div class="canvas-actions">
          ${quotaHTML}
          <button class="action-btn" onclick="handleGeneratePhoto()">一键生成场景大片</button>
        </div>
      </div>

      <!-- Quota Exhausted Modal Sheet inside Phone -->
      <div class="quota-modal-overlay" id="quota-modal">
        <div class="quota-modal">
          <div class="modal-header">
            <div class="modal-title-row">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm0-4h-2V7h2v8z"/></svg>
              <span class="modal-title">免费额度已耗尽</span>
            </div>
            <button class="modal-close-btn" onclick="closeQuotaModal()">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="modal-body-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12 2L2 22h20L12 2zm0 3.99L19.53 19H4.47L12 5.99zM13 16h-2v2h2v-2zm0-6h-2v4h2v-4z"/></svg>
            </div>
            <div class="modal-bold-text">体验试用次数已使用完毕</div>
            <div class="modal-sub-text">升级权益或者充值算力包，为您的产品业务快速生产商用宣传图</div>
          </div>
          <button class="modal-action-btn" onclick="goToUpgrade()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            立即升级商拍专业版
          </button>
          <button class="modal-cancel-btn" onclick="closeQuotaModal()" style="margin-top: 10px; background: transparent; border: 1px solid #e2e8f0; color: #64748b; width: 100%; border-radius: 12px; padding: 12px; font-size: 13px; font-weight: 600; cursor: pointer;">
            暂不升级
          </button>
        </div>
      </div>
    </div>
  `;
}

// Handle Photo Generation Simulator Click
function handleGeneratePhoto() {
  if (state.userIsVIP) {
    if (state.vipType === 'token') {
      if (state.tokensRemaining < 10) {
        addLog('算力点数不足，提示充值', 'click');
        alert('您的算力余额不足 10 点，无法进行单次场景生成，请及时充值！');
        navigateTo('pricing');
        return;
      }
      state.tokensRemaining -= 10;
      addLog(`扣除 10 点算力。当前剩余：${state.tokensRemaining} 算力`, 'payment');
    }
    
    // Animate quota bar
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill && state.vipType === 'token') {
      const percentage = Math.min(100, (state.tokensRemaining / 2500) * 100);
      progressFill.style.width = `${percentage}%`;
    }

    addLog('调用 AI 渲染算法生成场景图中...', 'info');
    state.photosGenerated = 1;
    
    // Simulate generation loading indicator
    const btn = document.querySelector('.action-btn');
    const originalText = btn.textContent;
    btn.textContent = '渲染中 (1.5s)...';
    btn.disabled = true;
    
    setTimeout(() => {
      renderWorkspaceScreen();
      addLog('大理石场景图生成成功！', 'info');
    }, 1200);

  } else {
    addLog('点击生成按钮，触发[免费额度用完]弹窗提示', 'click');
    openQuotaModal();
  }
}

function openQuotaModal() {
  document.getElementById('quota-modal').classList.add('active');
}

function closeQuotaModal() {
  document.getElementById('quota-modal').classList.remove('active');
}

function goToUpgrade() {
  closeQuotaModal();
  navigateTo('pricing');
}

function navigateToProfile() {
  addLog('点击用户头像进入个人中心', 'click');
  state.entryScenario = 'profile';
  
  // Sync sidebar selector UI
  document.getElementById('config-entry-quota').classList.remove('active');
  document.getElementById('config-entry-profile').classList.add('active');
  
  navigateTo('entry');
}

// 2. Profile Page (Entry Option 2)
function renderProfileScreen() {
  const isVIP = state.userIsVIP;
  let vipBannerHTML = '';

  if (isVIP) {
    const detailText = state.vipType === 'subscription' 
      ? '订阅无限生成会员 • 有效期内' 
      : `算力包充值用户 • 剩余算力: ${state.tokensRemaining}点`;
    vipBannerHTML = `
      <div class="vip-card-banner" style="background: linear-gradient(135deg, #162421 0%, #0c1412 100%); border-color: rgba(16, 185, 129, 0.2);">
        <div class="vip-card-title">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="color: var(--success-color);"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          <span style="color: #fff;">专业版尊享中</span>
        </div>
        <div class="vip-card-desc" style="color: #a7f3d0;">${detailText}</div>
        <button class="vip-card-btn" style="background: linear-gradient(135deg, #a7f3d0 0%, #10b981 100%); color: #042f1a;" onclick="navigateTo('pricing')">查看资费</button>
      </div>
    `;
  } else {
    vipBannerHTML = `
      <div class="vip-card-banner" onclick="navigateTo('pricing')">
        <div class="vip-card-title">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="color: #e2b053;"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
          <span>升级商拍专业版 VIP</span>
        </div>
        <div class="vip-card-desc">解锁无限大图生成、超清画质无水印导出、批量生成等全套商业功能特权。</div>
        <button class="vip-card-btn">立即升级</button>
      </div>
    `;
  }

  appContainer.innerHTML = `
    <div class="screen active">
      <header class="profile-header">
        <button class="back-btn" onclick="backToWorkspace()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div class="profile-avatar-large">U</div>
        <div class="profile-user-info">
          <div class="profile-name">商拍用户_8954</div>
          <div class="profile-status">${isVIP ? '商拍高级会员' : '免费普通账户'}</div>
        </div>
      </header>

      <div class="profile-content">
        ${vipBannerHTML}

        <div class="profile-menu">
          <div class="menu-item">
            <span>我的商大照片集</span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
          <div class="menu-item" onclick="navigateTo('pricing')">
            <span>资费与充值说明</span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
          <div class="menu-item">
            <span>客服与退款指南</span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
          <div class="menu-item" onclick="resetUserVIPState()" style="color: #ef4444; border-top: 1px solid #f1f5f9;">
            <span>重置为免费账户 (演示专用)</span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="color: #ef4444;"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
        </div>
      </div>
    </div>
  `;
}

function backToWorkspace() {
  state.entryScenario = 'quota';
  
  // Sync sidebar selector UI
  document.getElementById('config-entry-quota').classList.add('active');
  document.getElementById('config-entry-profile').classList.remove('active');
  
  navigateTo('entry');
}

// 3. Pricing / Selection Screen
function renderPricingScreen(isCheckoutActive = false) {
  const mode = state.pricingMode;
  let plansHTML = '';
  
  if (mode === 'subscription') {
    // Subscription Mode Cards
    const subPlans = plansData.subscription;
    Object.keys(subPlans).forEach(key => {
      const plan = subPlans[key];
      const isActive = state.selectedPlan === key;
      plansHTML += `
        <div class="plan-card ${isActive ? 'active' : ''}" onclick="selectPlan('${key}')">
          ${plan.hot ? `<span class="plan-badge">HOT 爆款</span>` : ''}
          <div class="plan-name">${plan.name.replace('商拍专业版 - ', '')}</div>
          <div class="plan-price-row">
            <span class="plan-currency">$</span>
            <span class="plan-price">${plan.price}</span>
            <span class="plan-period">${plan.period}</span>
          </div>
          <div class="plan-original-price">$${plan.originalPrice}</div>
          <div class="plan-unit-desc">${plan.desc}</div>
        </div>
      `;
    });
  } else {
    // Token Mode Cards
    const tokenPlans = plansData.token;
    Object.keys(tokenPlans).forEach(key => {
      const plan = tokenPlans[key];
      const isActive = state.selectedPlan === key;
      plansHTML += `
        <div class="plan-card ${isActive ? 'active' : ''}" onclick="selectPlan('${key}')">
          ${plan.hot ? `<span class="plan-badge">多增超值</span>` : ''}
          <div class="plan-name">${plan.name}</div>
          <div class="plan-price-row">
            <span class="plan-currency">$</span>
            <span class="plan-price">${plan.price}</span>
          </div>
          <div class="plan-original-price">单次性价比高</div>
          <div class="plan-unit-desc">${plan.desc}</div>
          <div class="plan-original-price" style="text-decoration:none; color: var(--vip-gold); margin-top:4px;">${plan.unitDesc}</div>
        </div>
      `;
    });
  }

  // Quota description content based on choice
  const quotaNoticeDesc = mode === 'subscription'
    ? '<strong>额度说明：</strong>订阅有效期内，不限生成次数，支持极速通道；若会员到期，系统将退回免费账号额度。'
    : '<strong>额度说明：</strong>算力属于消耗制虚拟点数，长期有效，不设有效期。每次生成背景图扣除 10 点，支持多台设备共享消耗。';

  const checkoutOverlayHTML = isCheckoutActive ? getCheckoutOverlayHTML() : '';

  appContainer.innerHTML = `
    <div class="screen active pricing-screen">
      <header class="pricing-header">
        <button class="back-btn" onclick="backToEntry()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <span style="font-weight: 700; font-size: 15px;">商拍大师 VIP 权益</span>
        <div style="width: 20px;"></div> <!-- placeholder balance -->
      </header>

      <div class="pricing-scroll-area">
        <div class="pricing-hero">
          <h2>升级 <span class="gold-text">商拍专业版 VIP</span></h2>
          <p>您掌上的专业影棚，每月立省200美金</p>
        </div>

        <div class="pricing-tabs">
          <button class="tab-btn ${mode === 'subscription' ? 'active' : ''}" onclick="setPricingMode('subscription')">包周/包月订阅制</button>
          <button class="tab-btn ${mode === 'token' ? 'active' : ''}" onclick="setPricingMode('token')">按量充值 算力包</button>
        </div>

        <div class="plans-grid">
          ${plansHTML}
        </div>

        <div class="benefits-section">
          <div class="benefits-title">VIP 尊享特权一览</div>
          
          <div class="benefit-item">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            <div><strong>全量功能</strong>：解锁所有高级 AI 编辑与背景合成工具。</div>
          </div>
          <div class="benefit-item">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            <div><strong>极速通道</strong>：订阅期间无需排队，多机并发生成。</div>
          </div>
          <div class="benefit-item">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            <div><strong>4K超清</strong>：直出印刷级商用图，免除复杂二次修图。</div>
          </div>
          <div class="benefit-item">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            <div><strong>商业版权</strong>：商用免责，自由投放到：instagram、whatsapp和电商平台。</div>
          </div>
        </div>

        <div class="quota-desc-box">
          ${quotaNoticeDesc}
        </div>
      </div>

      <div class="pricing-footer">
        <button class="pay-action-btn" onclick="openCheckoutSheet()">立即付款升级</button>
      </div>

      <!-- Checkout bottom sheet -->
      ${checkoutOverlayHTML}
    </div>
  `;
}

function backToEntry() {
  navigateTo('entry');
}

function selectPlan(planKey) {
  state.selectedPlan = planKey;
  addLog(`用户切换选择方案为: ${plansData[state.pricingMode][planKey].name}`, 'click');
  renderPricingScreen();
}

function openCheckoutSheet() {
  navigateTo('checkout');
}

function closeCheckoutSheet() {
  navigateTo('pricing');
}

// 4. Checkout Overlay Panel Details
function getCheckoutOverlayHTML() {
  const planName = getSelectedPlanName();
  const planPrice = getSelectedPlanPrice();
  const method = state.paymentMethod;

  return `
    <div class="checkout-overlay active" id="checkout-overlay">
      <div class="checkout-sheet">
        <div class="checkout-header">
          <span class="checkout-title">确认支付收银台</span>
          <button class="checkout-close" onclick="closeCheckoutSheet()">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div class="checkout-summary">
          <div class="summary-details">
            <span class="summary-name">${planName}</span>
            <span class="summary-sub">绑定账户: 商拍用户_8954</span>
          </div>
          <span class="summary-price">$${planPrice}</span>
        </div>

        <div class="checkout-payment-methods">
          <div class="method-row ${method === 'wechat' ? 'active' : ''}" onclick="selectPaymentMethod('wechat')">
            <div class="method-info">
              <!-- WeChat SVG Icon -->
              <svg viewBox="0 0 24 24" width="22" height="22" fill="#09bb07" style="flex-shrink:0;"><path d="M12.015 11.53c.12 0 .243-.005.362-.016.035.792-.472 1.488-1.22 1.636a1.442 1.442 0 0 1-1.634-1.077c-.126-.525.093-1.075.529-1.353a1.482 1.482 0 0 1 1.963.81zm-3.08-1.785a.72.72 0 1 0 0 1.44.72.72 0 0 0 0-1.44zm6.185.008a.72.72 0 1 0 0 1.44.72.72 0 0 0 0-1.44zM24 10.97c0-5.184-5.074-9.39-11.332-9.39C6.41 1.58 1.336 5.786 1.336 10.97c0 2.85 1.53 5.393 3.93 7.126l-.993 3.037 3.328-1.688a12.756 12.756 0 0 0 5.067 1.055C18.927 20.5 24 16.236 24 10.97zM7.5 13.916c-.958 0-1.734-.848-1.734-1.895s.776-1.895 1.734-1.895S9.234 11 9.234 12.021s-.776 1.895-1.734 1.895zm6.52-.008c-.957 0-1.734-.848-1.734-1.895s.777-1.895 1.734-1.895 1.735.848 1.735 1.895-.778 1.895-1.735 1.895z"/></svg>
              <span class="method-name">微信支付 WeChat Pay</span>
            </div>
            <div class="radio-circle"></div>
          </div>

          <div class="method-row ${method === 'alipay' ? 'active' : ''}" onclick="selectPaymentMethod('alipay')">
            <div class="method-info">
              <!-- Alipay SVG Icon -->
              <svg viewBox="0 0 24 24" width="22" height="22" fill="#108ee9" style="flex-shrink:0;"><path d="M12.443.087C5.83.087.447 5.47.447 12.083s5.383 11.996 11.996 11.996 11.996-5.383 11.996-11.996S19.056.087 12.443.087zm3.17 17.522h-1.57s-.358-.887-.55-1.343h-2.585c-.208.456-.575 1.343-.575 1.343H8.79s1.884-4.57 2.37-5.748c-.687-.24-1.706-.52-1.706-.52l.272-.943s1.298.36 2.067.575c.575-1.28 1.058-2.675 1.058-2.675H9.287v-.973h4.15v-.806h-3.41v-.972h3.41V4.873h1.026v1.732h3.364v.972H14.47v.806h3.94v.973H13.91s-.416 1.157-.96 2.392c.983.336 2.502.83 2.502.83l-.336.953s-1.127-.4-2.127-.723c-.42.973-1.378 3.197-1.378 3.197h2.643s.473-.996.657-1.42h1.569c-.19 1.117-.838 4.248-.838 4.248z"/></svg>
              <span class="method-name">支付宝支付 AliPay</span>
            </div>
            <div class="radio-circle"></div>
          </div>
        </div>

        <button class="checkout-btn" id="confirm-checkout-btn" onclick="executePayment()">
          确认支付 $${planPrice}
        </button>
      </div>
    </div>
  `;
}

function selectPaymentMethod(methodName) {
  state.paymentMethod = methodName;
  addLog(`用户更改支付渠道为: ${methodName === 'wechat' ? '微信支付' : '支付宝'}`, 'click');
  renderPricingScreen(true);
}

// Simulate Payment Process (Delay and API success)
function executePayment() {
  const btn = document.getElementById('confirm-checkout-btn');
  btn.disabled = true;
  btn.className = 'checkout-btn processing';
  btn.innerHTML = `
    <svg class="spinner" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" style="margin-right:8px;">
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)"></circle>
      <path d="M12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.0434 16.4522" stroke-linecap="round"></path>
    </svg>
    正在唤起安全支付...
  `;
  
  addLog(`向系统支付网关发出请求，开始充值流水认证...`, 'info');

  setTimeout(() => {
    btn.innerHTML = `
      <svg class="spinner" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" style="margin-right:8px;">
        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)"></circle>
        <path d="M12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.0434 16.4522" stroke-linecap="round"></path>
      </svg>
      支付成功，同步返回订单凭证...
    `;
    addLog(`支付扣款成功。商拍服务器响应，订单号已确认。`, 'payment');
    
    // Update State upon successful payment
    state.userIsVIP = true;
    state.vipType = state.pricingMode;
    if (state.pricingMode === 'token') {
      const tokensToAdd = plansData.token[state.selectedPlan].val;
      state.tokensRemaining += tokensToAdd;
      addLog(`算力充值成功！账户新增 ${tokensToAdd} 算力点。`, 'payment');
    } else {
      addLog(`专业版无限生成订阅权限已生效。`, 'payment');
    }

    setTimeout(() => {
      navigateTo('success');
    }, 500);

  }, 1500);
}

// 5. Success Screen
function renderSuccessScreen() {
  const price = getSelectedPlanPrice();
  const planName = getSelectedPlanName();
  const methodText = state.paymentMethod === 'wechat' ? '微信支付' : '支付宝';
  
  const orderNum = `SP${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const now = new Date();
  const timeText = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

  appContainer.innerHTML = `
    <div class="screen active success-screen">
      <div class="success-scroll-area">
        <div class="success-animation-box">
          <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        
        <h2 class="success-title">支付成功</h2>
        <p class="success-sub">您已成功解锁商拍专业版特权</p>

        <!-- Receipt Table -->
        <div class="receipt-card">
          <div class="receipt-row">
            <span class="receipt-label">交易品类</span>
            <span class="receipt-value">${planName}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">支付金额</span>
            <span class="receipt-value price">$${price}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">支付渠道</span>
            <span class="receipt-value">${methodText}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">订单编号</span>
            <span class="receipt-value" style="font-family: monospace; font-size: 11px;">${orderNum}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">交易时间</span>
            <span class="receipt-value" style="font-size: 11px;">${timeText}</span>
          </div>
        </div>

        <!-- Refund Logic Details Accordion -->
        <div class="accordion" id="refund-accordion">
          <div class="accordion-header" onclick="toggleAccordion()">
            <span>商拍专业版退款及售后声明</span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
          <div class="accordion-content">
            <p><strong>1. 7天退款政策 (适用于订阅制)：</strong>若支付后 7 天内，该账户未产生任何“超清商业背景图生成”记录，可申请全额退款。一旦产生了正式商业渲染记录，则视作服务已激活使用，不支持退款。</p>
            <p style="margin-top: 8px;"><strong>2. 算力点数充值政策：</strong>算力包属于即时入账的虚拟消耗品，一经充值订单不支持退款。已消耗的算力点数不予退回。</p>
            <p style="margin-top: 8px;"><strong>3. 客服途径：</strong>如对账单或生成质量有异议，可在个人中心点击“客服指南”联系商拍官方运营组处理。</p>
          </div>
        </div>

        <div class="success-footer">
          <button class="success-btn" onclick="finishPaymentFlow()">返回智能生成中心</button>
        </div>
      </div>
    </div>
  `;
}

function toggleAccordion() {
  const accordion = document.getElementById('refund-accordion');
  accordion.classList.toggle('open');
  addLog('用户展开/折叠退款与售后规则详情', 'click');
}

function finishPaymentFlow() {
  addLog('支付流程流转闭环，返回生成中心首页', 'click');
  navigateTo('entry');
}

// --- Sandbox Controls Trigger Actions ---

function setEntryScenario(scenario) {
  state.entryScenario = scenario;
  
  // Highlight buttons
  document.getElementById('config-entry-quota').classList.toggle('active', scenario === 'quota');
  document.getElementById('config-entry-profile').classList.toggle('active', scenario === 'profile');
  
  addLog(`沙盒环境配置：修改模拟入口为 [${scenario === 'quota' ? '免费额度耗尽提示' : '个人中心升级入口'}]`, 'info');
  navigateTo('entry');
}

function setPricingMode(mode) {
  state.pricingMode = mode;
  
  // Reset selected plan relative to mode
  if (mode === 'subscription') {
    state.selectedPlan = 'monthly';
  } else {
    state.selectedPlan = 'pack-b';
  }

  // Sync sandbox buttons
  document.getElementById('config-mode-sub').classList.toggle('active', mode === 'subscription');
  document.getElementById('config-mode-token').classList.toggle('active', mode === 'token');

  addLog(`沙盒环境配置：切换定价模式为 [${mode === 'subscription' ? '包周/包月订阅制' : '算力充值制'}]`, 'info');
  
  // If we are currently on pricing page or checkout page, re-render immediately
  if (state.currentState === 'pricing' || state.currentState === 'checkout') {
    navigateTo(state.currentState);
  } else {
    navigateTo('pricing'); // Redirect to pricing page so the user sees the switch result
  }
}

function resetUserVIPState() {
  state.userIsVIP = false;
  state.vipType = null;
  state.tokensRemaining = 0;
  state.photosGenerated = 0;
  addLog('已将模拟账户重置为免费账户，生成额度设为 0。', 'info');
  navigateTo('entry');
}

// Initialize on Load
window.onload = function() {
  navigateTo('entry');
};
// Add support in case window.onload already fired or needs immediate execution
navigateTo('entry');
