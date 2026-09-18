/**
 * Calculadora de Porciones y Creador de Ensaladas / Batidos (Bowl Planner)
 */
import { renderMacroDonutSVG } from './charts.js';

let allFruits = [];
let bowlItems = [
  // Ejemplos predefinidos deliciosos al inicio
  { fruitId: 1, grams: 120 }, // Plátano
  { fruitId: 3, grams: 100 }, // Fresa
  { fruitId: 33, grams: 50 }  // Arándano
];

export function initCalculator(fruits) {
  allFruits = fruits;

  const selectFruit = document.getElementById('calc-add-select');
  const addBtn = document.getElementById('calc-add-btn');
  const clearBtn = document.getElementById('calc-clear-btn');
  const presetSelector = document.getElementById('calc-preset-select');
  const copyBtn = document.getElementById('calc-copy-btn');

  if (selectFruit) {
    selectFruit.innerHTML = fruits.map(f => `
      <option value="${f.id}">${f.emoji} ${f.spanishName || f.name} (${f.nutritions.calories} kcal/100g)</option>
    `).join('');
  }

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const fruitId = Number(selectFruit.value);
      const gramsInput = document.getElementById('calc-add-grams');
      const grams = Math.max(10, Math.min(1000, Number(gramsInput?.value || 100)));
      addFruitToBowl(fruitId, grams);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      bowlItems = [];
      renderBowl();
    });
  }

  if (presetSelector) {
    presetSelector.addEventListener('change', (e) => {
      loadPreset(e.target.value);
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      copyRecipeSummary();
    });
  }

  renderBowl();
}

export function addFruitToBowl(fruitId, grams = 100) {
  const existing = bowlItems.find(item => item.fruitId === fruitId);
  if (existing) {
    existing.grams += grams;
  } else {
    bowlItems.push({ fruitId, grams });
  }
  renderBowl();
}

function removeFruitFromBowl(fruitId) {
  bowlItems = bowlItems.filter(item => item.fruitId !== fruitId);
  renderBowl();
}

function updateItemGrams(fruitId, grams) {
  const item = bowlItems.find(it => it.fruitId === fruitId);
  if (item) {
    item.grams = Math.max(10, Math.min(2000, grams));
    renderBowl();
  }
}

function loadPreset(presetKey) {
  switch (presetKey) {
    case 'energy': // Batido Energético
      bowlItems = [
        { fruitId: 1, grams: 150 },  // Plátano
        { fruitId: 27, grams: 100 }, // Mango
        { fruitId: 3, grams: 80 }    // Fresa
      ];
      break;
    case 'antioxidant': // Tazón Antioxidante & Juventud
      bowlItems = [
        { fruitId: 33, grams: 80 },  // Arándano azul
        { fruitId: 64, grams: 70 },  // Mora
        { fruitId: 23, grams: 70 },  // Frambuesa
        { fruitId: 9, grams: 50 }    // Cereza
      ];
      break;
    case 'slimming': // Ensalada Hidratante Ligera (Déficit calórico)
      bowlItems = [
        { fruitId: 25, grams: 200 }, // Sandía
        { fruitId: 41, grams: 150 }, // Melón
        { fruitId: 3, grams: 100 }   // Fresa
      ];
      break;
    case 'tropical': // Mix Tropical Exótico
      bowlItems = [
        { fruitId: 10, grams: 120 }, // Piña
        { fruitId: 42, grams: 100 }, // Papaya
        { fruitId: 80, grams: 80 }   // Pitahaya
      ];
      break;
  }
  renderBowl();
}

export function calculateTotals() {
  let totalGrams = 0;
  let calories = 0;
  let carbohydrates = 0;
  let sugar = 0;
  let protein = 0;
  let fat = 0;

  bowlItems.forEach(item => {
    const fruit = allFruits.find(f => f.id === item.fruitId);
    if (!fruit) return;

    const factor = item.grams / 100;
    totalGrams += item.grams;
    calories += fruit.nutritions.calories * factor;
    carbohydrates += fruit.nutritions.carbohydrates * factor;
    sugar += fruit.nutritions.sugar * factor;
    protein += fruit.nutritions.protein * factor;
    fat += fruit.nutritions.fat * factor;
  });

  return {
    totalGrams,
    calories: Math.round(calories),
    carbohydrates: Number(carbohydrates.toFixed(1)),
    sugar: Number(sugar.toFixed(1)),
    protein: Number(protein.toFixed(1)),
    fat: Number(fat.toFixed(1))
  };
}

