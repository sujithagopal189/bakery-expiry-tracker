// ============================================
// CONFIGURATION & UTILITIES
// ============================================

const API_BASE = (() => {
  const configuredUrl = (window.__BACKEND_URL__ || '').trim().replace(/\/$/, '');
  if (configuredUrl) {
    return `${configuredUrl}/api`;
  }

  if (window.location.protocol === 'file:') {
    return 'http://localhost:5000/api';
  }

  return `${window.location.protocol}//${window.location.host}/api`;
})();
const QUOTE_CHANGE_INTERVAL = 10000; // 10 seconds

// Motivational quotes
const quotes = [
  "Quality is remembered long after the price is forgotten.",
  "Fresh products create happy customers.",
  "Managing expiry today prevents wastage tomorrow.",
  "Every fresh product reflects business excellence.",
  "Freshness is the foundation of customer satisfaction.",
  "Smart inventory management maximizes profit.",
  "Quality over quantity always wins.",
  "Expiry tracking prevents business loss."
];

// Distinct color palette for all charts (12 vibrant colors)
const CHART_COLORS = [
  '#e63946', '#2a9d8f', '#e9c46a', '#457b9d',
  '#f4a261', '#264653', '#a8dadc', '#6d6875',
  '#ffb703', '#023047', '#8338ec', '#fb5607'
];

// ============================================
// PAGE DETECTION & INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const isDashboard = !!document.getElementById('sidebar') || window.location.pathname.includes('dashboard.html');
  const isLogin = !!document.getElementById('auth-form');

  if (isDashboard) {
    initializeDashboard();
  } else if (isLogin) {
    initializeLogin();
  }
});

// ============================================
// LOGIN PAGE INITIALIZATION
// ============================================

function clearAuthState() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('authMessage');
}

function showAuthError(message) {
  const authError = document.getElementById('auth-error');
  if (authError) {
    authError.textContent = message;
    authError.style.display = message ? 'block' : 'none';
  }
}

function initializeLogin() {
  clearAuthState();

  const authForm = document.getElementById('auth-form');
  if (!authForm) return;

  const pendingMessage = sessionStorage.getItem('authMessage');
  if (pendingMessage) {
    showAuthError(pendingMessage);
    sessionStorage.removeItem('authMessage');
  }

  // Toggle password visibility
  const passwordInput = document.getElementById('password');
  const togglePassword = document.getElementById('togglePassword');
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      togglePassword.classList.toggle('fa-eye');
      togglePassword.classList.toggle('fa-eye-slash');
    });
  }

  // Remember email & password logic
  const rememberCheckbox = document.getElementById('rememberMe');
  const clearBtn = document.getElementById('clearSavedBtn');
  const emailInput = document.getElementById('email');
  const storeNameInput = document.getElementById('storeName');
  const departmentInput = document.getElementById('department');

  // Load saved credentials
  const savedCreds = localStorage.getItem('savedCredentials');
  if (savedCreds) {
    try {
      const creds = JSON.parse(savedCreds);
      if (emailInput && creds.email) emailInput.value = creds.email;
      if (passwordInput && creds.password) passwordInput.value = creds.password;
      if (rememberCheckbox) rememberCheckbox.checked = true;
      if (clearBtn) clearBtn.style.display = 'inline-flex';
      
      // Only set these if they are input fields (not hidden)
      if (storeNameInput && storeNameInput.type !== 'hidden' && creds.storeName) {
        storeNameInput.value = creds.storeName;
      }
      if (departmentInput && departmentInput.type !== 'hidden' && creds.department) {
        departmentInput.value = creds.department;
      }
    } catch (e) {
      console.error('Error parsing saved credentials:', e);
    }
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      localStorage.removeItem('savedCredentials');
      if (emailInput) emailInput.value = '';
      if (passwordInput) passwordInput.value = '';
      if (rememberCheckbox) rememberCheckbox.checked = false;
      clearBtn.style.display = 'none';
      
      if (storeNameInput && storeNameInput.type !== 'hidden') storeNameInput.value = '';
      if (departmentInput && departmentInput.type !== 'hidden') departmentInput.value = '';
    });
  }

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    showAuthError('');
    const loginCard = document.querySelector('.login-card');
    if (loginCard) loginCard.classList.remove('shake');

    const submitBtn = authForm.querySelector('.login-btn');
    const submitBtnText = submitBtn ? submitBtn.querySelector('span') : null;
    const submitBtnIcon = submitBtn ? submitBtn.querySelector('i') : null;

    // Save original button state
    const originalText = submitBtnText ? submitBtnText.textContent : 'Login';
    const originalIconClass = submitBtnIcon ? Array.from(submitBtnIcon.classList) : null;

    // Set loading state
    if (submitBtn) submitBtn.disabled = true;
    if (submitBtnText) submitBtnText.textContent = 'Logging in...';
    if (submitBtnIcon) {
      submitBtnIcon.className = 'fas fa-spinner fa-spin';
    }

    const data = {
      storeName: (storeNameInput?.value || '').trim(),
      department: (departmentInput?.value || '').trim(),
      email: (emailInput?.value || '').trim(),
      password: passwordInput?.value || ''
    };

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(data)
      });

      const result = await res.json().catch(() => ({ success: false, error: 'Unable to connect to the server. Please try again.' }));

      if (res.ok && result.success) {
        // Handle remember me logic
        if (rememberCheckbox && rememberCheckbox.checked) {
          localStorage.setItem('savedCredentials', JSON.stringify(data));
        } else {
          localStorage.removeItem('savedCredentials');
        }

        // Show success state briefly
        if (submitBtnText) submitBtnText.textContent = 'Success!';
        if (submitBtnIcon) {
          submitBtnIcon.className = 'fas fa-check';
          submitBtn.style.background = 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)';
        }

        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));

        setTimeout(() => {
          window.location.replace('dashboard.html');
        }, 800);
      } else {
        const message = result.error === 'Invalid credentials' ? 'Invalid Email or Password.' : (result.error || 'Unable to connect to the server. Please try again.');
        showAuthError(message);
        
        // Shake card to notify error
        if (loginCard) {
          // Force layout reflow to restart animation
          void loginCard.offsetWidth;
          loginCard.classList.add('shake');
        }

        // Restore button state
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.style.background = '';
        }
        if (submitBtnText) submitBtnText.textContent = originalText;
        if (submitBtnIcon && originalIconClass) {
          submitBtnIcon.className = originalIconClass.join(' ');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      showAuthError('Unable to connect to the server. Please try again.');
      
      if (loginCard) {
        void loginCard.offsetWidth;
        loginCard.classList.add('shake');
      }

      // Restore button state
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.background = '';
      }
      if (submitBtnText) submitBtnText.textContent = originalText;
      if (submitBtnIcon && originalIconClass) {
        submitBtnIcon.className = originalIconClass.join(' ');
      }
    }
  });
}

// ============================================
// DASHBOARD INITIALIZATION
// ============================================

