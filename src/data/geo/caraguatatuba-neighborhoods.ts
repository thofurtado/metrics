/**
 * Base de Dados Geográfica de Bairros de Caraguatatuba - SP
 * Mapeamento geocodificado com coordenadas (lat, lng), regiões e bairros âncora populares.
 */

export interface NeighborhoodGeo {
  name: string
  lat: number
  lng: number
  region: 'Norte' | 'Centro-Norte' | 'Centro' | 'Sul'
  popularAnchor: string
}

export const CARAGUATATUBA_NEIGHBORHOODS: NeighborhoodGeo[] = [
  // ─── REGIÃO NORTE (Massaguaçu / Capricórnio / Tabatinga) ───
  { name: 'Balneário Copacabana', lat: -23.5852, lng: -45.3481, region: 'Norte', popularAnchor: 'Massaguaçu / Norte' },
  { name: 'Balneário Delfim Verde', lat: -23.5815, lng: -45.3423, region: 'Norte', popularAnchor: 'Massaguaçu / Norte' },
  { name: 'Balneário Garden Mar', lat: -23.5791, lng: -45.3385, region: 'Norte', popularAnchor: 'Massaguaçu / Norte' },
  { name: 'Balneário Mar Azul', lat: -23.5768, lng: -45.3340, region: 'Norte', popularAnchor: 'Massaguaçu / Norte' },
  { name: 'Balneário Parnaso', lat: -23.5830, lng: -45.3450, region: 'Norte', popularAnchor: 'Massaguaçu / Norte' },
  { name: 'Balneário Santa Martha', lat: -23.5745, lng: -45.3302, region: 'Norte', popularAnchor: 'Massaguaçu / Norte' },
  { name: 'Bairro do Marisco', lat: -23.5890, lng: -45.3560, region: 'Norte', popularAnchor: 'Massaguaçu / Norte' },
  { name: 'Bosque dos Guarandis', lat: -23.5865, lng: -45.3510, region: 'Norte', popularAnchor: 'Massaguaçu / Norte' },
  { name: 'Capricórnio I', lat: -23.5930, lng: -45.3625, region: 'Norte', popularAnchor: 'Capricórnio' },
  { name: 'Capricórnio III', lat: -23.5975, lng: -45.3680, region: 'Norte', popularAnchor: 'Capricórnio' },
  { name: 'Costa Verde', lat: -23.5680, lng: -45.3180, region: 'Norte', popularAnchor: 'Mocóca' },
  { name: 'Jetuba', lat: -23.6012, lng: -45.3750, region: 'Norte', popularAnchor: 'Jetuba' },
  { name: 'Massaguaçú', lat: -23.5820, lng: -45.3400, region: 'Norte', popularAnchor: 'Massaguaçu' },
  { name: 'Mocóca', lat: -23.5620, lng: -45.3080, region: 'Norte', popularAnchor: 'Mocóca / Cocanha' },
  { name: 'Oceanica', lat: -23.5720, lng: -45.3240, region: 'Norte', popularAnchor: 'Massaguaçu / Norte' },
  { name: 'Portal da Fazendinha', lat: -23.5910, lng: -45.3590, region: 'Norte', popularAnchor: 'Capricórnio' },
  { name: 'Portal Patrimonium', lat: -23.5780, lng: -45.3360, region: 'Norte', popularAnchor: 'Massaguaçu' },
  { name: 'Residencial Marverde', lat: -23.5690, lng: -45.3210, region: 'Norte', popularAnchor: 'Mocóca' },
  { name: 'Sertão dos Tourinhos', lat: -23.5600, lng: -45.3150, region: 'Norte', popularAnchor: 'Mocóca' },
  { name: 'Tabatinga', lat: -23.5550, lng: -45.2950, region: 'Norte', popularAnchor: 'Tabatinga' },

  // ─── REGIÃO CENTRO-NORTE (Martim de Sá / Prainha / Casa Branca) ───
  { name: 'Casa Branca', lat: -23.6120, lng: -45.3980, region: 'Centro-Norte', popularAnchor: 'Casa Branca' },
  { name: 'Jardim Casa Branca', lat: -23.6100, lng: -45.3950, region: 'Centro-Norte', popularAnchor: 'Casa Branca' },
  { name: 'Jardim Olaria', lat: -23.6080, lng: -45.3900, region: 'Centro-Norte', popularAnchor: 'Olaria' },
  { name: 'Martin de Sá', lat: -23.6200, lng: -45.3950, region: 'Centro-Norte', popularAnchor: 'Martim de Sá' },
  { name: 'Prainha', lat: -23.6260, lng: -45.3990, region: 'Centro-Norte', popularAnchor: 'Prainha' },
  { name: 'Cidade Jardim', lat: -23.6220, lng: -45.4050, region: 'Centro-Norte', popularAnchor: 'Martim de Sá' },
  { name: 'Jardim Flôr do Mar', lat: -23.6140, lng: -45.3920, region: 'Centro-Norte', popularAnchor: 'Casa Branca' },
  { name: 'Jardim Balneário do Camburí', lat: -23.6060, lng: -45.3850, region: 'Centro-Norte', popularAnchor: 'Olaria' },
  { name: 'Jardim Camburi', lat: -23.6040, lng: -45.3820, region: 'Centro-Norte', popularAnchor: 'Olaria' },
  { name: 'Jardim Guaxinduba', lat: -23.6070, lng: -45.3880, region: 'Centro-Norte', popularAnchor: 'Olaria' },
  { name: 'Recanto do Sol', lat: -23.6110, lng: -45.3960, region: 'Centro-Norte', popularAnchor: 'Casa Branca' },

  // ─── REGIÃO CENTRAL (Centro / Ipiranga / Primavera / Tinga) ───
  { name: 'Centro', lat: -23.6265, lng: -45.4130, region: 'Centro', popularAnchor: 'Centro' },
  { name: 'Sumaré', lat: -23.6210, lng: -45.4120, region: 'Centro', popularAnchor: 'Centro' },
  { name: 'Ipiranga', lat: -23.6300, lng: -45.4180, region: 'Centro', popularAnchor: 'Centro' },
  { name: 'Jardim Primavera', lat: -23.6280, lng: -45.4220, region: 'Centro', popularAnchor: 'Centro' },
  { name: 'Jardim Jaqueira', lat: -23.6240, lng: -45.4200, region: 'Centro', popularAnchor: 'Centro' },
  { name: 'Jardim Arouca', lat: -23.6290, lng: -45.4150, region: 'Centro', popularAnchor: 'Centro' },
  { name: 'Jardim Brasil', lat: -23.6310, lng: -45.4140, region: 'Centro', popularAnchor: 'Centro' },
  { name: 'Jardim São Francisco', lat: -23.6250, lng: -45.4250, region: 'Centro', popularAnchor: 'Centro' },
  { name: 'Benfica', lat: -23.6270, lng: -45.4280, region: 'Centro', popularAnchor: 'Centro' },
  { name: 'Ponte Seca', lat: -23.6330, lng: -45.4240, region: 'Centro', popularAnchor: 'Tinga' },
  { name: 'Tinga', lat: -23.6380, lng: -45.4280, region: 'Centro', popularAnchor: 'Tinga' },
  { name: 'Balneário Poiares', lat: -23.6350, lng: -45.4190, region: 'Centro', popularAnchor: 'Poiares' },
  { name: 'Jaraguazinho', lat: -23.6320, lng: -45.4310, region: 'Centro', popularAnchor: 'Jaraguazinho' },
  { name: 'Rio do Ouro', lat: -23.6180, lng: -45.4320, region: 'Centro', popularAnchor: 'Rio do Ouro' },

  // ─── REGIÃO SUL (Indaiá / Britânia / Palmeiras / Porto Novo / Perequê) ───
  { name: 'Indaiá', lat: -23.6420, lng: -45.4200, region: 'Sul', popularAnchor: 'Indaiá' },
  { name: 'Jardim Aruan', lat: -23.6490, lng: -45.4230, region: 'Sul', popularAnchor: 'Aruan' },
  { name: 'Jardim Britânia', lat: -23.6550, lng: -45.4260, region: 'Sul', popularAnchor: 'Britânia' },
  { name: 'Jardim Califórnia', lat: -23.6580, lng: -45.4290, region: 'Sul', popularAnchor: 'Britânia' },
  { name: 'Jardim do Sol', lat: -23.6520, lng: -45.4280, region: 'Sul', popularAnchor: 'Britânia' },
  { name: 'Jardim Itamar', lat: -23.6600, lng: -45.4320, region: 'Sul', popularAnchor: 'Palmeiras' },
  { name: 'Praia das Palmeiras', lat: -23.6680, lng: -45.4310, region: 'Sul', popularAnchor: 'Praia das Palmeiras' },
  { name: 'Pontal Santa Marina', lat: -23.6730, lng: -45.4350, region: 'Sul', popularAnchor: 'Porto Novo' },
  { name: 'Porto Novo', lat: -23.6820, lng: -45.4380, region: 'Sul', popularAnchor: 'Porto Novo' },
  { name: 'Golfinhos', lat: -23.6790, lng: -45.4450, region: 'Sul', popularAnchor: 'Porto Novo' },
  { name: 'Jardim dos Sindicatos', lat: -23.6850, lng: -45.4420, region: 'Sul', popularAnchor: 'Porto Novo' },
  { name: 'Jardim Progresso', lat: -23.6870, lng: -45.4460, region: 'Sul', popularAnchor: 'Porto Novo' },
  { name: 'Jardim Rio Santos', lat: -23.6910, lng: -45.4480, region: 'Sul', popularAnchor: 'Porto Novo' },
  { name: 'Jardim Tarumãs', lat: -23.6890, lng: -45.4520, region: 'Sul', popularAnchor: 'Porto Novo' },
  { name: 'Perequê Mirim', lat: -23.7020, lng: -45.4480, region: 'Sul', popularAnchor: 'Perequê Mirim' },
  { name: 'Pegorelli', lat: -23.7150, lng: -45.4550, region: 'Sul', popularAnchor: 'Pegorelli' },
  { name: 'Barranco Alto', lat: -23.7250, lng: -45.4620, region: 'Sul', popularAnchor: 'Barranco Alto' },
  { name: 'Morro do Algodão', lat: -23.6890, lng: -45.4320, region: 'Sul', popularAnchor: 'Morro do Algodão' },
  { name: 'Recanto Morro do Algodão', lat: -23.6930, lng: -45.4360, region: 'Sul', popularAnchor: 'Morro do Algodão' },
  { name: 'Jaraguá', lat: -23.7220, lng: -45.4420, region: 'Sul', popularAnchor: 'Sul Extremo' },
  { name: 'Rio Claro', lat: -23.6450, lng: -45.4480, region: 'Sul', popularAnchor: 'Indaiá / Interior' },
]

