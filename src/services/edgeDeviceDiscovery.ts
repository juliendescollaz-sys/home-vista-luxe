/**
 * Service de découverte automatique des edge devices Neolia sur le réseau local
 *
 * Ce service scanne le réseau local pour trouver automatiquement les
 * devices N100/Raspberry Pi qui exécutent MediaMTX.
 */

export interface EdgeDevice {
  /** Adresse IP du device */
  ip: string;

  /** Port MediaMTX */
  port: number;

  /** Hostname si disponible (via mDNS) */
  hostname?: string;

  /** Temps de réponse en ms */
  latency: number;
}

/**
 * Teste si un edge device Neolia est accessible à une IP donnée
 */
async function testEdgeDevice(ip: string, port: number): Promise<EdgeDevice | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000); // 1s timeout

    const startTime = performance.now();

    const response = await fetch(`http://${ip}:${port}/v3/config/global/get`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const latency = Math.round(performance.now() - startTime);
      console.log(`✅ Found edge device at ${ip}:${port} (${latency}ms)`);

      return {
        ip,
        port,
        latency,
      };
    }

    return null;
  } catch (err) {
    // Timeout ou erreur réseau = pas de device ici
    return null;
  }
}

/**
 * Scanne une plage d'IPs pour trouver des edge devices
 * @param subnet Base du subnet (ex: "192.168.1")
 * @param start Première IP à scanner (ex: 1)
 * @param end Dernière IP à scanner (ex: 254)
 * @param port Port MediaMTX (8890)
 * @param onProgress Callback de progression
 */
async function scanSubnet(
  subnet: string,
  start: number,
  end: number,
  port: number,
  onProgress?: (scanned: number, total: number) => void
): Promise<EdgeDevice[]> {
  const total = end - start + 1;
  const devices: EdgeDevice[] = [];

  // Scanner par batch de 20 IPs en parallèle pour ne pas surcharger
  const BATCH_SIZE = 20;

  for (let i = start; i <= end; i += BATCH_SIZE) {
    const batchEnd = Math.min(i + BATCH_SIZE - 1, end);
    const promises: Promise<EdgeDevice | null>[] = [];

    for (let j = i; j <= batchEnd; j++) {
      const ip = `${subnet}.${j}`;
      promises.push(testEdgeDevice(ip, port));
    }

    const results = await Promise.all(promises);

    for (const device of results) {
      if (device) {
        devices.push(device);
      }
    }

    if (onProgress) {
      onProgress(Math.min(batchEnd, end) - start + 1, total);
    }
  }

  return devices;
}

/**
 * Découvre automatiquement les edge devices Neolia sur le réseau local
 *
 * Cette fonction scanne les plages d'IPs privées courantes pour trouver
 * des edge devices.
 *
 * @param onProgress Callback appelé pendant le scan avec (scanned, total)
 * @returns Liste des devices trouvés, triés par latence (le plus rapide en premier)
 */
export async function discoverEdgeDevices(
  onProgress?: (scanned: number, total: number) => void
): Promise<EdgeDevice[]> {
  const PORT = 8890; // Caddy proxy devant MediaMTX

  console.log('🔍 Starting edge device discovery...');

  // Scanner les subnets les plus courants
  const subnetsToScan = [
    { subnet: '192.168.1', start: 1, end: 254 }, // Le plus courant
    { subnet: '192.168.0', start: 1, end: 254 }, // Deuxième plus courant
    { subnet: '10.0.0', start: 1, end: 254 },    // Réseaux d'entreprise
  ];

  const allDevices: EdgeDevice[] = [];

  for (const { subnet, start, end } of subnetsToScan) {
    console.log(`🔍 Scanning ${subnet}.${start}-${end}...`);

    const devices = await scanSubnet(subnet, start, end, PORT, onProgress);

    allDevices.push(...devices);

    // Si on a trouvé des devices, on arrête le scan
    // (on suppose qu'ils sont tous sur le même subnet)
    if (devices.length > 0) {
      console.log(`✅ Found ${devices.length} device(s) on ${subnet}.0/24, stopping scan`);
      break;
    }
  }

  // Trier par latence (le plus rapide en premier)
  allDevices.sort((a, b) => a.latency - b.latency);

  console.log(`✅ Discovery complete: found ${allDevices.length} device(s)`);

  return allDevices;
}