function initializeDashboard() {
  const token = localStorage.getItem('token');
  if (!token) {
    clearAuthState();
    window.location.replace('index.html');
    return;
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Initialize dashboard components
  initializeSidebar();
  initializeHeader(user);
  initializeQuoteRotation();
  initializeDateTimeDisplay();
  initializeNavigation();
  initializeNotificationButton();
  initializeReportsSection();
  initializeLogout();
  initializeProductForm();
  initializeSettings();
  initializeClickableCards();
  loadDashboardData(token);
  initializeCharts();
}

// ============================================
// SIDEBAR NAVIGATION
// ============================================

function initializeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('toggle-sidebar');
  const closeBtn = document.getElementById('close-sidebar');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.add('open');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });
  }

  // Close sidebar when clicking outside
  document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && !toggleBtn?.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

// ============================================
// HEADER & USER INFO
// ============================================

function initializeHeader(user) {
  const userNameEl = document.getElementById('current-user-name');
  const userDeptEl = document.getElementById('current-user-dept');

  if (userNameEl) {
    userNameEl.textContent = user.storeName || 'User';
  }
  if (userDeptEl) {
    userDeptEl.textContent = user.department || 'Department';
  }
}

// ============================================
// DATE & TIME DISPLAY
// ============================================

function initializeDateTimeDisplay() {
  function updateDateTime() {
    const now = new Date();
    
    // Format date
    const dateStr = now.toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    // Format time
    const timeStr = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const dateEl = document.getElementById('current-date');
    const timeEl = document.getElementById('current-time');

    if (dateEl) dateEl.textContent = dateStr;
    if (timeEl) timeEl.textContent = timeStr;
  }

  updateDateTime();
  setInterval(updateDateTime, 1000);
}

// ============================================
// QUOTE ROTATION
// ============================================

function initializeQuoteRotation() {
  const quoteEl = document.getElementById('rotating-quote');
  const timerEl = document.getElementById('quote-timer');
  
  if (!quoteEl) return;

  let currentQuoteIndex = 0;
  let countdown = QUOTE_CHANGE_INTERVAL / 1000;

  function updateQuote() {
    quoteEl.textContent = quotes[currentQuoteIndex];
    currentQuoteIndex = (currentQuoteIndex + 1) % quotes.length;
    countdown = QUOTE_CHANGE_INTERVAL / 1000;
  }

  function updateCountdown() {
    countdown--;
    if (timerEl) {
      timerEl.textContent = countdown;
    }
    if (countdown <= 0) {
      updateQuote();
    }
  }

  updateQuote();
  setInterval(updateCountdown, 1000);
}

// ============================================
// NAVIGATION & SECTION SWITCHING
// ============================================

function initializeNavigation() {
  const menuItems = document.querySelectorAll('.menu-item');

  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionName = item.dataset.section;
      if (!sectionName) return; // skip logout and items without a section
      navigateToSection(sectionName);
    });
  });
}

// ============================================
// LOGOUT FUNCTIONALITY
// ============================================

function initializeLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  const sidebarLogout = document.getElementById('sidebar-logout');

  const logout = async () => {
    const token = localStorage.getItem('token');
    clearAuthState();

    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          cache: 'no-store'
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    window.location.replace('index.html');
  };

  if (logoutBtn) logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
  if (sidebarLogout) sidebarLogout.addEventListener('click', (e) => {
    e.preventDefault();
    logout();
  });
}

// ============================================
// NOTIFICATION BUTTON — LIVE DROPDOWN
// ============================================

let notifDropdownOpen = false;
let allAlertData = { today: [], threeDays: [], expired: [] };

function initializeNotificationButton() {
  const notifBtn = document.getElementById('notification-btn');
  const dropdown = document.getElementById('notif-dropdown');
  const markAllRead = document.getElementById('notif-mark-all-read');
  const viewAll = document.getElementById('notif-view-all');
  const dashMarkRead = document.getElementById('dashboard-mark-all-read');

  if (!notifBtn || !dropdown) {
    console.warn('[Notifications] Could not find bell button or dropdown element.');
    return;
  }

  // --- Helper: open/close the dropdown ---
  function openDropdown() {
    notifDropdownOpen = true;
    // Use both class AND inline style for maximum browser compatibility
    dropdown.classList.add('open');
    dropdown.style.display = 'block';
    populateNotificationDropdown();
  }

  function closeDropdown() {
    notifDropdownOpen = false;
    dropdown.classList.remove('open');
    // After animation completes, hide fully
    setTimeout(() => {
      if (!notifDropdownOpen) dropdown.style.display = 'none';
    }, 230);
  }

  // --- Bell click: toggle dropdown ---
  notifBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (notifDropdownOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  });

  // --- Close when clicking anywhere outside the notification center ---
  document.addEventListener('click', (e) => {
    const center = document.getElementById('notification-center');
    if (notifDropdownOpen && center && !center.contains(e.target)) {
      closeDropdown();
    }
  }, true); // Use capture phase to run before other handlers

  // --- Mark all read (inside dropdown) ---
  if (markAllRead) {
    markAllRead.addEventListener('click', (e) => {
      e.stopPropagation();
      clearNotificationBadge();
      dropdown.querySelectorAll('.notif-dropdown-item').forEach(el => el.classList.remove('unread'));
      showNotification('All notifications marked as read', 'success');
    });
  }

  // --- Dashboard "mark all as read" button ---
  if (dashMarkRead) {
    dashMarkRead.addEventListener('click', () => {
      clearNotificationBadge();
      showNotification('All notifications marked as read', 'success');
    });
  }

  // --- "View all notifications" link ---
  if (viewAll) {
    viewAll.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeDropdown();
      navigateToSection('notifications');
    });
  }

  // --- Notification section filter buttons ---
  document.querySelectorAll('.notif-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.notif-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderNotificationsFullList(btn.dataset.notifFilter);
    });
  });
}


function clearNotificationBadge() {
  const badge = document.getElementById('notification-count');
  if (badge) { badge.textContent = '0'; badge.style.display = 'none'; badge.classList.remove('pulse'); }
}

function populateNotificationDropdown() {
  const body = document.getElementById('notif-dropdown-body');
  if (!body) return;

  const { today, threeDays, expired } = allAlertData;
  const all = [
    ...expired.map(p => ({ p, type: 'expired', label: 'Expired', icon: 'fa-skull-crossbones', msg: `Expired on ${new Date(p.expiryDate).toLocaleDateString()}` })),
    ...today.map(p  => ({ p, type: 'today',   label: 'Today',   icon: 'fa-calendar-day',   msg: 'Expires today!' })),
    ...threeDays.map(p => {
      const d = Math.ceil((new Date(p.expiryDate) - new Date()) / 86400000);
      return { p, type: 'expiring', label: 'Soon', icon: 'fa-hourglass-half', msg: `Expires in ${d} day${d === 1 ? '' : 's'}` };
    })
  ];

  if (all.length === 0) {
    body.innerHTML = `<div class="notif-empty"><i class="fas fa-check-circle" style="color:#4caf50;"></i>All products are fresh!</div>`;
    return;
  }

  body.innerHTML = all.slice(0, 12).map(({ p, type, icon, msg }) => `
    <div class="notif-dropdown-item unread" data-type="${type}">
      <div class="notif-di-icon ${type}"><i class="fas ${icon}"></i></div>
      <div class="notif-di-text">
        <strong>${p.name || 'Product'}</strong>
        <span>${msg}</span>
        <span class="notif-di-time">${p.category || ''}</span>
      </div>
    </div>
  `).join('');

  // Clicking an item navigates to expiry tracker
  body.querySelectorAll('.notif-dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      item.classList.remove('unread');
      const type = item.dataset.type;
      const tab = type === 'expired' ? 'expired' : type === 'today' ? 'today' : 'three-days';
      document.getElementById('notif-dropdown').classList.remove('open');
      notifDropdownOpen = false;
      navigateToSection('expiry-tracker');
      // Click matching tab
      setTimeout(() => {
        const tabBtn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
        if (tabBtn) tabBtn.click();
      }, 100);
    });
  });
}


