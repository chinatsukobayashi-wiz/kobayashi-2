const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const stepSignin = $('#stepSignin');
const stepPassword = $('#stepPassword');
const stepWorkspace = $('#stepWorkspace');

let currentEmail = '';

// ==================== STEP TRANSITIONS ====================

function showStep(target) {
  [stepSignin, stepPassword, stepWorkspace].forEach(s => s.classList.add('hidden'));
  target.classList.remove('hidden');
  target.style.animation = 'none';
  target.offsetHeight;
  target.style.animation = '';
}

// ==================== STEP 1: EMAIL ====================

$('#emailForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = $('#emailInput').value.trim();
  clearError($('#emailInput'));

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError($('#emailInput'), '有効なメールアドレスを入力してください');
    return;
  }

  currentEmail = email;
  const btn = $('#emailSubmitBtn');
  btn.classList.add('loading');
  btn.disabled = true;

  setTimeout(() => {
    btn.classList.remove('loading');
    btn.disabled = false;
    $('#emailDisplay').textContent = email;
    showStep(stepPassword);
    // Focus first code input
    $$('.code-input')[0].focus();
  }, 1000);
});

// ==================== STEP 2: CODE INPUT ====================

const codeInputs = $$('.code-input');

codeInputs.forEach((input, idx) => {
  input.addEventListener('input', (e) => {
    const val = e.target.value.replace(/\D/g, '');
    e.target.value = val;

    if (val) {
      e.target.classList.add('filled');
      // Move to next
      const next = codeInputs[idx + 1];
      if (next) next.focus();
    } else {
      e.target.classList.remove('filled');
    }

    // Check if all filled
    const code = Array.from(codeInputs).map(i => i.value).join('');
    if (code.length === 6) {
      verifyCode(code);
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !e.target.value) {
      e.target.classList.remove('filled');
      const prev = codeInputs[idx - 1];
      if (prev) { prev.focus(); prev.value = ''; prev.classList.remove('filled'); }
    }
  });

  // Handle paste
  input.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    text.split('').forEach((ch, i) => {
      if (codeInputs[i]) {
        codeInputs[i].value = ch;
        codeInputs[i].classList.add('filled');
      }
    });
    if (text.length === 6) verifyCode(text);
    else if (codeInputs[text.length]) codeInputs[text.length].focus();
  });

  input.addEventListener('focus', () => {
    input.select();
  });
});

function verifyCode(code) {
  // Animate success
  codeInputs.forEach(i => i.disabled = true);

  setTimeout(() => {
    codeInputs.forEach(i => { i.disabled = false; i.classList.remove('filled'); i.value = ''; });
    $('#wsEmailName').textContent = currentEmail;
    showStep(stepWorkspace);
    showToast('認証に成功しました');
  }, 800);
}

// Resend
$('#resendBtn').addEventListener('click', () => {
  const btn = $('#resendBtn');
  btn.textContent = '送信しました';
  btn.classList.add('sent');
  setTimeout(() => {
    btn.textContent = 'コードを再送信';
    btn.classList.remove('sent');
  }, 3000);
});

// Back
$('#backToEmail').addEventListener('click', () => {
  showStep(stepSignin);
  $('#emailInput').focus();
});

// ==================== SOCIAL AUTH ====================

$('#googleBtn').addEventListener('click', () => {
  const btn = $('#googleBtn');
  btn.disabled = true;
  btn.querySelector('span').textContent = '接続中...';

  setTimeout(() => {
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Google で続行する';
    currentEmail = 'user@gmail.com';
    $('#wsEmailName').textContent = currentEmail;
    showStep(stepWorkspace);
    showToast('Google アカウントで認証しました');
  }, 1200);
});

$('#appleBtn').addEventListener('click', () => {
  const btn = $('#appleBtn');
  btn.disabled = true;
  btn.querySelector('span').textContent = '接続中...';

  setTimeout(() => {
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Apple で続行する';
    currentEmail = 'user@icloud.com';
    $('#wsEmailName').textContent = currentEmail;
    showStep(stepWorkspace);
    showToast('Apple アカウントで認証しました');
  }, 1200);
});

// ==================== STEP 3: WORKSPACE ====================

$$('.ws-card').forEach(card => {
  card.addEventListener('click', (e) => {
    e.preventDefault();
    const name = card.querySelector('.ws-card-name').textContent;

    // Highlight selected
    $$('.ws-card').forEach(c => c.style.opacity = '0.5');
    card.style.opacity = '1';
    card.style.borderColor = '#4A154B';
    card.style.background = '#faf5fb';

    const openBtn = card.querySelector('.ws-card-open');
    openBtn.textContent = '接続中...';
    openBtn.style.background = '#4A154B';
    openBtn.style.color = '#fff';

    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  });
});

// ==================== HELPERS ====================

function showError(input, msg) {
  input.classList.add('error');
  const existing = input.parentElement.querySelector('.form-error');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'form-error';
  el.textContent = msg;
  input.parentElement.appendChild(el);
}

function clearError(input) {
  input.classList.remove('error');
  const el = input.parentElement.querySelector('.form-error');
  if (el) el.remove();
}

$('#emailInput').addEventListener('input', () => clearError($('#emailInput')));

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast success';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2500);
}

// Keyboard: Escape goes back
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !stepPassword.classList.contains('hidden')) {
    showStep(stepSignin);
    $('#emailInput').focus();
  }
});
