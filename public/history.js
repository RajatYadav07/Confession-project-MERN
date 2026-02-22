async function fetchJSON(url, opts){ const res = await fetch(url, opts); return res.json(); }

const logoutBtn = document.getElementById('logout-btn');

async function init(){
  // auth config
  try{ const cfg = await fetchJSON('/auth/config'); }catch(e){ }
  const me = await fetchJSON('/auth/me');
  if (me.authenticated){
    logoutBtn.style.display='inline-block';
    document.getElementById('displayName').textContent = 'Anjaan Insaan';
    const emojis = ['😊', '😎', '🤔', '😴', '🎓', '📚', '💭', '🌟', '✨', '🎭', '🎪', '🎨', '🎬', '🚀', '⭐', '🎯', '👨‍🎓', '💡', '🧠'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    document.getElementById('avatar').textContent = randomEmoji;
    loadMine();
  } else {
    window.location = '/';
  }
}

logoutBtn.addEventListener('click', async ()=>{ await fetch('/auth/logout'); window.location.reload(); });

async function loadMine(){
  const list = await fetchJSON('/api/confessions/mine');
  const postsList = document.getElementById('posts-list'); postsList.innerHTML = '';
  let totalReactions = 0;
  if (!list || list.length === 0) {
    postsList.innerHTML = '<div style="color:var(--muted);padding:20px;text-align:center">No confessions yet. Start by writing one!</div>';
    document.getElementById('secret-count').textContent = 0;
    document.getElementById('heart-count').textContent = 0;
    return;
  }
  list.forEach(p => {
    totalReactions += (p.reactions.like||0) + (p.reactions.sad||0) + (p.reactions.laugh||0);
    const el = document.createElement('div'); el.className='post-row';
    const timeAgo = new Date(p.createdAt).toLocaleString();
    const title = p.text.length > 80 ? p.text.slice(0,80)+'...' : p.text;
    el.innerHTML = `
      <div class="post-text">
        <div class="title">${escapeHtml(title)}</div>
        <div class="time">${timeAgo}</div>
      </div>
      <div class="post-actions">
        <button class="btn-edit" data-id="${p._id}">Edit</button>
        <button class="btn-delete" data-id="${p._id}">Delete</button>
      </div>
    `;
    postsList.appendChild(el);
  });
  
  // attach handlers for edit/delete
  postsList.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', async (e)=>{
    const id = e.currentTarget.dataset.id;
    const newText = prompt('Edit your confession text:');
    if (newText === null) return;
    const secret = prompt('Enter your secret code (required to authorize edit):');
    if (!secret) return alert('Secret code required');
    const res = await fetch('/api/confessions/' + id, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ text: newText, secretCode: secret }) });
    const j = await res.json();
    if (j.error) return alert(j.error);
    loadMine();
  }));

  postsList.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', async (e)=>{
    const id = e.currentTarget.dataset.id;
    if (!confirm('Delete this confession?')) return;
    const secret = prompt('Enter your secret code to delete:');
    if (!secret) return alert('Secret code required');
    const res = await fetch('/api/confessions/' + id, { method: 'DELETE', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ secretCode: secret }) });
    const j = await res.json();
    if (j.error) return alert(j.error);
    loadMine();
  }));

  document.getElementById('secret-count').textContent = list.length;
  document.getElementById('heart-count').textContent = totalReactions;
}

function escapeHtml(s){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;') }

// Write Secret button redirects to home/feed
document.getElementById('write-btn').addEventListener('click', ()=>{ window.location='/'; });

init();