// ============================================
// REPORTS SECTION INITIALIZATION
// ============================================

function initializeReportsSection() {
  // Wire report buttons in the full Reports section
  document.querySelectorAll('.report-full-card .btn').forEach(btn => {
    const text = btn.textContent.trim().toLowerCase();
    if (text.includes('pdf') || text.includes('generate')) {
      btn.addEventListener('click', generatePDFReport);
    } else if (text.includes('excel') || text.includes('export')) {
      btn.addEventListener('click', exportProducts);
    }
  });
  // Wire quick report buttons in the dashboard Reports widget
  document.querySelectorAll('.report-card .btn-outline').forEach(btn => {
    const text = btn.textContent.trim().toLowerCase();
    if (text.includes('pdf')) {
      btn.addEventListener('click', generatePDFReport);
    } else if (text.includes('excel') || text.includes('csv')) {
      btn.addEventListener('click', exportProducts);
    }
  });
}

function generatePDFReport() {
  if (!allProducts || allProducts.length === 0) {
    showNotification('No products to generate report for.', 'warning');
    return;
  }
  showNotification('Opening print dialog — save as PDF using your browser.', 'info');
  setTimeout(() => window.print(), 500);
}

// ============================================
// DASHBOARD DATA LOADING
// ============================================

async function loadDashboardData(token) {
  try {
    const res = await fetch(`${API_BASE}/products`, {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    });

    if (res.status === 401) {
      clearAuthState();
      sessionStorage.setItem('authMessage', 'Your session has expired. Please sign in again.');
      window.location.replace('index.html');
      return;
    }

    if (!res.ok) throw new Error('Failed to load products');

    const products = await res.json();
    const merged = mergeWithLocalProducts(products);
    allProducts = merged;

    updateSummaryCards(merged);
    updateHeroBannerStats(merged);
    displayRecentProducts(merged);
    displayFullProductList(merged);
    updateAlerts(merged);
    updateExpiryTracker(merged);
    updateCharts(merged);
    updateInventorySection(merged);
    updateNotificationsSection(merged);
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    const localProducts = getLocalProducts();
    allProducts = localProducts;
    if (localProducts.length > 0) {
      showNotification('Backend offline — showing locally saved data.', 'warning');
      updateSummaryCards(localProducts);
      updateHeroBannerStats(localProducts);
      displayRecentProducts(localProducts);
      displayFullProductList(localProducts);
      updateAlerts(localProducts);
      updateExpiryTracker(localProducts);
      updateCharts(localProducts);
      updateInventorySection(localProducts);
      updateNotificationsSection(localProducts);
    }
  }
}

// ============================================
// INVENTORY SECTION
// ============================================

function updateInventorySection(products) {
  const container = document.getElementById('inventory-content');
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = '<p style="padding:24px;text-align:center;color:#888;">No products in inventory. Add products to see inventory data.</p>';
    return;
  }

  // Aggregate stock by category
  var categoryMap = {};
  products.forEach(function(p) {
    var cat = p.category || 'Uncategorized';
    if (!categoryMap[cat]) categoryMap[cat] = { count: 0, totalQty: 0, fresh: 0, expiring: 0, expired: 0 };
    var status = getProductStatus(p.expiryDate);
    categoryMap[cat].count++;
    categoryMap[cat].totalQty += parseInt(p.quantity) || 0;
    categoryMap[cat][status.class]++;
  });

  var summaryRows = Object.entries(categoryMap).map(function(entry) {
    var cat = entry[0]; var info = entry[1];
    return '<tr>' +
      '<td><strong>' + cat + '</strong></td>' +
      '<td>' + info.count + '</td>' +
      '<td>' + info.totalQty + '</td>' +
      '<td><span class="status-badge status-fresh">' + info.fresh + '</span></td>' +
      '<td><span class="status-badge status-expiring">' + info.expiring + '</span></td>' +
      '<td><span class="status-badge status-expired">' + info.expired + '</span></td>' +
      '</tr>';
  }).join('');

  var productRows = products.map(function(p) {
    var status = getProductStatus(p.expiryDate);
    return '<tr>' +
      '<td><strong>' + (p.name || 'N/A') + '</strong></td>' +
      '<td>' + (p.category || 'N/A') + '</td>' +
      '<td>' + (p.quantity || 0) + '</td>' +
      '<td>' + (p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : 'N/A') + '</td>' +
      '<td><span class="status-badge status-' + status.class + '">' + status.text + '</span></td>' +
      '<td><button class="btn btn-small" onclick="editProduct(\'' + p.id + '\')"><i class="fas fa-edit"></i> Edit</button></td>' +
      '</tr>';
  }).join('');

  container.innerHTML =
    '<h3 style="margin-bottom:16px;color:#5d3a1a;">Inventory Summary by Category</h3>' +
    '<div class="table-container" style="margin-bottom:28px;">' +
    '<table class="products-table"><thead><tr>' +
    '<th>Category</th><th>Products</th><th>Total Qty</th>' +
    '<th>Fresh</th><th>Expiring</th><th>Expired</th>' +
    '</tr></thead><tbody>' + summaryRows + '</tbody></table></div>' +
    '<h3 style="margin-bottom:16px;color:#5d3a1a;">All Products</h3>' +
    '<div class="table-container">' +
    '<table class="products-table"><thead><tr>' +
    '<th>Product Name</th><th>Category</th><th>Quantity</th>' +
    '<th>Expiry Date</th><th>Status</th><th>Actions</th>' +
    '</tr></thead><tbody>' + productRows + '</tbody></table></div>';
}

// ============================================
// SUMMARY CARDS UPDATE — animated counters + clickable
// ============================================

function animateCounter(el, targetValue) {
  if (!el) return;
  const current = parseInt(el.textContent) || 0;
  if (current === targetValue) return;
  const duration = 600;
  const steps = 20;
  const increment = (targetValue - current) / steps;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    el.textContent = Math.round(current + increment * step);
    if (step >= steps) {
      clearInterval(timer);
      el.textContent = targetValue;
      el.classList.add('count-updated');
      setTimeout(() => el.classList.remove('count-updated'), 400);
    }
  }, duration / steps);
}

function updateSummaryCards(products) {
  const now = new Date();
  let fresh = 0;
  let expiringSoon = 0;
  let expired = 0;

  products.forEach(product => {
    const expiryDate = new Date(product.expiryDate);
    const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      expired++;
    } else if (daysLeft <= 3) {
      expiringSoon++;
    } else {
      fresh++;
    }
  });

  animateCounter(document.getElementById('total-products'), products.length);
  animateCounter(document.getElementById('fresh-products'), fresh);
  animateCounter(document.getElementById('expiring-soon'), expiringSoon);
  animateCounter(document.getElementById('expired-products'), expired);
}

// ============================================
// HERO BANNER DYNAMIC STATS
// ============================================

