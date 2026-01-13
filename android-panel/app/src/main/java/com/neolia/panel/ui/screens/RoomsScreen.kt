package com.neolia.panel.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.neolia.panel.ha.HAEntity
import com.neolia.panel.ha.HomeAssistantClient
import com.neolia.panel.ui.components.DeviceCard
import kotlinx.coroutines.launch

/**
 * Ecran des pieces du Panel
 * Affiche les pieces avec leurs appareils
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoomsScreen(
    haClient: HomeAssistantClient?,
    modifier: Modifier = Modifier
) {
    val entities by haClient?.entities?.collectAsState() ?: remember { mutableStateOf(emptyMap()) }
    val scope = rememberCoroutineScope()

    // Extraire les pieces depuis les entity_id (ex: light.salon_plafond -> Salon)
    val rooms = remember(entities) {
        entities.values
            .filter { entity ->
                entity.domain in listOf("light", "switch", "fan", "cover", "media_player", "climate")
            }
            .groupBy { entity ->
                // Extraire le nom de la piece depuis l'entity_id ou friendly_name
                val parts = entity.entityId.substringAfter(".").split("_")
                if (parts.isNotEmpty()) {
                    parts.first().replaceFirstChar { it.uppercase() }
                } else {
                    "Autre"
                }
            }
            .toSortedMap()
    }

    var selectedRoom by remember { mutableStateOf<String?>(null) }

    if (selectedRoom != null) {
        // Vue detaillee d'une piece
        val roomEntities = rooms[selectedRoom] ?: emptyList()

        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp, vertical = 16.dp)
        ) {
            // Header avec bouton retour
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                IconButton(onClick = { selectedRoom = null }) {
                    Icon(
                        imageVector = Icons.Default.ArrowBack,
                        contentDescription = "Retour"
                    )
                }
                Text(
                    text = selectedRoom ?: "",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.weight(1f)
            ) {
                items(roomEntities) { entity ->
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
    } else {
        // Liste des pieces
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp, vertical = 16.dp)
        ) {
            Text(
                text = "Pièces",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(16.dp))

            if (rooms.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Aucune pièce détectée",
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
                    items(rooms.keys.toList()) { roomName ->
                        RoomCard(
                            name = roomName,
                            deviceCount = rooms[roomName]?.size ?: 0,
                            activeCount = rooms[roomName]?.count { it.isOn } ?: 0,
                            onClick = { selectedRoom = roomName }
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RoomCard(
    name: String,
    deviceCount: Int,
    activeCount: Int,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .height(120.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (activeCount > 0) {
                MaterialTheme.colorScheme.primaryContainer
            } else {
                MaterialTheme.colorScheme.surfaceVariant
            }
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = name,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "$deviceCount appareils",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                if (activeCount > 0) {
                    Surface(
                        color = MaterialTheme.colorScheme.primary,
                        shape = MaterialTheme.shapes.small
                    ) {
                        Text(
                            text = "$activeCount actif${if (activeCount > 1) "s" else ""}",
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                    }
                }
            }
        }
    }
}
