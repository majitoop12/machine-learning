/**
 * Servicio API para Fruityvice con gestión de caché,
 * conexión en vivo, proxies CORS y respaldo automático sin fallos.
 */
import { FRUITS_DATABASE, SPANISH_TO_ENGLISH_MAP } from './data.js';

const FRUITYVICE_API_URL = 'https://www.fruityvice.com/api/fruit/all';
const CORS_PROXY_URL = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(FRUITYVICE_API_URL);

let cachedFruits = null;
let currentDataSource = 'local'; // 'live', 'proxy', or 'local'

/**
 * Enriquecer frutas de la API con metadatos en español, emojis y beneficios
 */
function enrichFruitData(apiFruit) {
  const localMatch = FRUITS_DATABASE.find(
    f => f.id === apiFruit.id || f.name.toLowerCase() === apiFruit.name.toLowerCase()
  );

  if (localMatch) {
    return {
      ...apiFruit,
      spanishName: localMatch.spanishName,
      emoji: localMatch.emoji,
      accentColor: localMatch.accentColor,
      bgGradient: localMatch.bgGradient,
      benefits: localMatch.benefits,
      nutritions: {
        calories: Number(apiFruit.nutritions?.calories ?? localMatch.nutritions.calories),
        fat: Number(apiFruit.nutritions?.fat ?? localMatch.nutritions.fat),
        sugar: Number(apiFruit.nutritions?.sugar ?? localMatch.nutritions.sugar),
        carbohydrates: Number(apiFruit.nutritions?.carbohydrates ?? localMatch.nutritions.carbohydrates),
        protein: Number(apiFruit.nutritions?.protein ?? localMatch.nutritions.protein)
      }
    };
  }

  // Si es una fruta nueva de la API que no estaba en local
  return {
    ...apiFruit,
    spanishName: apiFruit.name,
    emoji: '🍎',
    accentColor: '#10b981',
    bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.05))',
    benefits: ['Aporte de nutrientes y micronutrientes naturales', 'Rica en agua y fibra'],
    nutritions: {
      calories: Number(apiFruit.nutritions?.calories || 0),
      fat: Number(apiFruit.nutritions?.fat || 0),
      sugar: Number(apiFruit.nutritions?.sugar || 0),
      carbohydrates: Number(apiFruit.nutritions?.carbohydrates || 0),
      protein: Number(apiFruit.nutritions?.protein || 0)
    }
  };
}

/**
 * Obtener todas las frutas desde la API con tolerancia a fallos y carga instantánea
 */
export async function getFruits() {
  if (cachedFruits && cachedFruits.length > 0) {
    return { data: cachedFruits, source: currentDataSource };
  }

  // 1. Intento con el proxy interno del servidor local (/api/fruits)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch('/api/fruits', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await response.json();
      if (result && Array.isArray(result.data) && result.data.length > 0) {
        cachedFruits = result.data.map(enrichFruitData);
        currentDataSource = result.source === 'backend-live' ? 'live' : 'proxy';
        return { data: cachedFruits, source: currentDataSource };
      }
    }
  } catch (err) {
    // Si no está corriendo el servidor con proxy (ej. Live Server o Python), continuar
  }

  // 2. Intento directo a Fruityvice (por si tiene CORS habilitado o extensión CORS activa)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const response = await fetch(FRUITYVICE_API_URL, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const rawData = await response.json();
      if (Array.isArray(rawData) && rawData.length > 0) {
        cachedFruits = rawData.map(enrichFruitData);
        currentDataSource = 'live';
        return { data: cachedFruits, source: currentDataSource };
      }
    }
  } catch (err) {
    // Silencioso: esperado en navegadores sin proxy por restricciones CORS
  }

  // 3. Fallback ultra rápido a base de datos local enriquecida (Cero espera para el usuario)
  cachedFruits = [...FRUITS_DATABASE];
  currentDataSource = 'local';
  return { data: cachedFruits, source: currentDataSource };
}

/**
 * Filtrar frutas según texto, perfil nutricional y familia
 */
export function filterFruitsList(fruits, { query = '', family = 'all', nutritionFilter = 'all', sortBy = 'name_asc' }) {
  let filtered = [...fruits];

  // Filtro por término de búsqueda (soporta español e inglés)
  if (query && query.trim() !== '') {
    const cleanQuery = query.toLowerCase().trim();
    const englishEquivalent = SPANISH_TO_ENGLISH_MAP[cleanQuery] || cleanQuery;

    filtered = filtered.filter(fruit => {
      const nameMatch = fruit.name.toLowerCase().includes(cleanQuery) || fruit.name.toLowerCase().includes(englishEquivalent.toLowerCase());
      const esMatch = (fruit.spanishName || '').toLowerCase().includes(cleanQuery);
      const familyMatch = (fruit.family || '').toLowerCase().includes(cleanQuery);
      const genusMatch = (fruit.genus || '').toLowerCase().includes(cleanQuery);
      return nameMatch || esMatch || familyMatch || genusMatch;
    });
  }

  // Filtro por familia
  if (family && family !== 'all') {
    filtered = filtered.filter(f => f.family === family);
  }

  // Filtro por perfil nutricional
  if (nutritionFilter && nutritionFilter !== 'all') {
    switch (nutritionFilter) {
      case 'low_calorie': // < 50 kcal
        filtered = filtered.filter(f => f.nutritions.calories < 50);
        break;
      case 'low_sugar': // < 7g de azúcar
        filtered = filtered.filter(f => f.nutritions.sugar < 7);
        break;
      case 'high_protein': // >= 1.2g de proteína
        filtered = filtered.filter(f => f.nutritions.protein >= 1.2);
        break;
      case 'high_carb': // >= 15g carbohidratos (energéticas)
        filtered = filtered.filter(f => f.nutritions.carbohydrates >= 15);
        break;
      case 'keto_friendly': // < 5g azúcar y bajas en carbohidratos netos
        filtered = filtered.filter(f => f.nutritions.sugar <= 5);
        break;
    }
  }

  // Ordenamiento
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'name_asc':
        return (a.spanishName || a.name).localeCompare(b.spanishName || b.name);
      case 'name_desc':
        return (b.spanishName || b.name).localeCompare(a.spanishName || a.name);
      case 'calories_asc':
        return a.nutritions.calories - b.nutritions.calories;
      case 'calories_desc':
        return b.nutritions.calories - a.nutritions.calories;
      case 'sugar_asc':
        return a.nutritions.sugar - b.nutritions.sugar;
      case 'sugar_desc':
        return b.nutritions.sugar - a.nutritions.sugar;
      case 'protein_desc':
        return b.nutritions.protein - a.nutritions.protein;
      case 'carbs_desc':
        return b.nutritions.carbohydrates - a.nutritions.carbohydrates;
      default:
        return 0;
    }
  });

  return filtered;
}

/**
 * Obtener lista única de familias botánicas
 */
export function getUniqueFamilies(fruits) {
  const set = new Set();
  fruits.forEach(f => {
    if (f.family) set.add(f.family);
  });
  return Array.from(set).sort();
}