function updateHeroBannerStats(products) {
  const freshPctEl = document.getElementById('hero-fresh-pct');
  const wastagePctEl = document.getElementById('hero-wastage-pct');
  const totalItemsEl = document.getElementById('hero-total-items');

  if (!products.length) {
    if (freshPctEl)   freshPctEl.textContent   = '—';
    if (wastagePctEl) wastagePctEl.textContent = '—';
    if (totalItemsEl) totalItemsEl.textContent = '0';
    return;
  }

  const now = new Date();
  let fresh = 0, expired = 0, totalQty = 0;
  products.forEach(p => {
    const d = Math.ceil((new Date(p.expiryDate) - now) / 86400000);
    totalQty += parseInt(p.quantity) || 0;
    if (d < 0) expired++; else fresh++;
  });

  const freshPct  = Math.round((fresh   / products.length) * 100);
  const wastePct  = Math.round((expired / products.length) * 100);

  if (freshPctEl)   freshPctEl.textContent   = freshPct + '%';
  if (wastagePctEl) wastagePctEl.textContent = wastePct + '%';
  if (totalItemsEl) totalItemsEl.textContent = totalQty;
}


// ============================================
// RECENT PRODUCTS TABLE
// ============================================

function displayRecentProducts(products) {
  const tbody = document.getElementById('products-table-body');
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-state">
        <td colspan="7">
          <i class="fas fa-inbox"></i>
          <p>No products found. Start by adding a product.</p>
        </td>
      </tr>
    `;
    return;
  }

  // Show last 5 products
  const recentProducts = products.slice(-5).reverse();
  
  tbody.innerHTML = recentProducts.map(product => {
    const status = getProductStatus(product.expiryDate);
    return `
      <tr>
        <td><strong>${product.name || 'N/A'}</strong></td>
        <td>${product.category || 'N/A'}</td>
        <td>${new Date(product.manufacturingDate).toLocaleDateString()}</td>
        <td>${new Date(product.expiryDate).toLocaleDateString()}</td>
        <td>${product.quantity || 0}</td>
        <td><span class="status-badge status-${status.class}">${status.text}</span></td>
        <td>
          <button class="btn btn-small" onclick="editProduct('${product.id}')">Edit</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================
// FULL PRODUCT LIST
// ============================================

function displayFullProductList(products, filterStatus = '', filterSearch = '') {
  const tbody = document.getElementById('full-products-table');
  if (!tbody) return;

  let filtered = products;

  if (filterSearch) {
    const q = filterSearch.toLowerCase();
    filtered = filtered.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.supplier || '').toLowerCase().includes(q)
    );
  }

  if (filterStatus) {
    filtered = filtered.filter(p => {
      const status = getProductStatus(p.expiryDate);
      return status.class === filterStatus;
    });
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-state">
        <td colspan="8">
          <i class="fas fa-inbox"></i>
          <p>No products found.</p>
        </td>
      </tr>
    `;
    return;
  }

  const now = new Date();
  tbody.innerHTML = filtered.map(product => {
    const status = getProductStatus(product.expiryDate);
    const expiryDate = new Date(product.expiryDate);
    const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    return `
      <tr>
        <td><strong>${product.name || 'N/A'}</strong></td>
        <td>${product.category || 'N/A'}</td>
        <td>${product.manufacturingDate ? new Date(product.manufacturingDate).toLocaleDateString() : 'N/A'}</td>
        <td>${expiryDate.toLocaleDateString()}</td>
        <td>${product.quantity || 0}</td>
        <td>${daysLeft < 0 ? '<span style="color:#c62828;font-weight:600">Expired</span>' : daysLeft + ' days'}</td>
        <td><span class="status-badge status-${status.class}">${status.text}</span></td>
        <td style="display:flex;gap:6px;align-items:center;">
          <button class="btn btn-small" onclick="editProduct('${product.id}')"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn btn-small" style="background:#c62828;color:#fff;" onclick="deleteProduct('${product.id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================
// DELETE PRODUCT
// ============================================

window.deleteProduct = async (id) => {
  const product = allProducts.find(p => String(p.id) === String(id));
  if (!product) return;

  if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;

  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      showNotification(`"${product.name}" deleted.`, 'success');
      await loadDashboardData(token);
    } else {
      showNotification('Failed to delete product.', 'error');
    }
  } catch (err) {
    showNotification('Error deleting product.', 'error');
  }
};

// ============================================
// EXPORT PRODUCTS (CSV)
// ============================================

function exportProducts() {
  if (!allProducts || allProducts.length === 0) {
    showNotification('No products to export.', 'warning');
    return;
  }

  const headers = ['Name', 'Category', 'Manufacturing Date', 'Expiry Date', 'Quantity', 'Price', 'Supplier', 'Status'];
  const rows = allProducts.map(p => {
    const status = getProductStatus(p.expiryDate);
    return [
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.category || ''}"`,
      p.manufacturingDate ? new Date(p.manufacturingDate).toLocaleDateString() : '',
      p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : '',
      p.quantity || 0,
      p.price || '',
      `"${(p.supplier || '').replace(/"/g, '""')}"`,
      status.text
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bakery-products-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showNotification('Products exported successfully!', 'success');
}

// ============================================
// PRODUCT STATUS HELPER
// ============================================

function getProductStatus(expiryDate) {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { text: 'Expired', class: 'expired' };
  } else if (daysLeft <= 3) {
    return { text: 'Expiring Soon', class: 'expiring' };
  } else {
    return { text: 'Fresh', class: 'fresh' };
  }
}

// ============================================
// ALERTS UPDATE
// ============================================

function updateAlerts(products) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let expiringToday = [];
  let expiringThreeDays = [];
  let expiredProducts = [];

  products.forEach(product => {
    const expiryDate = new Date(product.expiryDate);
    const expiryDay = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
    const daysLeft = Math.ceil((expiryDay - today) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      expiredProducts.push(product);
    } else if (daysLeft === 0) {
      expiringToday.push(product);
    } else if (daysLeft <= 3) {
      expiringThreeDays.push(product);
    }
  });

  // Store for dropdown use
  allAlertData = { today: expiringToday, threeDays: expiringThreeDays, expired: expiredProducts };

  // Update alert cards on dashboard
  updateAlertCard('expiring-today', expiringToday, 'today');
  updateAlertCard('expiring-three-days', expiringThreeDays, 'expiring');
  updateAlertCard('expired-alerts', expiredProducts, 'expired');

  // Update notification badge
  var totalAlerts = expiringToday.length + expiringThreeDays.length + expiredProducts.length;
  var badge = document.getElementById('notification-count');
  var bellIcon = document.getElementById('bell-icon');
  if (badge) {
    if (totalAlerts > 0) {
      badge.textContent = totalAlerts > 99 ? '99+' : totalAlerts;
      badge.style.display = 'flex';
      badge.classList.add('pulse');
      if (bellIcon) {
        bellIcon.classList.add('bell-ring');
        setTimeout(() => bellIcon.classList.remove('bell-ring'), 800);
      }
    } else {
      badge.style.display = 'none';
      badge.classList.remove('pulse');
    }
  }

  // Update dashboard activity feed
  updateDashboardActivityFeed(expiringToday, expiringThreeDays, expiredProducts);
}

