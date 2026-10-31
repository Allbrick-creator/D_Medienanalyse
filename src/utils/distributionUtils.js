// Verteilt 21 Pakete auf 4 Personen nach diesen Regeln:
// - Jede Person bekommt ca. 5–6 Pakete
// - Jeder Anbieter wird von mind. 3 verschiedenen Personen bewertet
// - Boulevard-Pakete werden gleichmässig verteilt
// Gibt ein Objekt zurück: { packageId: profileId }

export function distributePackages(packages, profiles) {
  if (!profiles.length || !packages.length) return {}

  const n = profiles.length

  // Pakete nach Anbieter gruppieren, sortiert nach Tag
  const byProvider = {}
  for (const pkg of packages) {
    const key = pkg.provider_id
    if (!byProvider[key]) byProvider[key] = []
    byProvider[key].push(pkg)
  }

  // Anbieter nach Typ klassifizieren
  const allProviders = Object.entries(byProvider).map(([id, pkgs]) => ({
    id,
    type: pkgs[0]?.providers?.type ?? 'oeffentlich',
    pkgs: [...pkgs].sort((a, b) => a.day - b.day),
  }))

  // Typen aufteilen und verschränken: b, o, q, b, o, q, o
  // → Boulevard-Pakete sind über alle Positionen verteilt
  const boulevard   = allProviders.filter(p => p.type === 'boulevard')
  const oeffentlich = allProviders.filter(p => p.type === 'oeffentlich')
  const qualitaet   = allProviders.filter(p => p.type === 'qualitaet')

  const interleaved = []
  const maxLen = Math.max(boulevard.length, oeffentlich.length, qualitaet.length)
  for (let i = 0; i < maxLen; i++) {
    if (boulevard[i])   interleaved.push(boulevard[i])
    if (oeffentlich[i]) interleaved.push(oeffentlich[i])
    if (qualitaet[i])   interleaved.push(qualitaet[i])
  }

  // Zuteilung per Rotation: jeder Anbieter startet mit einer anderen Person
  const result = {}
  interleaved.forEach((provider, providerIdx) => {
    const startPerson = providerIdx % n
    provider.pkgs.forEach((pkg, dayIdx) => {
      const personIdx = (startPerson + dayIdx) % n
      result[pkg.id] = profiles[personIdx].id
    })
  })

  return result
}

// Prüft ob bereits Pakete zugewiesen sind
export function hasExistingAssignments(packages) {
  return packages.some(p => p.assigned_to != null)
}
