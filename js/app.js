/**
 * Controlador Principal de la Aplicación NutriFrutas
 */
import { getFruits, filterFruitsList, getUniqueFamilies } from './api.js';
import { renderMacroDonutSVG, renderCalorieMeter } from './charts.js';
import { initCompare, setCompareFruits } from './compare.js';
import { initCalculator, addFruitToBowl } from './calculator.js';

let allFruits = [];
let currentFilterState = {
  query: '',
  family: 'all',
  nutritionFilter: 'all',
  sortBy: 'name_asc'
};

// Inicialización de la aplicación al cargar el DOM
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setupNavigationTabs();
  setupFilterEventListeners();
  setupModalListeners();
  
  await loadAndRenderFruits();
});

/**
 * Carga de datos de la API y render inicial
 */
async function loadAndRenderFruits() {
  const grid = document.getElementById('fruits-grid');
  const loadingIndicator = document.getElementById('loading-indicator');
  const apiStatusBadge = document.getElementById('api-status-badge');

  if (loadingIndicator) loadingIndicator.style.display = 'flex';

  try {
    const { data, source } = await getFruits();
    allFruits = data;

    // Actualizar indicador de fuente de datos
    if (apiStatusBadge) {
      if (source === 'live') {
        apiStatusBadge.className = 'status-badge status-live';
        apiStatusBadge.innerHTML = '🟢 API Fruityvice En Vivo';
      } else if (source === 'proxy') {
        apiStatusBadge.className = 'status-badge status-proxy';
        apiStatusBadge.innerHTML = '🟡 Conexión Proxy Seguro';
      } else {
        apiStatusBadge.className = 'status-badge status-local';
        apiStatusBadge.innerHTML = '⚡ Catálogo NutriFrutas Optimizado';
      }
    }

    // Llenar selector de familias
    populateFamilyFilter(allFruits);

    // Actualizar estadísticas de cabecera
    updateGlobalStats(allFruits);

    // Inicializar módulos secundarios
    initCompare(allFruits);
    initCalculator(allFruits);

    // Renderizar frutas en el explorador
    renderFruitsGrid();

  } catch (error) {
    console.error('Error al iniciar la aplicación:', error);
    if (grid) {
      grid.innerHTML = `
        <div class="error-container">
          <p>Ocurrió un inconveniente al cargar las frutas. Por favor refresca la página.</p>
        </div>
      `;
    }
  } finally {
    if (loadingIndicator) loadingIndicator.style.display = 'none';
  }
}

/**
 * Actualiza la barra superior de estadísticas globales
 */
function updateGlobalStats(fruits) {
  const countEl = document.getElementById('stat-fruit-count');
  const lightestEl = document.getElementById('stat-lightest-fruit');
  const sweetestEl = document.getElementById('stat-sweetest-fruit');
  const proteinEl = document.getElementById('stat-protein-fruit');

  if (countEl) countEl.textContent = fruits.length;

  if (fruits.length > 0) {
    const lightest = [...fruits].sort((a, b) => a.nutritions.calories - b.nutritions.calories)[0];
    const sweetest = [...fruits].sort((a, b) => b.nutritions.sugar - a.nutritions.sugar)[0];
    const highProtein = [...fruits].sort((a, b) => b.nutritions.protein - a.nutritions.protein)[0];

    if (lightestEl) {
      const name = lightest.spanishName || lightest.name;
      const metric = `${lightest.nutritions.calories} kcal`;
      lightestEl.innerHTML = `<span class="stat-fruit-title">${name}</span> <span class="stat-metric-pill stat-pill-green">${metric}</span>`;
      lightestEl.title = `${name} (${metric})`;
    }
    if (sweetestEl) {
      const name = sweetest.spanishName || sweetest.name;
      const metric = `${sweetest.nutritions.sugar}g azúcar`;
      sweetestEl.innerHTML = `<span class="stat-fruit-title">${name}</span> <span class="stat-metric-pill stat-pill-amber">${metric}</span>`;
      sweetestEl.title = `${name} (${metric})`;
    }
    if (proteinEl) {
      const name = highProtein.spanishName || highProtein.name;
      const metric = `${highProtein.nutritions.protein}g proteína`;
      proteinEl.innerHTML = `<span class="stat-fruit-title">${name}</span> <span class="stat-metric-pill stat-pill-purple">${metric}</span>`;
      proteinEl.title = `${name} (${metric})`;
    }
  }
}

/**
 * Llenar el filtro desplegable de familias
 */
function populateFamilyFilter(fruits) {
  const select = document.getElementById('filter-family');
  if (!select) return;

  const families = getUniqueFamilies(fruits);
  select.innerHTML = '<option value="all">Todas las familias botánicas</option>' +
    families.map(fam => `<option value="${fam}">${fam}</option>`).join('');
}

/**
 * Renderiza la cuadrícula de tarjetas de frutas
 */