function updateDashboardActivityFeed(todayList, soonList, expiredList) {
  const container = document.getElementById('dashboard-notifications-list');
  if (!container) return;

  const all = [
    ...expiredList.map(p => ({ p, type: 'expired', icon: 'fa-skull-crossbones', title: 'Expired Product', msg: `${p.name} expired on ${new Date(p.expiryDate).toLocaleDateString()}` })),
    ...todayList.map(p   => ({ p, type: 'today',   icon: 'fa-calendar-day',   title: 'Expires Today',   msg: `${p.name} expires today — take action!` })),
    ...soonList.map(p    => {
      const d = Math.ceil((new Date(p.expiryDate) - new Date()) / 86400000);
      return { p, type: 'expiring', icon: 'fa-hourglass-half', title: 'Expiring Soon', msg: `${p.name} expires in ${d} day${d===1?'':'s'}` };
    })
  ];

  if (all.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px 20px;color:#aaa;">
        <i class="fas fa-check-circle" style="font-size:2.5rem;color:#4caf50;margin-bottom:12px;display:block;"></i>
        <strong style="color:#4caf50;display:block;margin-bottom:8px;">All Clear!</strong>
        <span>No expiry alerts. All products are fresh.</span>
      </div>`;
    return;
  }

  const iconColor = { expired: '#dc3545', today: '#ff9800', expiring: '#ff9800' };
  const borderColor = { expired: '#dc3545', today: '#ff9800', expiring: '#ff9800' };

  container.innerHTML = all.slice(0, 8).map(({ p, type, icon, title, msg }) => `
    <div class="notification-item" style="border-left-color:${borderColor[type]||'#8b4513'};">
      <div class="notification-icon" style="background:rgba(${type==='expired'?'220,53,69':'255,152,0'},0.1);color:${iconColor[type]||'#8b4513'};">
        <i class="fas ${icon}"></i>
      </div>
      <div class="notification-content">
        <h4>${title}</h4>
        <p>${msg}</p>
        <span class="notification-time">${p.category || 'Product'} · Qty: ${p.quantity || 0}</span>
      </div>
    </div>
  `).join('');
}

function updateAlertCard(elementId, products, type) {
  const container = document.getElementById(elementId);
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = '<p class="empty-alert"><i class="fas fa-check" style="color:#4caf50;margin-right:5px;"></i>No products in this category</p>';
    return;
  }

  const colMap = { expired: '#dc3545', today: '#ff9800', expiring: '#ff9800' };
  const color = colMap[type] || '#8b4513';

  container.innerHTML = products.map(p => `
    <div style="padding:10px 12px;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <strong style="color:#2c3e50;font-size:0.9rem;">${p.name}</strong><br>
        <small style="color:#888;">Expiry: ${new Date(p.expiryDate).toLocaleDateString()} · ${p.category || ''}</small>
      </div>
      <span style="font-size:0.78rem;font-weight:700;color:${color};background:${color}18;padding:3px 8px;border-radius:8px;white-space:nowrap;">
        Qty: ${p.quantity || 0}
      </span>
    </div>
  `).join('');
}

// ============================================
// EXPIRY TRACKER — Enhanced with urgency, 4 tabs, progress bars
// ============================================

function updateExpiryTracker(products) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let todayList   = [];
  let threeDays   = [];
  let weekList    = [];
  let expiredList = [];

  products.forEach(product => {
    const expiryDate = new Date(product.expiryDate);
    const expiryDay  = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
    const daysLeft   = Math.ceil((expiryDay - today) / 86400000);

    if (daysLeft < 0)       expiredList.push({ ...product, daysLeft });
    else if (daysLeft === 0) todayList.push({ ...product, daysLeft });
    else if (daysLeft <= 3) threeDays.push({ ...product, daysLeft });
    else if (daysLeft <= 7) weekList.push({ ...product, daysLeft });
  });

  // Update tab counts
  const setTabCount = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setTabCount('tab-count-today', todayList.length);
  setTabCount('tab-count-three-days', threeDays.length);
  setTabCount('tab-count-week', weekList.length);
  setTabCount('tab-count-expired', expiredList.length);

  // Update summary bar
  const setEsb = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEsb('esb-expired-count', expiredList.length);
  setEsb('esb-expiring-count', todayList.length + threeDays.length + weekList.length);
  setEsb('esb-fresh-count', products.length - expiredList.length - todayList.length - threeDays.length - weekList.length);

  const tabDataMap = { today: todayList, 'three-days': threeDays, week: weekList, expired: expiredList };

  // Remove old tab listeners and add fresh ones
  const expiryTabs = document.querySelectorAll('.tab-btn');
  expiryTabs.forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      updateExpiryTable(tabDataMap[tab] || [], tab);
    });
  });

  // Show today's expiring by default
  updateExpiryTable(todayList, 'today');
}

function getUrgencyInfo(daysLeft) {
  if (daysLeft < 0)       return { label: 'Expired',  cls: 'urgency-critical', barColor: '#dc3545', barPct: 100, dayCls: 'expired' };
  if (daysLeft === 0)     return { label: '⚡ Today',  cls: 'urgency-warning',  barColor: '#ff5722', barPct: 95,  dayCls: 'today' };
  if (daysLeft <= 1)      return { label: '🔴 1 Day',  cls: 'urgency-warning',  barColor: '#ff9800', barPct: 85,  dayCls: 'soon' };
  if (daysLeft <= 3)      return { label: '⚠ Soon',    cls: 'urgency-warning',  barColor: '#ff9800', barPct: 60,  dayCls: 'soon' };
  if (daysLeft <= 7)      return { label: '🟡 7 Days', cls: 'urgency-caution',  barColor: '#ffc107', barPct: 35,  dayCls: 'fresh' };
  return                         { label: '✅ Fresh',   cls: 'urgency-ok',       barColor: '#4caf50', barPct: 10,  dayCls: 'fresh' };
}

function updateExpiryTable(products, activeTab) {
  const tbody = document.getElementById('expiry-table-body');
  if (!tbody) return;

  if (products.length === 0) {
    const tabLabels = { today: 'expiring today', 'three-days': 'expiring in 3 days', week: 'expiring this week', expired: 'expired' };
    tbody.innerHTML = `
      <tr class="empty-state">
        <td colspan="7">
          <i class="fas fa-check-circle" style="color:#4caf50;"></i>
          <p>No products ${tabLabels[activeTab] || 'in this category'}. 🎉</p>
        </td>
      </tr>`;
    return;
  }

  const rowClass = { today: 'expiry-row-today', expired: 'expiry-row-expired expiry-row-critical' };

  tbody.innerHTML = products.map(product => {
    const daysLeft  = product.daysLeft !== undefined ? product.daysLeft : Math.ceil((new Date(product.expiryDate) - new Date()) / 86400000);
    const urgency   = getUrgencyInfo(daysLeft);
    const daysText  = daysLeft < 0 ? `${Math.abs(daysLeft)}d ago` : daysLeft === 0 ? 'Today!' : `${daysLeft}d left`;
    const rowCls    = rowClass[activeTab] || '';

    return `
      <tr class="${rowCls}">
        <td><strong>${product.name || 'N/A'}</strong></td>
        <td>${product.category || 'N/A'}</td>
        <td>${new Date(product.expiryDate).toLocaleDateString()}</td>
        <td><span class="days-left-text ${urgency.dayCls}">${daysText}</span></td>
        <td>
          <div class="urgency-bar-wrap">
            <span class="urgency-label ${urgency.cls}">${urgency.label}</span>
            <div class="urgency-bar"><div class="urgency-bar-fill" style="width:${urgency.barPct}%;background:${urgency.barColor};"></div></div>
          </div>
        </td>
        <td>${product.quantity || 0}</td>
        <td style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-small" onclick="editProduct('${product.id}')"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn btn-small" style="background:#c62828;color:#fff;" onclick="deleteProduct('${product.id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`;
  }).join('');
}


