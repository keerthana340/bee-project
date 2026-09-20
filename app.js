/* ----- CONFIG ----- */
/* Prefer local dataset file in project. If not found, fallback to uploaded path. */
const LOCAL_DATA = "bee_dataset.json";
const FALLBACK_DATA = "/mnt/data/bee_dataset_fixed.json"; // fallback if available (the environment copy)

/* Equipment list */
const EQUIP = [
  { id: "Tractor", name: "Small Tractor", price: 2500 },
  { id: "PowerTiller", name: "Power Tiller", price: 800 },
  { id: "Sprayer", name: "Knapsack Sprayer", price: 150 }
];

/* ----- UTIL ----- */
const byid = id => document.getElementById(id);

function esc(s){ return s==null? "": String(s); }
function fmtDateISO(d){ // yyyy-mm-dd
  const dt = new Date(d);
  return dt.toISOString().slice(0,10);
}

/* ----- LOAD DATASET (tries local then fallback) ----- */
async function loadDataset() {
  async function tryFetch(url){
    try {
      const r = await fetch(url, {cache: "no-store"});
      if (!r.ok) throw new Error("not ok "+r.status);
      const data = await r.json();
      byid("datafile").innerText = url;
      return data;
    } catch(e){
      console.log("load error", url, e.message);
      return null;
    }
  }

  let data = await tryFetch(LOCAL_DATA);
  if (!data) data = await tryFetch(FALLBACK_DATA);
  if (!data) { byid("datafile").innerText = "none"; return []; }
  return data;
}

/* ----- PLANTS UI ----- */
function renderPlants(plants){
  const grid = byid("plantGrid");
  grid.innerHTML = "";
  if (!plants.length){ grid.innerHTML = `<div class="muted">No plants found.</div>`; return; }
  plants.forEach(p => {
    const el = document.createElement("div");
    el.className = "plant";
    el.innerHTML = `
      <h3>${esc(p["Plant Name"])}</h3>
      <p><b>Season:</b> ${esc(p["Season"])}</p>
      <p><b>Nectar Level:</b> ${esc(p["Nectar Level"])}</p>
      <p><b>Sunlight:</b> ${esc(p["Sunlight"])}</p>
      <p><b>Water Need:</b> ${esc(p["Water Need"])}</p>
      <p><b>Attracts Bees:</b> ${esc(p["Attracts Bees"])}</p>
      <p><b>Region:</b> ${esc(p["Region"])}</p>
      <p><b>Notes:</b> ${esc(p["Notes"])}</p>
    `;
    grid.appendChild(el);
  });
}

function setupPlantFilters(plants){
  const season = byid("seasonFilter");
  const search = byid("search");
  const apply = () => {
    const s = (season.value || "").toLowerCase();
    const q = (search.value || "").toLowerCase();
    const filtered = plants.filter(p => {
      const seasonMatch = !s || (p["Season"]||"").toLowerCase() === s;
      const name = (p["Plant Name"]||"").toLowerCase();
      const qmatch = !q || name.includes(q);
      return seasonMatch && qmatch;
    });
    renderPlants(filtered);
  };
  season.addEventListener("change", apply);
  search.addEventListener("input", apply);
}

/* SIMPLE recommendation (choose 6 high-nectar plants) */
function recommendPlants(plants){
  const rec = plants
    .filter(p => (p["Nectar Level"]||"").toLowerCase().includes("high"))
    .slice(0,6);
  renderPlants(rec);
}

/* ----- RENTALS & BOOKINGS (localStorage) ----- */
let bookings = JSON.parse(localStorage.getItem("bookings")||"[]");

function saveBookings(){ localStorage.setItem("bookings", JSON.stringify(bookings)); }

