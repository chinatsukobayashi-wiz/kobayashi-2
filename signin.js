// ==================== DOM REFS ====================

const $ = (sel) => document.querySelector(sel);

const stepEmail = $('#stepEmail');
const stepPassword = $('#stepPassword');
const stepWorkspace = $('#stepWorkspace');
const emailForm = $('#emailForm');
const emailInput = $('#emailInput');
const passwordForm = $('#passwordForm');
const passwordInput = $('#passwordInput');
const passwordToggle = $('#passwordToggle');
const emailDisplay = $('#emailDisplay');
const workspaceEmailDisplay = $('#workspaceEmailDisplay');
const backToEmail = $('#backToEmail');
const googleBtn = $('#googleBtn');
const appleBtn = $('#appleBtn');
const workspaceList = $('#workspaceList');

let currentEmail = '';

// ==================== STEP TRANSITIONS ====================

function showStep(targetStep) {
  [stepEmail, stepPassword, stepWorkspace].forEach(step => {
    step.classList.add('hidden');
  });
  targetStep.classList.remove('hidden');
  // Re-trigger animation
  targetStep.style.animation = 'none';
  targetStep.offsetHeight; // force reflow
  targetStep.style.animation = '';
}

// ==================== EMAIL STEP ====================

emailForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();

  // Clear previous errors
  clearError(emailInput);

  // Validate
  if (!email) {
    showError(emailInput, 'メールアドレスを入力してください');
    return;
  }

  if (!isValidEmail(email)) {
    showError(emailInput, '有効なメールアドレスを入力してください');
    return;
  }

  currentEmail = email;

  // Show loading
  const btn = $('#emailSubmitBtn');
  setLoading(btn, true);

  // Simulate API call
  setTimeout(() => {
    setLoading(btn, false);
    emailDisplay.textContent = email;
    showStep(stepPassword);
    passwordInput.focus();
  }, 1200);
});

// ==================== PASSWORD STEP ====================

passwordForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const password = passwordInput.value;

  clearError(passwordInput.closest('.password-wrapper').querySelector('input'));

  if (!password) {
    showError(passwordInput, 'パスワードを入力してください');
    return;
  }

  if (password.length < 4) {
    showError(passwordInput, 'パスワードが短すぎます');
    return;
  }

  const btn = $('#passwordSubmitBtn');
  setLoading(btn, true);

  // Simulate authentication
  setTimeout(() => {
    setLoading(btn, false);
    workspaceEmailDisplay.textContent = `${currentEmail} のワークスペース`;
    showStep(stepWorkspace);
    showToast('認証に成功しました', 'success');
  }, 1500);
});

// Password toggle
passwordToggle.addEventListener('click', () => {
  const type = passwordInput.type === 'password' ? 'text' : 'password';
  passwordInput.type = type;
  passwordToggle.style.color = type === 'text' ? '#1264a3' : '#999';
});

// Back button
backToEmail.addEventListener('click', () => {
  showStep(stepEmail);
  emailInput.focus();
});

// ==================== SOCIAL AUTH ====================

googleBtn.addEventListener('click', () => {
  setButtonLoading(googleBtn, true);
  setTimeout(() => {
    setButtonLoading(googleBtn, false);
    currentEmail = 'user@gmail.com';
    workspaceEmailDisplay.textContent = `${currentEmail} のワークスペース`;
    showStep(stepWorkspace);
    showToast('Googleアカウントで認証しました', 'success');
  }, 1500);
});

appleBtn.addEventListener('click', () => {
  setButtonLoading(appleBtn, true);
  setTimeout(() => {
    setButtonLoading(appleBtn, false);
    currentEmail = 'user@icloud.com';
    workspaceEmailDisplay.textContent = `${currentEmail} のワークスペース`;
    showStep(stepWorkspace);
    showToast('Appleアカウントで認証しました', 'success');
  }, 1500);
});

// ==================== WORKSPACE SELECT ====================

workspaceList.querySelectorAll('.workspace-option').forEach(option => {
  option.addEventListener('click', () => {
    const wsName = option.querySelector('.ws-name').textContent;

    // Add selection effect
    option.style.background = '#e8f5fa';
    option.style.borderColor = '#1264a3';

    showToast(`${wsName} に接続中...`, 'success');

    setTimeout(() => {
      // Redirect to main app
      window.location.href = 'index.html';
    }, 1200);
  });
});

// ==================== VALIDATION ====================

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showError(input, message) {
  input.classList.add('error');

  // Remove existing error
  const existing = input.closest('.form-group, .password-wrapper')?.querySelector('.form-error');
  if (existing) existing.remove();

  const errorEl = document.createElement('div');
  errorEl.className = 'form-error';
  errorEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="#e01e5a"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3a1 1 0 0 1 1 1v4a1 1 0 1 1-2 0V5a1 1 0 0 1 1-1zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg> ${message}`;

  const parent = input.closest('.form-group') || input.closest('.password-wrapper').parentElement;
  parent.appendChild(errorEl);

  // Shake input
  input.style.animation = 'none';
  input.offsetHeight;
  input.style.animation = 'shakeIn 0.3s ease';
}

function clearError(input) {
  input.classList.remove('error');
  const parent = input.closest('.form-group') || input.closest('.password-wrapper')?.parentElement;
  if (!parent) return;
  const errorEl = parent.querySelector('.form-error');
  if (errorEl) errorEl.remove();
}

// Clear errors on input
emailInput.addEventListener('input', () => clearError(emailInput));
passwordInput.addEventListener('input', () => clearError(passwordInput));

// ==================== LOADING STATES ====================

function setLoading(btn, loading) {
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loading');
  if (loading) {
    text.style.display = 'none';
    loader.style.display = 'inline-flex';
    btn.disabled = true;
  } else {
    text.style.display = '';
    loader.style.display = 'none';
    btn.disabled = false;
  }
}

function setButtonLoading(btn, loading) {
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner" style="border-color:rgba(0,0,0,0.15);border-top-color:#1d1c1d"></span>';
    btn.disabled = true;
    btn.style.justifyContent = 'center';
  } else {
    btn.innerHTML = btn.dataset.originalText;
    btn.disabled = false;
  }
}

// ==================== TOAST ====================

function showToast(message, type) {
  // Remove existing
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type || ''}`;
  toast.innerHTML = `
    ${type === 'success' ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="#fff"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm3.35 5.35l-4 4a.5.5 0 0 1-.7 0l-2-2a.5.5 0 1 1 .7-.7L7 9.29l3.65-3.64a.5.5 0 1 1 .7.7z"/></svg>' : ''}
    ${message}
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==================== KEYBOARD ====================

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // If on password step, go back to email
    if (!stepPassword.classList.contains('hidden')) {
      showStep(stepEmail);
      emailInput.focus();
    }
  }
});

// ==================== ENTER KEY ANIMATION ====================

emailInput.addEventListener('focus', () => {
  emailInput.parentElement.style.transform = 'scale(1.01)';
  emailInput.parentElement.style.transition = 'transform 0.2s';
});

emailInput.addEventListener('blur', () => {
  emailInput.parentElement.style.transform = '';
});