// ============================================
// NOTIFICATIONS FULL PAGE
// ============================================

function updateNotificationsSection(products) {
  // Store products for filter re-renders
  window._allProductsForNotif = products;
  renderNotificationsFullList('all');
}

function renderNotificationsFullList(filter) {
  const container = document.getElementById('notifications-full-list');
  if (!container) return;

  const products = window._allProductsForNotif || [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Build alert entries
  const entries = [];
  products.forEach(p => {
    const expiryDate = new Date(p.expiryDate);
    const expiryDay  = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
    const daysLeft   = Math.ceil((expiryDay - today) / 86400000);

    if (daysLeft < 0) {
      entries.push({ p, type: 'expired',  icon: 'fa-skull-crossbones', title: '🚨 Expired Product',  msg: `${p.name} expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft)===1?'':'s'} ago`, daysLeft });
    } else if (daysLeft === 0) {
      entries.push({ p, type: 'today',    icon: 'fa-calendar-day',     title: '⚡ Expires Today',    msg: `${p.name} expires today — immediate action required!`, daysLeft });
    } else if (daysLeft <= 3) {
      entries.push({ p, type: 'expiring', icon: 'fa-hourglass-half',   title: '⚠️ Expiring Soon',    msg: `${p.name} expires in ${daysLeft} day${daysLeft===1?'':'s'}`, daysLeft });
    }
  });

  const filtered = filter === 'all' ? entries : entries.filter(e => e.type === filter);

  if (filtered.length === 0) {
    const emptyMsg = filter === 'all' ? 'No expiry alerts! All products are fresh.' : `No ${filter} alerts.`;
    container.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:#aaa;">
        <i class="fas fa-check-circle" style="font-size:3rem;color:#4caf50;margin-bottom:16px;display:block;"></i>
        <strong style="color:#4caf50;font-size:1.1rem;display:block;margin-bottom:8px;">All Clear!</strong>
        <span>${emptyMsg}</span>
      </div>`;
    return;
  }

  const typeClass  = { expired: 'type-expired', today: 'type-today', expiring: 'type-expiring' };
  const iconColor  = { expired: '#dc3545', today: '#ff9800', expiring: '#ff9800' };
  const iconBg     = { expired: 'rgba(220,53,69,0.1)', today: 'rgba(255,152,0,0.1)', expiring: 'rgba(255,152,0,0.1)' };

  container.innerHTML = filtered.map(({ p, type, icon, title, msg }) => `
    <div class="notification-item-full ${typeClass[type]||''}" onclick="navigateToSection('expiry-tracker')" style="cursor:pointer;">
      <div class="notification-icon" style="background:${iconBg[type]};color:${iconColor[type]};">
        <i class="fas ${icon}"></i>
      </div>
      <div class="notification-content">
        <h4>${title}</h4>
        <p>${msg}</p>
        <span class="notification-time">
          ${p.category || 'Product'} &bull; Qty: ${p.quantity || 0} &bull; Expiry: ${new Date(p.expiryDate).toLocaleDateString()}
        </span>
      </div>
    </div>
  `).join('');
}

// ============================================
// CLICKABLE SUMMARY CARDS
// ============================================

function initializeClickableCards() {
  document.querySelectorAll('.clickable-card').forEach(card => {
    card.addEventListener('click', () => {
      const navSection = card.dataset.nav;
      const navTab     = card.dataset.tab;
      const navFilter  = card.dataset.filter;

      if (!navSection) return;
      navigateToSection(navSection);

      // If a specific tab is requested (expiry tracker)
      if (navTab) {
        setTimeout(() => {
          const tabBtn = document.querySelector(`.tab-btn[data-tab="${navTab}"]`);
          if (tabBtn) tabBtn.click();
        }, 120);
      }

      // If a filter is requested (product list)
      if (navFilter) {
        setTimeout(() => {
          const filterEl = document.getElementById('list-filter');
          if (filterEl) {
            filterEl.value = navFilter;
            filterEl.dispatchEvent(new Event('change'));
          }
        }, 120);
      }
    });
  });
}

// ============================================
// PRODUCT FORM
// ============================================

let allProducts = [];
let statusChart = null;
let categoryChart = null;
let stockChart = null;

function initializeProductForm() {
  const addBtn = document.getElementById('add-product-btn');
  const form = document.getElementById('add-product-form');
  const quickActionBtns = document.querySelectorAll('.quick-action-btn');

  if (addBtn) {
    addBtn.addEventListener('click', openAddProductForm);
  }

  // Wire up search / filter on dashboard section
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');
  const statusFilter = document.getElementById('status-filter');

  const applyDashboardFilters = () => {
    const q = searchInput?.value || '';
    const catVal = categoryFilter?.value || '';
    let filtered = allProducts;
    if (q) {
      const ql = q.toLowerCase();
      filtered = filtered.filter(p => (p.name||'').toLowerCase().includes(ql) || (p.category||'').toLowerCase().includes(ql));
    }
    if (catVal) {
      filtered = filtered.filter(p => p.category === catVal);
    }
    if (statusFilter?.value) {
      filtered = filtered.filter(p => getProductStatus(p.expiryDate).class === statusFilter.value);
    }
    displayRecentProducts(filtered);
  };

  if (searchInput)   searchInput.addEventListener('input', applyDashboardFilters);
  if (categoryFilter) categoryFilter.addEventListener('change', applyDashboardFilters);
  if (statusFilter)  statusFilter.addEventListener('change', applyDashboardFilters);

  // Wire up product list section search/filter
  const listSearch = document.getElementById('list-search');
  const listFilter = document.getElementById('list-filter');

  const applyListFilters = () => {
    displayFullProductList(allProducts, listFilter?.value || '', listSearch?.value || '');
  };

  if (listSearch) listSearch.addEventListener('input', applyListFilters);
  if (listFilter) listFilter.addEventListener('change', applyListFilters);

  // Wire FAB button
  const fab = document.getElementById('fab-btn');
  if (fab) fab.addEventListener('click', openAddProductForm);

  if (quickActionBtns && quickActionBtns.length) {
    // Quick action handlers mapped by button order in HTML
    var quickActionHandlers = [
      openAddProductForm,                           // Add Product
      function() { navigateToSection('inventory'); },      // View Inventory
      function() { navigateToSection('reports'); },        // Generate Report / Invoice Chart
      function() { navigateToSection('expiry-tracker'); }, // Check Expiry
      function() { exportProducts(); }                     // Export Data
    ];
    quickActionBtns.forEach(function(btn, idx) {
      if (quickActionHandlers[idx]) btn.addEventListener('click', quickActionHandlers[idx]);
    });
  }

  // View All → Product List
  var viewAllLink = document.querySelector('.view-all-link');
  if (viewAllLink) {
    viewAllLink.addEventListener('click', function(e) {
      e.preventDefault();
      navigateToSection('product-list');
    });
  }

  if (form) {
    form.addEventListener('submit', handleProductFormSubmit);
  }
}

function navigateToSection(sectionName) {
  // Hide all sections, show target
  document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
  var target = document.getElementById(sectionName + '-section');
  if (target) target.classList.add('active');

  // Sync sidebar active menu item
  document.querySelectorAll('.menu-item').forEach(function(m) {
    m.classList.remove('active');
    if (m.dataset.section === sectionName) m.classList.add('active');
  });

  // Close sidebar on mobile
  if (window.innerWidth < 768) {
    var sb = document.getElementById('sidebar');
    if (sb) sb.classList.remove('open');
  }
}

// Backward-compatible alias
function switchToSection(section) {
  navigateToSection(section);
}

function openAddProductForm() {
  // Scroll to add-product section or show form
  const addSection = document.getElementById('add-product-section');
  if (addSection) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    addSection.classList.add('active');
    // clear any edit state
    const form = document.getElementById('add-product-form');
    if (form) form.removeAttribute('data-edit-id');
    form?.reset();
  }
}

async function handleProductFormSubmit(e) {
  e.preventDefault();

  const token = localStorage.getItem('token');
  const data = {
    name: (document.getElementById('product-name').value || '').trim(),
    category: document.getElementById('product-category').value,
    quantity: document.getElementById('product-quantity').value,
    manufacturingDate: document.getElementById('product-mfg').value,
    expiryDate: document.getElementById('product-expiry').value,
    price: document.getElementById('product-price').value,
    supplier: document.getElementById('product-supplier').value,
    notes: document.getElementById('product-notes').value
  };

  // Basic validation
  if (!data.name || !data.category || !data.quantity || !data.manufacturingDate || !data.expiryDate) {
    showNotification('Please fill in all required fields.', 'error');
    return;
  }

  const form = e.target;
  const editId = form?.dataset?.editId;
  const method = editId ? 'PUT' : 'POST';
  const url = editId ? `${API_BASE}/products/${editId}` : `${API_BASE}/products`;

  const submitBtn = form?.querySelector('button[type="submit"]');
  const originalBtnHTML = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; }

  function resetBtn() {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalBtnHTML; }
  }

  function afterSaveSuccess(isEdit) {
    showNotification(isEdit ? 'Product updated successfully!' : 'Product added successfully!', 'success');
    if (editId) form.removeAttribute('data-edit-id');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Product'; }
    const sectionHeader = document.querySelector('#add-product-section .section-header h2');
    if (sectionHeader) sectionHeader.textContent = 'Add New Product';
    e.target.reset();
  }

  try {
    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      afterSaveSuccess(!!editId);
      await loadDashboardData(token);
      navigateToSection('dashboard');
    } else {
      let errMsg = 'Failed to save product.';
      try { const err = await res.json(); errMsg = err.error || errMsg; } catch(_) {}
      showNotification(errMsg + ' Saved locally as backup.', 'warning');
      resetBtn();
      saveProductLocally(data);
      await loadDashboardData(token);
      navigateToSection('dashboard');
    }
  } catch (error) {
    console.error('Error saving product:', error);
    showNotification('Backend unreachable — product saved locally.', 'warning');
    resetBtn();
    saveProductLocally(data);
    afterSaveSuccess(false);
    await loadDashboardData(token);
    navigateToSection('dashboard');
  }
}

// ============================================
// LOCAL STORAGE PRODUCT HELPERS
// ============================================

function getLocalProducts() {
  try { return JSON.parse(localStorage.getItem('localProducts') || '[]'); } catch(e) { return []; }
}

function saveProductLocally(data) {
  var localProducts = getLocalProducts();
  var newProduct = {
    id: 'local-' + Date.now(),
    isLocal: true,
    name: data.name,
    category: data.category,
    quantity: parseInt(data.quantity) || 0,
    manufacturingDate: data.manufacturingDate,
    expiryDate: data.expiryDate,
    price: data.price,
    supplier: data.supplier,
    notes: data.notes,
    createdAt: new Date().toISOString()
  };
  localProducts.push(newProduct);
  localStorage.setItem('localProducts', JSON.stringify(localProducts));
}

function mergeWithLocalProducts(serverProducts) {
  var localProducts = getLocalProducts();
  if (!localProducts.length) return serverProducts;
  var serverIds = new Set(serverProducts.map(function(p) { return String(p.id); }));
  var uniqueLocal = localProducts.filter(function(p) { return !serverIds.has(String(p.id)); });
  return serverProducts.concat(uniqueLocal);
}

// ============================================
// NOTIFICATIONS
// ============================================

function showNotification(message, type = 'info') {
  // Remove old toast if any
  const oldToast = document.getElementById('toast-notification');
  if (oldToast) oldToast.remove();

  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
  const colors = { success: '#2e7d32', error: '#c62828', info: '#1565c0', warning: '#e65100' };

  const toast = document.createElement('div');
  toast.id = 'toast-notification';
  toast.style.cssText = `
    position: fixed;
    bottom: 28px;
    right: 28px;
    z-index: 9999;
    background: ${colors[type] || colors.info};
    color: #fff;
    padding: 14px 22px;
    border-radius: 12px;
    font-family: 'Inter', sans-serif;
    font-size: 0.95rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.25);
    animation: toastSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards;
    max-width: 360px;
  `;

  // Inject keyframe once
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      @keyframes toastSlideIn {
        from { opacity: 0; transform: translateY(30px) scale(0.9); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes toastSlideOut {
        from { opacity: 1; transform: translateY(0) scale(1); }
        to   { opacity: 0; transform: translateY(30px) scale(0.9); }
      }
    `;
    document.head.appendChild(style);
  }

  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}" style="font-size:1.1rem;"></i><span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastSlideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ============================================
