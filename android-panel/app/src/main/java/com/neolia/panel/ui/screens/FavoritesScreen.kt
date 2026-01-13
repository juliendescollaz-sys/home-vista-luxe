package com.neolia.panel.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.neolia.panel.data.PanelConfig
import com.neolia.panel.ha.HomeAssistantClient
import com.neolia.panel.ui.components.DeviceCard
import kotlinx.coroutines.launch

/**
 * Ecran des favoris du Panel
 * Affiche les appareils marques comme favoris
 */
@Composable
fun FavoritesScreen(
    haClient: HomeAssistantClient?,
    modifier: Modifier = Modifier
) {
    val entities by haClient?.entities?.collectAsState() ?: remember { mutableStateOf(emptyMap()) }
    val scope = rememberCoroutineScope()

    // TODO: Implementer la persistance des favoris dans PanelConfig
    // Pour l'instant, on affiche tous les appareils controlables
    val favoriteEntities = remember(entities) {
        entities.values.filter { entity ->
            entity.domain in listOf(
                "light", "switch", "fan", "cover", "media_player",
                "climate", "vacuum", "lock"
            ) && !entity.isUnavailable
        }.take(12) // Limiter pour la demo
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp, vertical = 16.dp)
    ) {
        Text(
            text = "Favoris",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(16.dp))

        if (favoriteEntities.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Aucun favori",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Appuie longuement sur un appareil pour l'ajouter",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.weight(1f)
            ) {
                items(favoriteEntities) { entity ->
                    DeviceCard(
                        entity = entity,
                        onToggle = {
                            scope.launch {
                                haClient?.toggleEntity(entity.entityId)
                            }
                        },
                        showFavoriteIcon = true
                    )
                }
            }
        }
    }
}
