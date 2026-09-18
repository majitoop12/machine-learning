/**
 * Módulo de visualización gráfica SVG interactiva y fluida
 * sin dependencias externas pesadas, 100% responsivo y estilizado.
 */

/**
 * Genera un gráfico de Dona SVG para los macronutrientes de una fruta
 * @param {Object} nutritions - { calories, fat, sugar, carbohydrates, protein }
 * @param {number} size - Dimensión en píxeles (default: 240)
 */
export function renderMacroDonutSVG(nutritions, size = 220) {
  const { calories, fat, sugar, carbohydrates, protein } = nutritions;

  // Calculamos masa neta de macros representados
  // Nota: azúcar está incluido dentro de carbohidratos en la mayoría de tablas,
  // pero para desglose visual claro mostramos: Carbohidratos complejos, Azúcares simples, Proteínas, Grasas
  const complexCarbs = Math.max(0, carbohydrates - sugar);
  const data = [
    { label: 'Azúcares', value: Math.max(0.1, sugar), color: '#ec4899', icon: '🍬' },
    { label: 'Carbohidratos complejos', value: Math.max(0.1, complexCarbs), color: '#f59e0b', icon: '🌾' },
    { label: 'Proteínas', value: Math.max(0.1, protein), color: '#8b5cf6', icon: '💪' },
    { label: 'Grasas', value: Math.max(0.1, fat), color: '#10b981', icon: '🥑' }
  ];

  const totalGrams = data.reduce((acc, d) => acc + d.value, 0);

  const radius = size * 0.38;
  const strokeWidth = size * 0.16;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let currentAngle = -90; // Empezar arriba
  let paths = '';

  data.forEach((item, index) => {
    const percentage = item.value / totalGrams;
    const strokeDasharray = `${circumference * percentage} ${circumference * (1 - percentage)}`;
    const strokeDashoffset = -circumference * (currentAngle + 90) / 360;

    paths += `
      <circle
        cx="${center}"
        cy="${center}"
        r="${radius}"
        fill="transparent"
        stroke="${item.color}"
        stroke-width="${strokeWidth}"
        stroke-dasharray="${strokeDasharray}"
        stroke-dashoffset="${strokeDashoffset}"
        stroke-linecap="round"
        class="donut-segment"
        data-label="${item.label}"
        data-grams="${item.value.toFixed(1)}g"
        data-percent="${(percentage * 100).toFixed(0)}%"
      >
        <title>${item.label}: ${item.value.toFixed(1)}g (${(percentage * 100).toFixed(0)}%)</title>
      </circle>
    `;

    currentAngle += percentage * 360;
  });

  return `
    <div class="donut-chart-container">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="donut-svg">
        <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="var(--border-subtle)" stroke-width="${strokeWidth}" opacity="0.25" />
        ${paths}
      </svg>
      <div class="donut-center-info">
        <span class="donut-kcal-val">${calories}</span>
        <span class="donut-kcal-label">kcal / 100g</span>
      </div>
    </div>
    <div class="donut-legend">
      ${data.map(d => `
        <div class="legend-item">
          <span class="legend-dot" style="background-color: ${d.color};"></span>
          <span class="legend-name">${d.label}</span>
          <span class="legend-qty">${d.value.toFixed(1)}g</span>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Genera un gráfico comparativo de barras horizontales entre 2 frutas
 */
export function renderComparisonBarSVG(fruitA, fruitB) {
  const metrics = [
    { key: 'calories', label: 'Calorías (kcal)', unit: ' kcal', max: 180, invertBest: true },
    { key: 'sugar', label: 'Azúcar (g)', unit: 'g', max: 25, invertBest: true },
    { key: 'carbohydrates', label: 'Carbohidratos (g)', unit: 'g', max: 30, invertBest: false },
    { key: 'protein', label: 'Proteína (g)', unit: 'g', max: 4, invertBest: false },
    { key: 'fat', label: 'Grasa (g)', unit: 'g', max: 16, invertBest: true }
  ];

  let rowsHtml = '';

  metrics.forEach(m => {
    const valA = Number(fruitA.nutritions[m.key] || 0);
    const valB = Number(fruitB.nutritions[m.key] || 0);

    const percentA = Math.min(100, Math.max(4, (valA / m.max) * 100));
    const percentB = Math.min(100, Math.max(4, (valB / m.max) * 100));

    // Determinar ganador contextual
    let winner = null;
    if (valA !== valB) {
      if (m.invertBest) {
        // En calorías y azúcar, menor suele ser preferido por dietas
        winner = valA < valB ? 'A' : 'B';
      } else {
        // En proteínas, mayor es preferido
        winner = valA > valB ? 'A' : 'B';
      }
    }

    rowsHtml += `
      <div class="compare-row">
        <div class="compare-row-header">
          <span class="compare-val-a ${winner === 'A' ? 'winner-val' : ''}">
            ${valA} ${m.unit} ${winner === 'A' ? '⭐' : ''}
          </span>
          <span class="compare-metric-title">${m.label}</span>
          <span class="compare-val-b ${winner === 'B' ? 'winner-val' : ''}">
            ${winner === 'B' ? '⭐' : ''} ${valB} ${m.unit}
          </span>
        </div>
        <div class="compare-dual-bars">
          <div class="bar-track left-track">
            <div class="bar-fill bar-a" style="width: ${percentA}%;"></div>
          </div>
          <div class="bar-divider"></div>
          <div class="bar-track right-track">
            <div class="bar-fill bar-b" style="width: ${percentB}%;"></div>
          </div>
        </div>
      </div>
    `;
  });

  return `
    <div class="comparison-bars-wrapper">
      <div class="compare-bars-header">
        <div class="header-fruit header-fruit-a">
          <span class="h-emoji">${fruitA.emoji}</span>
          <span class="h-name">${fruitA.spanishName || fruitA.name}</span>
        </div>
        <span class="vs-badge">VS</span>
        <div class="header-fruit header-fruit-b">
          <span class="h-emoji">${fruitB.emoji}</span>
          <span class="h-name">${fruitB.spanishName || fruitB.name}</span>
        </div>
      </div>
      <div class="compare-rows-list">
        ${rowsHtml}
      </div>
    </div>
  `;
}

/**
 * Medidor semáforo de densidad calórica
 */
export function renderCalorieMeter(calories) {
  let label = 'Baja densidad calórica';
  let badgeClass = 'meter-low';
  let percent = Math.min(100, (calories / 160) * 100);

  if (calories > 90) {
    label = 'Densidad energética alta';
    badgeClass = 'meter-high';
  } else if (calories > 55) {
    label = 'Densidad media moderada';
    badgeClass = 'meter-mid';
  }

  return `
    <div class="calorie-meter-widget">
      <div class="meter-header">
        <span class="meter-title">Densidad Calórica</span>
        <span class="meter-badge ${badgeClass}">${label}</span>
      </div>
      <div class="meter-track">
        <div class="meter-fill ${badgeClass}" style="width: ${percent}%;"></div>
      </div>
      <div class="meter-scale">
        <span>0 kcal</span>
        <span>50 kcal</span>
        <span>100 kcal</span>
        <span>150+ kcal</span>
      </div>
    </div>
  `;
}