function renderFruitsGrid() {
  const grid = document.getElementById('fruits-grid');
  const countLabel = document.getElementById('results-count-label');
  if (!grid) return;

  const filtered = filterFruitsList(allFruits, currentFilterState);

  if (countLabel) {
    countLabel.textContent = `Mostrando ${filtered.length} de ${allFruits.length} frutas`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-results-box">
        <span class="empty-icon">🔍</span>
        <h3>No encontramos frutas con esos criterios</h3>
        <p>Intenta ajustar el término de búsqueda o limpia los filtros nutricionales.</p>
        <button id="reset-filters-btn" class="btn btn-secondary">Restablecer Filtros</button>
      </div>
    `;

    document.getElementById('reset-filters-btn')?.addEventListener('click', resetAllFilters);
    return;
  }

  grid.innerHTML = filtered.map(fruit => {
    return `
      <article class="fruit-card" data-id="${fruit.id}" style="--fruit-accent: ${fruit.accentColor};">
        <div class="card-header-bar" style="background: ${fruit.bgGradient};">
          <span class="card-emoji">${fruit.emoji}</span>
          <span class="card-family-tag">${fruit.family}</span>
        </div>

        <div class="card-body">
          <div class="card-titles">
            <h3 class="fruit-main-name">${fruit.spanishName || fruit.name}</h3>
            <span class="fruit-en-name">${fruit.name} · <em>${fruit.genus}</em></span>
          </div>

          <div class="card-calorie-highlight">
            <span class="cal-val">${fruit.nutritions.calories}</span>
            <span class="cal-unit">kcal / 100g</span>
          </div>

          <div class="card-macros-grid">
            <div class="macro-cell">
              <span class="m-val">${fruit.nutritions.sugar}g</span>
              <span class="m-lbl">Azúcar</span>
            </div>
            <div class="macro-cell">
              <span class="m-val">${fruit.nutritions.carbohydrates}g</span>
              <span class="m-lbl">Carbs</span>
            </div>
            <div class="macro-cell">
              <span class="m-val">${fruit.nutritions.protein}g</span>
              <span class="m-lbl">Proteína</span>
            </div>
            <div class="macro-cell">
              <span class="m-val">${fruit.nutritions.fat}g</span>
              <span class="m-lbl">Grasa</span>
            </div>
          </div>

          <div class="card-quick-actions">
            <button class="btn btn-primary btn-sm view-details-btn" data-id="${fruit.id}">
              🔍 Ficha Completa
            </button>
            <button class="btn btn-outline btn-sm quick-compare-btn" data-id="${fruit.id}" title="Comparar con otra fruta">
              ⚖️ Comparar
            </button>
            <button class="btn btn-icon btn-sm quick-bowl-btn" data-id="${fruit.id}" title="Agregar 100g a la Calculadora / Bowl">
              🥣+
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  // Event Listeners en las tarjetas generadas
  grid.querySelectorAll('.view-details-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = Number(e.currentTarget.dataset.id);
      openFruitModal(id);
    });
  });

  grid.querySelectorAll('.quick-compare-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = Number(e.currentTarget.dataset.id);
      switchTab('compare');
      setCompareFruits(id, null);
    });
  });

  grid.querySelectorAll('.quick-bowl-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = Number(e.currentTarget.dataset.id);
      addFruitToBowl(id, 100);
      // Animación feedback
      const originalText = e.currentTarget.innerHTML;
      e.currentTarget.innerHTML = '✓';
      e.currentTarget.classList.add('btn-added');
      setTimeout(() => {
        e.currentTarget.innerHTML = originalText;
        e.currentTarget.classList.remove('btn-added');
      }, 1200);
    });
  });
}

/**
 * Modal Detalle Nutricional Pro
 */