/**
 * Fórmula de Haversine: calcula a distância real em quilômetros entre dois pontos geográficos
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371 // Raio médio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Number((R * c).toFixed(2))
}

/**
 * Retorna todos os bairros dentro de um determinado raio (em KM) a partir do centro
 */
export function findNeighborhoodsWithinRadius(
  centerLat: number,
  centerLng: number,
  maxRadiusKm: number,
  neighborhoods: NeighborhoodGeo[] = CARAGUATATUBA_NEIGHBORHOODS,
): { neighborhood: NeighborhoodGeo; distanceKm: number }[] {
  return neighborhoods
    .map((n) => ({
      neighborhood: n,
      distanceKm: haversineDistanceKm(centerLat, centerLng, n.lat, n.lng),
    }))
    .filter((item) => item.distanceKm <= maxRadiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
}

/**
 * Encontra o bairro mais próximo de uma coordenada qualquer
 */
export function findNearestNeighborhood(
  targetLat: number,
  targetLng: number,
  neighborhoods: NeighborhoodGeo[] = CARAGUATATUBA_NEIGHBORHOODS,
): { neighborhood: NeighborhoodGeo; distanceKm: number } | null {
  if (!neighborhoods.length) return null
  let nearest = neighborhoods[0]
  let minDistance = haversineDistanceKm(targetLat, targetLng, nearest.lat, nearest.lng)

  for (let i = 1; i < neighborhoods.length; i++) {
    const dist = haversineDistanceKm(targetLat, targetLng, neighborhoods[i].lat, neighborhoods[i].lng)
    if (dist < minDistance) {
      minDistance = dist
      nearest = neighborhoods[i]
    }
  }

  return { neighborhood: nearest, distanceKm: minDistance }
}
