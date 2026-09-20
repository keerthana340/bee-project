/* admin.js: admin / 1234 */
const ADMIN_USER = 'admin';
const ADMIN_PASS = '1234';

document.getElementById('loginBtn').onclick = function() {
  const u = document.getElementById('adminUser').value.trim();
  const p = document.getElementById('adminPass').value.trim();
  if (u === ADMIN_USER && p === ADMIN_PASS) {
    document.getElementById('loginBox').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    loadAndRenderBookings();
  } else {
    document.getElementById('loginMsg').textContent = 'Invalid credentials';
  }
};

document.getElementById('logoutBtn').onclick = () => location.reload();

function loadBookings() { return JSON.parse(localStorage.getItem('bookings') || '[]'); }
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>'"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c])); }

function loadAndRenderBookings(filtered){
  const data = filtered || loadBookings();
  const tbody = document.querySelector('#bookingsTable tbody');
  tbody.innerHTML = '';
  if (!data.length) { tbody.innerHTML = '<tr><td colspan="7" class="muted">No bookings</td></tr>'; return; }
  data.forEach((b, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(b.name)}</td>
      <td>${escapeHtml(b.phone)}</td>
      <td>${escapeHtml(b.equipment)}</td>
      <td>${escapeHtml(b.days)}</td>
      <td>${escapeHtml(b.rentalDate || '')}</td>
      <td>${escapeHtml(b.date)}</td>
      <td><button class="delBtn" data-index="${idx}">Delete</button> &nbsp;
          <a target="_blank" href="https://wa.me/${(b.phone||'').replace(/\D/g,'')}?text=${encodeURIComponent('Hello, I am contacting you about your equipment booking.')}">WhatsApp</a></td>`;
    tbody.appendChild(tr);
  });

  document.querySelectorAll('.delBtn').forEach(btn => {
    btn.onclick = () => {
      const i = parseInt(btn.dataset.index,10);
      if (!Number.isFinite(i)) return;
      if (!confirm('Delete this booking?')) return;
      const arr = loadBookings();
      arr.splice(i,1);
      localStorage.setItem('bookings', JSON.stringify(arr));
      loadAndRenderBookings();
    };
  });
}

document.getElementById('filterBtn').onclick = function() {
  const q = document.getElementById('searchBooking').value.trim().toLowerCase();
  const from = document.getElementById('fromDate').value;
  const to = document.getElementById('toDate').value;
  let arr = loadBookings();
  if (q) arr = arr.filter(b => (b.name||'').toLowerCase().includes(q) || (b.phone||'').includes(q));
  if (from) arr = arr.filter(b => new Date(b.rentalDate || b.date) >= new Date(from));
  if (to) arr = arr.filter(b => new Date(b.rentalDate || b.date) <= new Date(to + 'T23:59:59'));
  loadAndRenderBookings(arr);
};

document.getElementById('clearFilter').onclick = function() {
  document.getElementById('searchBooking').value = '';
  document.getElementById('fromDate').value = '';
  document.getElementById('toDate').value = '';
  loadAndRenderBookings();
};

document.getElementById('exportBtn').onclick = function() {
  const arr = loadBookings();
  if (!arr.length) return alert('No bookings to export');
  const ws = XLSX.utils.json_to_sheet(arr);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bookings');
  XLSX.writeFile(wb, 'bookings.xlsx');
};
