// src/api/neoliaHaClient.ts

export interface NeoliaPanelConfig {
  neoliaCode: string;
  panelHost: string;
  mqttWsPort: number;
}

/**
 * Récupère la configuration Neolia exposée par Home Assistant
 * via le sensor `sensor.neolia_panel_config`.
 *
 * @param baseUrl URL de base du HA, ex: "http://192.168.1.80:8123"
 * @param token Token Long-Lived HA (Bearer)
 */
export async function fetchNeoliaPanelConfig(params: {
  baseUrl: string;
  token: string;
}): Promise<NeoliaPanelConfig> {
  const { baseUrl, token } = params;

  const url = `${baseUrl.replace(/\/+$/, "")}/api/states/sensor.neolia_panel_config`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Erreur ${response.status} lors de la récupération de sensor.neolia_panel_config`
    );
  }

  const data = await response.json();

  // Le champ "state" est un string JSON -> il faut le parser
  let parsed: any;
  try {
    parsed = JSON.parse(data.state);
  } catch (e) {
    console.error("Impossible de parser le champ 'state' :", data.state);
    throw new Error("Format invalide du sensor.neolia_panel_config");
  }

  return {
    neoliaCode: String(parsed.neolia_code ?? ""),
    panelHost: String(parsed.panel_host ?? ""),
    mqttWsPort: Number(parsed.mqtt_ws_port ?? 0),
  };
}