// CHARTS INITIALIZATION
// ============================================

function initializeCharts() {
  // Create or update charts using latest product data
  updateCharts(allProducts || []);
}

function computeCategoryData(products) {
  const map = {};
  products.forEach(p => {
    const cat = p.category || 'Uncategorized';
    map[cat] = (map[cat] || 0) + (parseInt(p.quantity) || 0);
  });
  const labels = Object.keys(map);
  const data = labels.map(l => map[l]);
  return { labels, data };
}

function computeStockData(products) {
  return computeCategoryData(products);
}

function computeStatusData(products) {
  let fresh = 0, expiring = 0, expired = 0;
  const now = new Date();
  products.forEach(p => {
    const expiry = new Date(p.expiryDate);
    const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) expired++;
    else if (daysLeft <= 3) expiring++;
    else fresh++;
  });
  return { labels: ['Fresh', 'Expiring Soon', 'Expired'], data: [fresh, expiring, expired] };
}

function updateCharts(products) {
  if (typeof Chart === 'undefined') return;

  const categoryCtx = document.getElementById('category-chart');
  const statusCtx = document.getElementById('status-chart');
  const stockCtx = document.getElementById('stock-chart');

  const cat = computeCategoryData(products);
  const status = computeStatusData(products);
  const stock = computeStockData(products);

  // --- Category (Pie) Chart — each slice gets a distinct color ---
  if (categoryCtx) {
    var catColors = cat.labels.map(function(_, i) { return CHART_COLORS[i % CHART_COLORS.length]; });
    if (categoryChart) {
      categoryChart.data.labels = cat.labels;
      categoryChart.data.datasets[0].data = cat.data;
      categoryChart.data.datasets[0].backgroundColor = catColors;
      categoryChart.update();
    } else {
      categoryChart = new Chart(categoryCtx, {
        type: 'pie',
        data: { labels: cat.labels, datasets: [{ data: cat.data, backgroundColor: catColors }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
      });
    }
  }

  // --- Status (Doughnut) Chart — fixed meaningful colors ---
  if (statusCtx) {
    var statusColors = ['#2a9d8f', '#e9c46a', '#e63946'];
    if (statusChart) {
      statusChart.data.labels = status.labels;
      statusChart.data.datasets[0].data = status.data;
      statusChart.data.datasets[0].backgroundColor = statusColors;
      statusChart.update();
    } else {
      statusChart = new Chart(statusCtx, {
        type: 'doughnut',
        data: { labels: status.labels, datasets: [{ data: status.data, backgroundColor: statusColors }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
      });
    }
  }

  // --- Stock (Bar) Chart — each bar gets a distinct color ---
  if (stockCtx) {
    var stockColors = stock.labels.map(function(_, i) { return CHART_COLORS[i % CHART_COLORS.length]; });
    if (stockChart) {
      stockChart.data.labels = stock.labels;
      stockChart.data.datasets[0].data = stock.data;
      stockChart.data.datasets[0].backgroundColor = stockColors;
      stockChart.update();
    } else {
      stockChart = new Chart(stockCtx, {
        type: 'bar',
        data: { labels: stock.labels, datasets: [{ label: 'Stock Level', data: stock.data, backgroundColor: stockColors }] },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
      });
    }
  }
}

// ============================================
// EDIT PRODUCT
// ============================================

window.editProduct = async (id) => {
  const product = allProducts.find(p => String(p.id) === String(id));
  if (!product) {
    showNotification('Product not found', 'error');
    return;
  }

  // Switch to add-product section
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const addSection = document.getElementById('add-product-section');
  if (addSection) addSection.classList.add('active');

  // Update section header
  const sectionHeader = addSection?.querySelector('.section-header h2');
  if (sectionHeader) sectionHeader.textContent = 'Edit Product';

  // Populate form fields
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
  set('product-name',     product.name);
  set('product-category', product.category);
  set('product-quantity', product.quantity);
  set('product-price',    product.price);
  set('product-supplier', product.supplier);
  set('product-notes',    product.notes);

  // Dates need to be yyyy-mm-dd
  const toDateInput = (d) => d ? new Date(d).toISOString().split('T')[0] : '';
  set('product-mfg',    toDateInput(product.manufacturingDate));
  set('product-expiry', toDateInput(product.expiryDate));

  // Mark form in edit mode
  const form = document.getElementById('add-product-form');
  if (form) form.dataset.editId = id;

  // Update submit button text
  const submitBtn = form?.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Product';

  showNotification(`Editing: ${product.name}`, 'info');
};

// ============================================
// RESPONSIVE HANDLER
// ============================================

window.addEventListener('resize', () => {
  if (window.innerWidth >= 768) {
    document.getElementById('sidebar')?.classList.remove('open');
  }
});

// ============================================
// SETTINGS MODALS
// ============================================

function initializeSettings() {
  // Helper: open / close overlays
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
  }
  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  }

  // Open buttons
  const btnAccount = document.getElementById('btn-account-settings');
  const btnNotif   = document.getElementById('btn-notif-settings');
  const btnSystem  = document.getElementById('btn-system-settings');

  if (btnAccount) btnAccount.addEventListener('click', () => {
    // Pre-fill with current user data
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const nameEl = document.getElementById('settings-store-name');
    const deptEl = document.getElementById('settings-department');
    const emailEl = document.getElementById('settings-email');
    if (nameEl)  nameEl.value  = user.storeName   || '';
    if (deptEl)  deptEl.value  = user.department   || '';
    if (emailEl) emailEl.value = user.email        || '';
    openModal('modal-account');
  });

  if (btnNotif) btnNotif.addEventListener('click', () => {
    const prefs = JSON.parse(localStorage.getItem('notifPrefs') || '{}');
    const expiryEl = document.getElementById('settings-notif-expiry');
    const soundEl  = document.getElementById('settings-notif-sound');
    const badgeEl  = document.getElementById('settings-notif-badge');
    if (expiryEl) expiryEl.value = prefs.expiryDays || 3;
    if (soundEl)  soundEl.value  = prefs.sound      || 'on';
    if (badgeEl)  badgeEl.value  = prefs.badge      || 'on';
    openModal('modal-notif');
  });

  if (btnSystem) btnSystem.addEventListener('click', () => {
    const sys = JSON.parse(localStorage.getItem('systemSettings') || '{}');
    const threshEl = document.getElementById('settings-expiry-threshold');
    const fmtEl    = document.getElementById('settings-date-format');
    const themeEl  = document.getElementById('settings-theme');
    if (threshEl) threshEl.value = sys.expiryThreshold || 3;
    if (fmtEl)    fmtEl.value    = sys.dateFormat      || 'en-IN';
    if (themeEl)  themeEl.value  = sys.theme           || 'light';
    openModal('modal-system');
  });

  // Close buttons (X icon and Cancel buttons with data-close-modal)
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });

  // Close on overlay click
  document.querySelectorAll('.settings-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Save — Account
  const saveAccount = document.getElementById('btn-save-account');
  if (saveAccount) saveAccount.addEventListener('click', () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const storeName  = document.getElementById('settings-store-name')?.value.trim();
    const department = document.getElementById('settings-department')?.value.trim();
    const email      = document.getElementById('settings-email')?.value.trim();
    if (storeName)  user.storeName  = storeName;
    if (department) user.department = department;
    if (email)      user.email      = email;
    localStorage.setItem('user', JSON.stringify(user));
    // Reflect immediately in header
    const nameEl = document.getElementById('current-user-name');
    const deptEl = document.getElementById('current-user-dept');
    if (nameEl && storeName)  nameEl.textContent = storeName;
    if (deptEl && department) deptEl.textContent = department;
    closeModal('modal-account');
    showNotification('Account settings saved!', 'success');
  });

  // Save — Notifications
  const saveNotif = document.getElementById('btn-save-notif');
  if (saveNotif) saveNotif.addEventListener('click', () => {
    const prefs = {
      expiryDays: parseInt(document.getElementById('settings-notif-expiry')?.value) || 3,
      sound: document.getElementById('settings-notif-sound')?.value || 'on',
      badge: document.getElementById('settings-notif-badge')?.value || 'on'
    };
    localStorage.setItem('notifPrefs', JSON.stringify(prefs));
    closeModal('modal-notif');
    showNotification('Notification preferences saved!', 'success');
  });

  // Save — System
  const saveSystem = document.getElementById('btn-save-system');
  if (saveSystem) saveSystem.addEventListener('click', () => {
    const sys = {
      expiryThreshold: parseInt(document.getElementById('settings-expiry-threshold')?.value) || 3,
      dateFormat: document.getElementById('settings-date-format')?.value || 'en-IN',
      theme: document.getElementById('settings-theme')?.value || 'light'
    };
    localStorage.setItem('systemSettings', JSON.stringify(sys));
    closeModal('modal-system');
    showNotification('System settings saved!', 'success');
  });
}
