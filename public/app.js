async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  return res.json();
}

const feedEl = document.getElementById('feed');
const modal = document.getElementById('modal');
const writeBtn = document.getElementById('write-btn');
const closeModal = document.getElementById('close-modal');
const submitConf = document.getElementById('submit-conf');
const confText = document.getElementById('conf-text');
const confSecret = document.getElementById('conf-secret');
const formMsg = document.getElementById('form-msg');
const loginLink = document.getElementById('login-link');
const logoutBtn = document.getElementById('logout-btn');
const userInfo = document.getElementById('user-info');

async function getUser() {
  try {
    const j = await fetchJSON('/auth/me');
    return j;
  } catch (e) { return { authenticated: false } }
}

async function getAuthConfig(){
  try{ return await fetchJSON('/auth/config'); }catch(e){ return { googleConfigured: false } }
}

function renderCard(conf) {
  const div = document.createElement('div');
  div.className = 'card conf-card';
  const tag = conf.tag ? `<span class="pill">${escapeHtml(conf.tag)}</span>` : '';
  const time = new Date(conf.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  const anon = conf.anonId || 'Anjaan';
  div.innerHTML = `
    <div class="card-head">
      ${tag}
      <div class="time">${time}</div>
    </div>
    <div class="text">${escapeHtml(conf.text)}</div>
    <div class="meta muted">
      <div class="anon">${escapeHtml(anon)}</div>
      <div class="counts">
        <span>❤️ ${conf.reactions.like||0}</span>
        <span>😭 ${conf.reactions.sad||0}</span>
        <span>😆 ${conf.reactions.laugh||0}</span>
      </div>
    </div>
    <div class="reactions">
      <button class="reaction-btn" data-id="${conf._id}" data-type="like">❤️</button>
      <button class="reaction-btn" data-id="${conf._id}" data-type="sad">😭</button>
      <button class="reaction-btn" data-id="${conf._id}" data-type="laugh">😆</button>
      <button class="reaction-btn edit" data-id="${conf._id}">✏️</button>
      <button class="reaction-btn del" data-id="${conf._id}">🗑️</button>
    </div>
  `;
  return div;
}

function escapeHtml(s){ return String(s)
  .replaceAll('&','&amp;')
  .replaceAll('<','&lt;')
  .replaceAll('>','&gt;') }

async function loadFeed(){
  const list = await fetchJSON('/api/confessions');
  feedEl.innerHTML = '';
  list.forEach(c => feedEl.appendChild(renderCard(c)));
  updateCampusMood(list);
}

function updateCampusMood(confessions) {
  let totalLike = 0, totalSad = 0, totalLaugh = 0;
  confessions.forEach(c => {
    totalLike += c.reactions.like || 0;
    totalSad += c.reactions.sad || 0;
    totalLaugh += c.reactions.laugh || 0;
  });
  
  const totalReactions = totalLike + totalSad + totalLaugh;
  let stressedPercent = totalReactions > 0 ? Math.round((totalSad / totalReactions) * 100) : 0;
  let happyPercent = totalReactions > 0 ? Math.round(((totalLike + totalLaugh) / totalReactions) * 100) : 0;
  
  const moodCard = document.querySelector('.mood');
  if (moodCard) {
    const rows = moodCard.querySelectorAll('.mood-row');
    if (rows[0]) {
      rows[0].querySelector('.mood-info span:last-child').textContent = stressedPercent + '%';
      rows[0].querySelector('.fill').style.width = stressedPercent + '%';
    }
    if (rows[1]) {
      rows[1].querySelector('.mood-info span:last-child').textContent = happyPercent + '%';
      rows[1].querySelector('.fill').style.width = happyPercent + '%';
    }
  }
}

writeBtn.addEventListener('click', async ()=>{
  const u = await getUser();
  if (!u.authenticated) {
    // redirect to Google sign-in (or dev-login if not configured)
    const cfg = await getAuthConfig();
    const target = cfg.googleConfigured ? '/auth/google' : '/auth/dev-login';
    window.location = target;
    return;
  }
  modal.classList.remove('hidden');
});
closeModal.addEventListener('click', ()=> modal.classList.add('hidden'));

submitConf.addEventListener('click', async ()=>{
  const text = confText.value.trim();
  const secret = confSecret.value.trim();
  formMsg.textContent = '';
  if (!text) return formMsg.textContent = 'Please enter a confession.';
  if (!secret || secret.length < 4) return formMsg.textContent = 'Secret code must be 4+ chars.';
  const res = await fetchJSON('/api/confessions', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text, secretCode: secret }) });
  if (res.error) return formMsg.textContent = res.error;
  confText.value = ''; confSecret.value = '';
  modal.classList.add('hidden');
  await loadFeed();
});

document.addEventListener('click', async (e)=>{
  const btn = e.target.closest('.reaction-btn');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.classList.contains('edit')){
    const newText = prompt('Enter new confession text');
    if (!newText) return;
    const secret = prompt('Enter the secret code used when posting');
    if (!secret) return alert('Secret required');
    const res = await fetchJSON(`/api/confessions/${id}`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ secretCode: secret, text: newText }) });
    if (res.error) return alert(res.error);
    loadFeed();
    return;
  }
  if (btn.classList.contains('del')){
    if(!confirm('Delete this confession?')) return;
    const secret = prompt('Enter secret code to delete');
    if (!secret) return alert('Secret required');
    const res = await fetchJSON(`/api/confessions/${id}`, { method: 'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ secretCode: secret }) });
    if (res.error) return alert(res.error);
    loadFeed();
    return;
  }
  // reaction
  const type = btn.dataset.type;
  if (type && ['like', 'sad', 'laugh'].includes(type)){
    try {
      const res = await fetchJSON(`/api/confessions/${id}/react`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type }) });
      if (res.error) {
        console.error('Reaction error:', res.error);
      } else {
        console.log('Reaction successful:', type, res);
        await loadFeed();
      }
    } catch (err) {
      console.error('Reaction failed:', err);
    }
  }
});

logoutBtn.addEventListener('click', async ()=>{
  await fetch('/auth/logout');
  window.location.reload();
});

async function init(){
  const cfg = await getAuthConfig();
  loginLink.href = cfg.googleConfigured ? '/auth/google' : '/auth/dev-login';
  const u = await getUser();
  if (u.authenticated){
    loginLink.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    userInfo.textContent = `Signed in as ${u.user.displayName}`;
  }
  loadFeed();
}

init();