function openFruitModal(fruitId) {
  const fruit = allFruits.find(f => f.id === fruitId);
  if (!fruit) return;

  const modal = document.getElementById('fruit-detail-modal');
  const modalContent = document.getElementById('modal-fruit-content');
  if (!modal || !modalContent) return;

  const n = fruit.nutritions;

  modalContent.innerHTML = `
    <div class="modal-fruit-hero" style="background: ${fruit.bgGradient};">
      <span class="modal-fruit-emoji">${fruit.emoji}</span>
      <div class="modal-fruit-hero-text">
        <h2>${fruit.spanishName || fruit.name}</h2>
        <span class="modal-scientific">Nombre oficial: <strong>${fruit.name}</strong> | Género: <em>${fruit.genus}</em></span>
        <div class="modal-taxonomy-pills">
          <span class="tax-pill">Familia: <strong>${fruit.family}</strong></span>
          <span class="tax-pill">Orden: <strong>${fruit.order}</strong></span>
        </div>
      </div>
    </div>

    <div class="modal-body-layout">
      <!-- Columna Izquierda: Etiqueta Nutricional Estándar -->
      <div class="nutrition-label-card">
        <div class="nutrition-facts-header">
          <h3>Información Nutricional</h3>
          <span class="serving-size">Tamaño de porción: 100 gramos</span>
        </div>

        <div class="facts-calories-line">
          <span>Calorías</span>
          <span class="fact-cal-number">${n.calories}</span>
        </div>

        <div class="facts-table">
          <div class="fact-row">
            <span><strong>Grasas Totales</strong></span>
            <span><strong>${n.fat}g</strong></span>
          </div>
          <div class="fact-row">
            <span><strong>Carbohidratos Totales</strong></span>
            <span><strong>${n.carbohydrates}g</strong></span>
          </div>
          <div class="fact-row indent">
            <span>Azúcares Simples</span>
            <span>${n.sugar}g</span>
          </div>
          <div class="fact-row indent">
            <span>Otros Carbohidratos / Fibra</span>
            <span>${Math.max(0, (n.carbohydrates - n.sugar)).toFixed(1)}g</span>
          </div>
          <div class="fact-row">
            <span><strong>Proteínas</strong></span>
            <span><strong>${n.protein}g</strong></span>
          </div>
        </div>

        ${renderCalorieMeter(n.calories)}
      </div>

      <!-- Columna Derecha: Gráfico de dona y beneficios para la salud -->
      <div class="nutrition-visual-card">
        <h4>Composición de Macronutrientes</h4>
        ${renderMacroDonutSVG(n, 210)}

        <div class="health-benefits-section">
          <h4>🌟 Beneficios y Propiedades</h4>
          <ul class="benefits-list">
            ${(fruit.benefits || [
              'Excelente aporte de agua e hidratación celular',
              'Fuente natural de micronutrientes y vitaminas esenciales'
            ]).map(b => `<li><span class="benefit-check">✔</span> ${b}</li>`).join('')}
          </ul>
        </div>

        <div class="modal-action-bar">
          <button class="btn btn-secondary" id="modal-compare-action-btn">
            ⚖️ Comparar esta fruta
          </button>
          <button class="btn btn-primary" id="modal-bowl-action-btn">
            🥣 Agregar 100g al Tazón
          </button>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('active');

  // Listeners de acciones dentro del modal
  document.getElementById('modal-compare-action-btn')?.addEventListener('click', () => {
    closeFruitModal();
    switchTab('compare');
    setCompareFruits(fruit.id, null);
  });

  document.getElementById('modal-bowl-action-btn')?.addEventListener('click', () => {
    addFruitToBowl(fruit.id, 100);
    closeFruitModal();
    switchTab('calculator');
  });
}

function closeFruitModal() {
  const modal = document.getElementById('fruit-detail-modal');
  if (modal) modal.classList.remove('active');
}

function setupModalListeners() {
  const modal = document.getElementById('fruit-detail-modal');
  const closeBtn = document.getElementById('modal-close-btn');

  if (closeBtn) closeBtn.addEventListener('click', closeFruitModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeFruitModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeFruitModal();
  });
}

/**
 * Event Listeners de Filtros y Búsqueda
 */
function setupFilterEventListeners() {
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const familySelect = document.getElementById('filter-family');
  const sortSelect = document.getElementById('sort-by-select');
  const filterChips = document.querySelectorAll('.filter-chip');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentFilterState.query = e.target.value;
      if (clearSearchBtn) {
        clearSearchBtn.style.display = e.target.value ? 'block' : 'none';
      }
      renderFruitsGrid();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        currentFilterState.query = '';
        clearSearchBtn.style.display = 'none';
        renderFruitsGrid();
        searchInput.focus();
      }
    });
  }

  if (familySelect) {
    familySelect.addEventListener('change', (e) => {
      currentFilterState.family = e.target.value;
      renderFruitsGrid();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentFilterState.sortBy = e.target.value;
      renderFruitsGrid();
    });
  }

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilterState.nutritionFilter = chip.dataset.filter;
      renderFruitsGrid();
    });
  });
}

function resetAllFilters() {
  currentFilterState = {
    query: '',
    family: 'all',
    nutritionFilter: 'all',
    sortBy: 'name_asc'
  };

  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const familySelect = document.getElementById('filter-family');
  const sortSelect = document.getElementById('sort-by-select');
  const filterChips = document.querySelectorAll('.filter-chip');

  if (searchInput) searchInput.value = '';
  if (clearSearchBtn) clearSearchBtn.style.display = 'none';
  if (familySelect) familySelect.value = 'all';
  if (sortSelect) sortSelect.value = 'name_asc';

  filterChips.forEach(chip => {
    chip.classList.toggle('active', chip.dataset.filter === 'all');
  });

  renderFruitsGrid();
}

/**
 * Gestión de Pestañas / Navegación
 */
function setupNavigationTabs() {
  const navBtns = document.querySelectorAll('.nav-tab-btn');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      switchTab(targetTab);
    });
  });
}

export function switchTab(tabName) {
  const navBtns = document.querySelectorAll('.nav-tab-btn');
  const tabPanes = document.querySelectorAll('.tab-content-pane');

  navBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
  tabPanes.forEach(p => p.classList.toggle('active', p.id === `tab-pane-${tabName}`));

  // Scroll suave al inicio del contenido
  const mainContent = document.querySelector('.app-main-content');
  if (mainContent) {
    mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Tema Claro / Oscuro con almacenamiento persistente
 */
function initTheme() {
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const savedTheme = localStorage.getItem('nutrifrutas_theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  applyTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
      localStorage.setItem('nutrifrutas_theme', newTheme);
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    themeToggleBtn.innerHTML = theme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Oscuro';
  }
}
