package com.neolia.panel.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.neolia.panel.ha.HAEntity

/**
 * Card d'appareil pour le Panel
 * Optimisee pour ecran 8" tactile
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeviceCard(
    entity: HAEntity,
    onToggle: () -> Unit,
    showFavoriteIcon: Boolean = false,
    modifier: Modifier = Modifier
) {
    val isActive = entity.isOn
    val icon = getEntityIcon(entity)
    val displayName = entity.friendlyName

    Card(
        onClick = onToggle,
        modifier = modifier
            .fillMaxWidth()
            .height(100.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isActive) {
                MaterialTheme.colorScheme.primaryContainer
            } else {
                MaterialTheme.colorScheme.surfaceVariant
            }
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Icone de l'appareil
            Surface(
                color = if (isActive) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                },
                shape = MaterialTheme.shapes.medium,
                modifier = Modifier.size(48.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = if (isActive) {
                            MaterialTheme.colorScheme.onPrimary
                        } else {
                            MaterialTheme.colorScheme.onSurfaceVariant
                        },
                        modifier = Modifier.size(24.dp)
                    )
                }
            }

            // Nom et etat
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = displayName,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = getStateText(entity),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // Icone favori si demandee
            if (showFavoriteIcon) {
                Icon(
                    imageVector = Icons.Default.Favorite,
                    contentDescription = "Favori",
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}

/**
 * Retourne l'icone appropriee selon le domaine de l'entite
 */
private fun getEntityIcon(entity: HAEntity): ImageVector {
    return when (entity.domain) {
        "light" -> Icons.Default.Star // TODO: Remplacer par Lightbulb
        "switch" -> Icons.Default.ToggleOn
        "fan" -> Icons.Default.Air
        "cover" -> if (entity.state == "open") Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown
        "media_player" -> Icons.Default.PlayArrow
        "climate" -> Icons.Default.Thermostat
        "vacuum" -> Icons.Default.CleaningServices
        "lock" -> if (entity.state == "locked") Icons.Default.Lock else Icons.Default.LockOpen
        "scene" -> Icons.Default.Movie
        else -> Icons.Default.Devices
    }
}

/**
 * Retourne le texte d'etat localise
 */
private fun getStateText(entity: HAEntity): String {
    return when (entity.state) {
        "on" -> "Allumé"
        "off" -> "Éteint"
        "playing" -> "Lecture"
        "paused" -> "Pause"
        "idle" -> "Inactif"
        "open" -> "Ouvert"
        "closed" -> "Fermé"
        "opening" -> "Ouverture..."
        "closing" -> "Fermeture..."
        "locked" -> "Verrouillé"
        "unlocked" -> "Déverrouillé"
        "heat" -> "Chauffage"
        "cool" -> "Climatisation"
        "cleaning" -> "Nettoyage"
        "unavailable" -> "Indisponible"
        else -> entity.state
    }
}
