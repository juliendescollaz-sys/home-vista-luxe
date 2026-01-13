package com.neolia.panel.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.neolia.panel.ha.HAEntity
import com.neolia.panel.ha.HomeAssistantClient
import com.neolia.panel.ui.components.DeviceCard
import com.neolia.panel.ui.components.WeatherCard
import kotlinx.coroutines.launch

/**
 * Ecran d'accueil du Panel
 * Affiche meteo + appareils actifs
 */
@Composable
fun HomeScreen(
    haClient: HomeAssistantClient?,
    modifier: Modifier = Modifier
) {
    val entities by haClient?.entities?.collectAsState() ?: remember { mutableStateOf(emptyMap()) }
    val connectionState by haClient?.connectionState?.collectAsState()
        ?: remember { mutableStateOf(HomeAssistantClient.ConnectionState.DISCONNECTED) }
    val scope = rememberCoroutineScope()

    // Filtrer les appareils actifs (on, playing, open)
    val activeDevices = remember(entities) {
        entities.values.filter { entity ->
            val domain = entity.domain
            val state = entity.state

            // Domaines controlables
            val isControllable = domain in listOf(
                "light", "switch", "fan", "cover", "media_player",
                "climate", "vacuum", "lock", "scene"
            )

            // Etats actifs
            val isActive = state in listOf("on", "playing", "open", "opening", "closing", "heat", "cool", "cleaning")

            isControllable && isActive && !entity.isUnavailable
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp, vertical = 16.dp)
    ) {
        // Section Meteo
        WeatherCard(
            entities = entities,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Section Appareils actifs
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Appareils actifs",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold
            )

            // Indicateur de connexion
            Surface(
                color = when (connectionState) {
                    HomeAssistantClient.ConnectionState.CONNECTED -> MaterialTheme.colorScheme.primary
                    HomeAssistantClient.ConnectionState.CONNECTING,
                    HomeAssistantClient.ConnectionState.AUTHENTICATING -> MaterialTheme.colorScheme.tertiary
                    else -> MaterialTheme.colorScheme.error
                },
                shape = MaterialTheme.shapes.small
            ) {
                Text(
                    text = when (connectionState) {
                        HomeAssistantClient.ConnectionState.CONNECTED -> "Connecté"
                        HomeAssistantClient.ConnectionState.CONNECTING -> "Connexion..."
                        HomeAssistantClient.ConnectionState.AUTHENTICATING -> "Auth..."
                        else -> "Déconnecté"
                    },
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onPrimary
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (activeDevices.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Aucun appareil actif",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.weight(1f)
            ) {
                items(activeDevices) { entity ->
                    DeviceCard(
                        entity = entity,
                        onToggle = {
                            scope.launch {
                                haClient?.toggleEntity(entity.entityId)
                            }
                        }
                    )
                }
            }
        }
    }
}
