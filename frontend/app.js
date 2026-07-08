const API = window.FARMERS_API_URL || 'http://localhost:5000/api';
const API_ORIGIN = API.replace(/\/api\/?$/, '');

const getToken = () => localStorage.getItem('token');
const getFarmer = () => JSON.parse(localStorage.getItem('farmer') || '{}');

const saveLogin = (token, farmer) => {
  localStorage.setItem('token', token);
  localStorage.setItem('farmer', JSON.stringify(farmer));
};

const updateStoredFarmer = (farmer) => {
  localStorage.setItem('farmer', JSON.stringify(farmer));
};

const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('farmer');
  window.location.href = 'login.html';
};

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`
});

const jsonHeaders = () => ({
  'Content-Type': 'application/json',
  ...authHeaders()
});

const apiFetch = async (path, options = {}) => {
  const res = await fetch(`${API}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
};

const assetUrl = (url) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`;
};

const money = (value) => `GHS ${Number(value || 0).toLocaleString()}`;

const showMessage = (id, text, type) => {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = text;
    el.className = `message ${type}`;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 4000);
  }
};

const requireAuth = () => {
  if (!getToken()) window.location.href = 'login.html';
};

const updateNav = () => {
  const token = getToken();
  const farmer = getFarmer();
  const navLinks = document.getElementById('nav-links');
  if (!navLinks) return;

  if (token) {
    navLinks.innerHTML = `
      <a href="marketplace.html">Marketplace</a>
      <a href="add-animal.html">List Animal</a>
      <a href="dashboard.html">Dashboard</a>
      ${farmer.role === 'admin' ? '<a href="admin.html">Admin</a>' : ''}
      <a href="#" onclick="logout()">Logout</a>
    `;
  } else {
    navLinks.innerHTML = `
      <a href="marketplace.html">Marketplace</a>
      <a href="login.html">Login</a>
      <a href="register.html">Register</a>
    `;
  }
};

const renderAnimalCard = (animal, options = {}) => {
  const image = animal.image_url
    ? `<img src="${assetUrl(animal.image_url)}" alt="${animal.name}">`
    : '<div class="no-image"></div>';
  const statusClass = animal.status === 'sold' ? 'orange' : 'green';
  const location = animal.animal_location || animal.farmer_location || animal.location || 'Location not set';

  return `
    <div class="animal-card">
      ${image}
      <div class="card-body">
        <h3>${animal.name}</h3>
        <div class="price">${money(animal.price)}</div>
        <div style="margin-bottom:10px">
          <span class="tag green">${animal.species}</span>
          ${animal.breed ? `<span class="tag">${animal.breed}</span>` : ''}
          ${animal.age ? `<span class="tag orange">${animal.age} yrs</span>` : ''}
          <span class="tag ${statusClass}">${animal.status || 'available'}</span>
        </div>
        <div class="details">${animal.health_status || 'Health not specified'} | ${location}</div>
        <div class="details">${animal.description || 'No description added yet.'}</div>
        ${animal.farmer_name ? `
          <div class="farmer-info">
            <strong>${animal.farmer_name}</strong><br>
            ${animal.farm_name || animal.association_name || 'Association member'}<br>
            ${animal.phone || 'No phone'} | ${animal.region || animal.farmer_location || 'No region'}
          </div>` : ''}
      </div>
      <div class="card-actions">
        ${options.owner ? `
          <a class="btn btn-secondary" href="edit-animal.html?id=${animal.id}">Edit</a>
          <button class="btn btn-green" onclick="markSold(${animal.id})">Sold</button>
          <button class="btn btn-red" onclick="deleteAnimal(${animal.id})">Delete</button>
        ` : `
          <a class="btn btn-secondary" href="animal-detail.html?id=${animal.id}">Details</a>
          ${animal.phone ? `<a class="btn btn-primary" href="https://wa.me/${String(animal.phone).replace(/\D/g, '')}" target="_blank">WhatsApp</a>` : ''}
        `}
      </div>
    </div>
  `;
};
