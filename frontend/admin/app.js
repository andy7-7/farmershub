const ADMIN_API = window.FARMERS_ADMIN_API || `${window.location.origin}/api`;

const adminToken = () => localStorage.getItem('fh_admin_token');
const adminUser = () => JSON.parse(localStorage.getItem('fh_admin_user') || '{}');

const saveAdmin = (token, farmer) => {
  localStorage.setItem('fh_admin_token', token);
  localStorage.setItem('fh_admin_user', JSON.stringify(farmer));
};

const adminHeaders = () => ({ Authorization: `Bearer ${adminToken()}` });
const adminJsonHeaders = () => ({ 'Content-Type': 'application/json', ...adminHeaders() });

const adminFetch = async (path, options = {}) => {
  const res = await fetch(`${ADMIN_API}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

const requireAdmin = () => {
  if (!adminToken() || adminUser().role !== 'admin') {
    window.location.href = '/admin/login';
  }
};

const adminLogout = () => {
  localStorage.removeItem('fh_admin_token');
  localStorage.removeItem('fh_admin_user');
  window.location.href = '/admin/login';
};

const money = (value) => `GHS ${Number(value || 0).toLocaleString()}`;
const verifyLink = (membershipId) => `${window.location.origin}/verify/${encodeURIComponent(membershipId)}`;
const qrUrl = (url) => `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;

const showAdminMessage = (id, text, type = 'success') => {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = `message ${type}`;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 4200);
};

const renderTable = (headers, rows) => `
  <table>
    <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
`;

const renderCard = (card) => {
  const verification = card.verification_url || verifyLink(card.membership_id);
  return `
    <article class="membership-card" id="membership-card">
      <h2>FarmersHub</h2>
      <div class="verified">Verified Member</div>
      <div class="card-lines">
        <strong>${card.full_name}</strong>
        <span>${card.farm_name || 'Farm name not set'}</span>
        <span>${card.phone || 'No phone'} | ${card.region || 'No region'}</span>
        <span>${card.location || 'No location'}</span>
        <span>Membership ID: ${card.membership_id}</span>
        <span>Approved: ${card.approved_at ? new Date(card.approved_at).toLocaleDateString() : 'Approved'}</span>
      </div>
      <div class="qr-box"><img alt="Verification QR" src="${qrUrl(verification)}"></div>
    </article>
  `;
};

const buildCardSvg = (card) => {
  const verification = card.verification_url || verifyLink(card.membership_id);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1050" height="650" viewBox="0 0 1050 650">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#031614"/><stop offset="1" stop-color="#0a3a33"/></linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="18" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect width="1050" height="650" rx="42" fill="url(#bg)"/>
    <circle cx="930" cy="110" r="190" fill="#28dce8" opacity=".2" filter="url(#glow)"/>
    <circle cx="110" cy="570" r="220" fill="#43f28f" opacity=".18" filter="url(#glow)"/>
    <text x="58" y="86" fill="#f3fffb" font-size="42" font-weight="800" font-family="Arial">FarmersHub</text>
    <text x="58" y="138" fill="#bfffd7" font-size="22" font-weight="800" font-family="Arial">VERIFIED MEMBER</text>
    <text x="58" y="230" fill="#ffffff" font-size="44" font-weight="800" font-family="Arial">${escapeXml(card.full_name || '')}</text>
    <text x="58" y="285" fill="#dffbf5" font-size="28" font-family="Arial">${escapeXml(card.farm_name || 'Farm name not set')}</text>
    <text x="58" y="345" fill="#aee8dc" font-size="24" font-family="Arial">${escapeXml(card.phone || 'No phone')} | ${escapeXml(card.region || 'No region')}</text>
    <text x="58" y="390" fill="#aee8dc" font-size="24" font-family="Arial">${escapeXml(card.location || 'No location')}</text>
    <text x="58" y="475" fill="#43f28f" font-size="34" font-weight="800" font-family="Arial">${escapeXml(card.membership_id || '')}</text>
    <text x="58" y="525" fill="#aee8dc" font-size="22" font-family="Arial">Approved: ${card.approved_at ? new Date(card.approved_at).toLocaleDateString() : 'Approved'}</text>
    <rect x="780" y="360" width="190" height="190" rx="18" fill="#ffffff"/>
    <image href="${qrUrl(verification)}" x="795" y="375" width="160" height="160"/>
  </svg>`;
};

const downloadSvgCard = (card) => {
  const svg = buildCardSvg(card);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${card.membership_id || 'membership-card'}.svg`;
  link.click();
  URL.revokeObjectURL(link.href);
};

const downloadPngCard = (card) => {
  const svg = buildCardSvg(card);
  const image = new Image();
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1050;
    canvas.height = 650;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    URL.revokeObjectURL(svgUrl);
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${card.membership_id || 'membership-card'}.png`;
    link.click();
  };
  image.onerror = () => {
    URL.revokeObjectURL(svgUrl);
    alert('PNG export could not render. Use Print / Save PDF or Download SVG.');
  };
  image.src = svgUrl;
};

const escapeXml = (text) => String(text).replace(/[<>&'"]/g, (c) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
}[c]));