export function renderBowl() {
  const listContainer = document.getElementById('calc-items-list');
  const totalsContainer = document.getElementById('calc-totals-display');
  const donutContainer = document.getElementById('calc-donut-display');
  const countBadge = document.getElementById('calc-items-count');

  if (!listContainer || !totalsContainer) return;

  if (countBadge) {
    countBadge.textContent = `${bowlItems.length} fruta${bowlItems.length === 1 ? '' : 's'}`;
  }

  if (bowlItems.length === 0) {
    listContainer.innerHTML = `
      <div class="bowl-empty-state">
        <span class="empty-icon">🥣</span>
        <p>Tu tazón o batido está vacío.</p>
        <small>Selecciona frutas arriba o pulsa "+ Agregar al Bowl" en cualquier fruta del explorador.</small>
      </div>
    `;
    totalsContainer.innerHTML = `
      <div class="empty-totals-msg">Agrega frutas para calcular nutrientes en tiempo real.</div>
    `;
    if (donutContainer) donutContainer.innerHTML = '';
    return;
  }

  // Lista de ingredientes en el bowl
  listContainer.innerHTML = bowlItems.map(item => {
    const fruit = allFruits.find(f => f.id === item.fruitId);
    if (!fruit) return '';

    const factor = item.grams / 100;
    const itemCal = Math.round(fruit.nutritions.calories * factor);
    const itemSugar = (fruit.nutritions.sugar * factor).toFixed(1);

    return `
      <div class="bowl-item-row" data-id="${fruit.id}">
        <div class="bowl-item-main">
          <span class="bowl-item-emoji">${fruit.emoji}</span>
          <div class="bowl-item-info">
            <span class="bowl-item-name">${fruit.spanishName || fruit.name}</span>
            <span class="bowl-item-sub">${itemCal} kcal · ${itemSugar}g azúcar</span>
          </div>
        </div>
        <div class="bowl-item-controls">
          <div class="grams-input-wrap">
            <input 
              type="number" 
              class="grams-spinner" 
              value="${item.grams}" 
              min="10" 
              max="1000" 
              step="10"
              data-id="${fruit.id}"
            />
            <span class="unit-tag">g</span>
          </div>
          <button class="bowl-remove-btn" title="Eliminar del tazón" data-id="${fruit.id}">✕</button>
        </div>
      </div>
    `;
  }).join('');

  // Event listeners para controles dinámicos de inputs y botones de eliminar
  listContainer.querySelectorAll('.grams-spinner').forEach(inp => {
    inp.addEventListener('change', (e) => {
      const id = Number(e.target.dataset.id);
      updateItemGrams(id, Number(e.target.value));
    });
  });

  listContainer.querySelectorAll('.bowl-remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = Number(e.target.dataset.id);
      removeFruitFromBowl(id);
    });
  });

  // Calcular totales
  const totals = calculateTotals();

  totalsContainer.innerHTML = `
    <div class="totals-dashboard-card">
      <div class="totals-main-summary">
        <div class="total-cal-block">
          <span class="total-cal-number">${totals.calories}</span>
          <span class="total-cal-unit">kcal totales</span>
          <span class="total-weight-tag">Peso total: ${totals.totalGrams}g</span>
        </div>
        <div class="totals-grid-stats">
          <div class="t-stat t-sugar">
            <span class="t-label">Azúcares</span>
            <span class="t-val">${totals.sugar}g</span>
          </div>
          <div class="t-stat t-carbs">
            <span class="t-label">Carbohidratos</span>
            <span class="t-val">${totals.carbohydrates}g</span>
          </div>
          <div class="t-stat t-prot">
            <span class="t-label">Proteínas</span>
            <span class="t-val">${totals.protein}g</span>
          </div>
          <div class="t-stat t-fat">
            <span class="t-label">Grasas</span>
            <span class="t-val">${totals.fat}g</span>
          </div>
        </div>
      </div>
    </div>
  `;

  if (donutContainer) {
    donutContainer.innerHTML = `
      <div class="calc-donut-card">
        <h4>Distribución de Macronutrientes</h4>
        ${renderMacroDonutSVG(totals, 200)}
      </div>
    `;
  }
}

function copyRecipeSummary() {
  const totals = calculateTotals();
  if (bowlItems.length === 0) return;

  let text = `🥣 Mi Receta NutriFrutas:\n\n`;
  bowlItems.forEach(item => {
    const fruit = allFruits.find(f => f.id === item.fruitId);
    if (fruit) {
      text += `• ${item.grams}g de ${fruit.spanishName || fruit.name} (${fruit.emoji})\n`;
    }
  });

  text += `\n📊 Información Nutricional Total:\n`;
  text += `- Calorías: ${totals.calories} kcal\n`;
  text += `- Azúcares: ${totals.sugar}g\n`;
  text += `- Carbohidratos: ${totals.carbohydrates}g\n`;
  text += `- Proteínas: ${totals.protein}g\n`;
  text += `- Grasas: ${totals.fat}g\n`;
  text += `- Peso Total: ${totals.totalGrams}g\n`;

  navigator.clipboard.writeText(text).then(() => {
    const copyBtn = document.getElementById('calc-copy-btn');
    if (copyBtn) {
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = '✓ ¡Copiado al Portapapeles!';
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
      }, 2200);
    }
  }).catch(() => {
    alert('Resumen copiado a tu portapapeles.');
  });
}