function renderRentals(){
  const list = byid("rentalList");
  list.innerHTML = "";
  EQUIP.forEach(eq => {
    const node = document.createElement("div");
    node.className = "item";
    node.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between">
      <div>
        <strong>${eq.name}</strong><div>₹${eq.price}/day</div>
        <div id="status-${eq.id}" class="availability"></div>
      </div>
    </div>`;
    list.appendChild(node);
  });

  // populate select
  const sel = byid("equipmentSelect");
  sel.innerHTML = "";
  EQUIP.forEach(eq=>{
    const o = document.createElement("option");
    o.value = eq.name;
    o.textContent = `${eq.name} — ₹${eq.price}/day`;
    sel.appendChild(o);
  });

  updateAvailability(); // initial
}

/* update availability badges using selected rentalDate (or today if none) */
function updateAvailability(){
  const chosen = byid("rentalDate").value; // yyyy-mm-dd
  const dateToCheck = chosen || fmtDateISO(new Date());
  EQUIP.forEach(eq => {
    const s = byid(`status-${eq.id}`);
    const booked = bookings.some(b => b.equipment === eq.name && b.rentalDate === dateToCheck);
    s.innerHTML = booked ? `<span style="color:orange">booked</span>` : `<span style="color:green">available</span>`;
  });
}

function renderBookingsList(){
  const ul = byid("bookingsList");
  ul.innerHTML = "";
  if (!bookings.length){
    ul.innerHTML = `<li class="muted">No bookings yet.</li>`;
    return;
  }
  bookings.forEach((b, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${esc(b.name)}</strong> booked <strong>${esc(b.equipment)}</strong>
      for <strong>${esc(b.days)}</strong> day(s) on <b>${esc(b.rentalDate)}</b> <br>
      📞 <a href="tel:${encodeURIComponent(b.phone)}">${esc(b.phone)}</a>
      <button class="whBtn" data-phone="${encodeURIComponent(b.phone)}">WhatsApp</button>
      &nbsp; <span class="muted">Booked on ${esc(b.date)}</span>
      &nbsp; <button class="cancelBtn" data-idx="${idx}">Cancel</button>
    `;
    ul.appendChild(li);
  });

  // handlers
  ul.querySelectorAll(".cancelBtn").forEach(btn=>{
    btn.onclick = () => {
      const i = parseInt(btn.dataset.idx);
      if (!confirm("Cancel booking?")) return;
      bookings.splice(i,1);
      saveBookings();
      renderBookingsList();
      updateAvailability();
    };
  });

  ul.querySelectorAll(".whBtn").forEach(b=>{
    b.onclick = () => {
      const phone = b.dataset.phone.replace(/%2B|%20/g,"");
      const msg = encodeURIComponent("Hello, I'm contacting you about your equipment booking.");
      window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
    };
  });
}

/* booking form */
byid("bookingForm").onsubmit = function(e){
  e.preventDefault();
  const equipment = byid("equipmentSelect").value;
  const name = byid("renterName").value.trim();
  const phone = byid("renterPhone").value.trim();
  const days = byid("rentalDays").value;
  const rentalDate = byid("rentalDate").value;

  if (!name || !phone || !rentalDate){
    alert("Please enter name, phone and date.");
    return;
  }

  // check duplicate
  const exists = bookings.some(b => b.equipment === equipment && b.rentalDate === rentalDate);
  if (exists){
    alert("This equipment is already booked on that date.");
    return;
  }

  const newB = {
    equipment, name, phone, days, rentalDate,
    date: new Date().toLocaleString()
  };
  bookings.push(newB);
  saveBookings();
  renderBookingsList();
  updateAvailability();
  alert("Booking saved!");
  byid("bookingForm").reset();
};

/* update availability when date changes */
byid("rentalDate").addEventListener("change", updateAvailability);

/* ----- ADMIN EXPORT (the admin page will reuse localStorage bookings) ----- */
/* The admin page will read localStorage('bookings') and export to CSV there. */

/* ----- INIT ----- */
(async function init(){
  const plants = await loadDataset();
  renderPlants(plants);
  setupPlantFilters(plants);

  byid("recommendBtn").addEventListener("click", ()=>recommendPlants(plants));

  // Rentals & bookings
  renderRentals();
  renderBookingsList();
})();

