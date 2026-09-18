/**
 * Controlador de la herramienta de Comparación (Fruit Versus)
 */
import { renderComparisonBarSVG } from './charts.js';

let allFruits = [];
let selectedFruitA = null;
let selectedFruitB = null;

export function initCompare(fruits) {
  allFruits = fruits;

  const selectA = document.getElementById('compare-select-a');
  const selectB = document.getElementById('compare-select-b');
  const swapBtn = document.getElementById('compare-swap-btn');

  if (!selectA || !selectB) return;

  // Llenar selects
  const optionsHtml = fruits.map(f => `
    <option value="${f.id}">${f.emoji} ${f.spanishName || f.name} (${f.nutritions.calories} kcal)</option>
  `).join('');

  selectA.innerHTML = optionsHtml;
  selectB.innerHTML = optionsHtml;

  // Default: Manzana (id 6) vs Plátano (id 1) o primeros dos
  const defaultA = fruits.find(f => f.name.toLowerCase() === 'apple') || fruits[0];
  const defaultB = fruits.find(f => f.name.toLowerCase() === 'banana') || fruits[1] || fruits[0];

  selectA.value = defaultA.id;
  selectB.value = defaultB.id;
  selectedFruitA = defaultA;
  selectedFruitB = defaultB;

  selectA.addEventListener('change', (e) => {
    selectedFruitA = allFruits.find(f => f.id == e.target.value);
    renderComparison();
  });

  selectB.addEventListener('change', (e) => {
    selectedFruitB = allFruits.find(f => f.id == e.target.value);
    renderComparison();
  });

  if (swapBtn) {
    swapBtn.addEventListener('click', () => {
      const temp = selectedFruitA;
      selectedFruitA = selectedFruitB;
      selectedFruitB = temp;
      selectA.value = selectedFruitA.id;
      selectB.value = selectedFruitB.id;
      renderComparison();
    });
  }

  renderComparison();
}

export function setCompareFruits(fruitAId, fruitBId) {
  const selectA = document.getElementById('compare-select-a');
  const selectB = document.getElementById('compare-select-b');

  if (fruitAId) {
    const fA = allFruits.find(f => f.id == fruitAId);
    if (fA) {
      selectedFruitA = fA;
      if (selectA) selectA.value = fA.id;
    }
  }

  if (fruitBId) {
    const fB = allFruits.find(f => f.id == fruitBId);
    if (fB) {
      selectedFruitB = fB;
      if (selectB) selectB.value = fB.id;
    }
  }

  renderComparison();
}

function generateDietVerdict(a, b) {
  const diffCal = Math.abs(a.nutritions.calories - b.nutritions.calories);
  const diffSugar = Math.abs(a.nutritions.sugar - b.nutritions.sugar).toFixed(1);

  const lowerCalFruit = a.nutritions.calories <= b.nutritions.calories ? a : b;
  const higherProtFruit = a.nutritions.protein >= b.nutritions.protein ? a : b;
  const lowerSugarFruit = a.nutritions.sugar <= b.nutritions.sugar ? a : b;

  return `
    <div class="verdict-box">
      <div class="verdict-title">💡 Veredicto Nutricional Inteligente</div>
      <p class="verdict-text">
        <strong>${lowerCalFruit.spanishName || lowerCalFruit.name}</strong> es más ligero con 
        <strong>${diffCal} kcal menos</strong> por 100g. Si tu objetivo es reducir glucosa o estás en déficit calórico, 
        <strong>${lowerSugarFruit.spanishName || lowerSugarFruit.name}</strong> aporta <strong>${diffSugar}g menos de azúcar</strong>.
        Para recuperación muscular o mayor saciedad proteica, destaca <strong>${higherProtFruit.spanishName || higherProtFruit.name}</strong> 
        con <strong>${higherProtFruit.nutritions.protein}g de proteína</strong>.
      </p>
    </div>
  `;
}

export function renderComparison() {
  const container = document.getElementById('compare-results-container');
  if (!container || !selectedFruitA || !selectedFruitB) return;

  const a = selectedFruitA;
  const b = selectedFruitB;

  container.innerHTML = `
    <div class="duel-cards-grid">
      <!-- Tarjeta Fruta A -->
      <div class="duel-fruit-card card-a">
        <div class="duel-emoji-wrap" style="background: ${a.bgGradient};">
          <span class="duel-emoji">${a.emoji}</span>
        </div>
        <div class="duel-fruit-title">
          <h3>${a.spanishName || a.name}</h3>
          <span class="duel-scientific">${a.genus} (${a.family})</span>
        </div>
        <div class="duel-big-stat">
          <span class="stat-number">${a.nutritions.calories}</span>
          <span class="stat-unit">kcal / 100g</span>
        </div>
        <div class="duel-macros-mini">
          <div class="macro-pill"><span>Azúcar:</span> <strong>${a.nutritions.sugar}g</strong></div>
          <div class="macro-pill"><span>Carbs:</span> <strong>${a.nutritions.carbohydrates}g</strong></div>
          <div class="macro-pill"><span>Proteína:</span> <strong>${a.nutritions.protein}g</strong></div>
          <div class="macro-pill"><span>Grasa:</span> <strong>${a.nutritions.fat}g</strong></div>
        </div>
      </div>

      <!-- Separador VS -->
      <div class="duel-vs-divider">
        <div class="vs-circle">VS</div>
      </div>

      <!-- Tarjeta Fruta B -->
      <div class="duel-fruit-card card-b">
        <div class="duel-emoji-wrap" style="background: ${b.bgGradient};">
          <span class="duel-emoji">${b.emoji}</span>
        </div>
        <div class="duel-fruit-title">
          <h3>${b.spanishName || b.name}</h3>
          <span class="duel-scientific">${b.genus} (${b.family})</span>
        </div>
        <div class="duel-big-stat">
          <span class="stat-number">${b.nutritions.calories}</span>
          <span class="stat-unit">kcal / 100g</span>
        </div>
        <div class="duel-macros-mini">
          <div class="macro-pill"><span>Azúcar:</span> <strong>${b.nutritions.sugar}g</strong></div>
          <div class="macro-pill"><span>Carbs:</span> <strong>${b.nutritions.carbohydrates}g</strong></div>
          <div class="macro-pill"><span>Proteína:</span> <strong>${b.nutritions.protein}g</strong></div>
          <div class="macro-pill"><span>Grasa:</span> <strong>${b.nutritions.fat}g</strong></div>
        </div>
      </div>
    </div>

    <!-- Gráfico Comparativo de Barras -->
    ${renderComparisonBarSVG(a, b)}

    <!-- Veredicto inteligente -->
    ${generateDietVerdict(a, b)}
  `;
}
