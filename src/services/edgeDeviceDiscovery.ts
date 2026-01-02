/**
 * Service de découverte automatique des edge devices Neolia sur le réseau local
 *
 * Utilise mDNS pour découvrir les edge devices avec le hostname neolia-n100.local
 * Plus fiable et rapide que le scan d'IPs.
 */

export interface EdgeDevice {
  /** Adresse IP du device (résolue via mDNS ou directement) */
  ip: string;

  /** Port MediaMTX */
  port: number;

  /** Hostname mDNS (ex: neolia-n100.local) */
  hostname: string;

  /** Temps de réponse en ms */
  latency: number;
}

/**
 * Teste si un edge device Neolia est accessible via son hostname
 */
async function testEdgeDevice(hostname: string, port: number): Promise<EdgeDevice | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const startTime = performance.now();

    const response = await fetch(`http://${hostname}:${port}/v3/config/global/get`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const latency = Math.round(performance.now() - startTime);
      console.log(`✅ Found edge device at ${hostname}:${port} (${latency}ms)`);

      // Le navigateur résout automatiquement le hostname via mDNS
      // On ne peut pas récupérer l'IP facilement, mais ce n'est pas grave
      // On utilisera le hostname pour se connecter
      return {
        ip: hostname, // On garde le hostname ici pour la connexion
        hostname,
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
 * Découvre automatiquement les edge devices Neolia sur le réseau local via mDNS
 *
 * Teste le hostname mDNS fixe `neolia-n100.local` configuré sur chaque N100.
 * Le navigateur résout automatiquement le hostname via mDNS (Avahi/Bonjour).
 *
 * @returns Liste des devices trouvés (normalement 1 seul par réseau)
 */
export async function discoverEdgeDevices(): Promise<EdgeDevice[]> {
  const PORT = 8890; // Caddy proxy devant MediaMTX
  const MDNS_HOSTNAME = 'neolia-n100.local';

  console.log('🔍 Starting edge device discovery via mDNS...');
  console.log(`   Looking for: ${MDNS_HOSTNAME}`);

  const device = await testEdgeDevice(MDNS_HOSTNAME, PORT);

  if (device) {
    console.log(`✅ Discovery complete: found ${MDNS_HOSTNAME}`);
    return [device];
  }

  console.log('ℹ️  No edge device found (N100 may not be on local network)');
  return [];
}
