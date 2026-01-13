package com.neolia.panel.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neolia.panel.ha.HAEntity
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

/**
 * Card meteo pour le Panel
 * Affiche temperature et conditions
 */
@Composable
fun WeatherCard(
    entities: Map<String, HAEntity>,
    modifier: Modifier = Modifier
) {
    // Chercher l'entite meteo
    val weatherEntity = remember(entities) {
        entities.values.find { it.domain == "weather" }
    }

    // Chercher les capteurs de temperature
    val temperatureSensor = remember(entities) {
        entities.values.find {
            it.domain == "sensor" &&
            (it.entityId.contains("temperature") || it.entityId.contains("temp"))
        }
    }

    val temperature = weatherEntity?.attributes?.optDouble("temperature")
        ?: temperatureSensor?.state?.toDoubleOrNull()

    val condition = weatherEntity?.state ?: "unknown"
    val humidity = weatherEntity?.attributes?.optInt("humidity")

    val currentTime = remember {
        LocalDateTime.now().format(
            DateTimeFormatter.ofPattern("EEEE d MMMM", Locale.FRENCH)
        ).replaceFirstChar { it.uppercase() }
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Gauche: Date et condition
            Column {
                Text(
                    text = currentTime,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = getWeatherIcon(condition),
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(24.dp)
                    )
                    Text(
                        text = getConditionText(condition),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Droite: Temperature
            Row(
                verticalAlignment = Alignment.Top
            ) {
                Text(
                    text = temperature?.toInt()?.toString() ?: "--",
                    style = MaterialTheme.typography.displayLarge.copy(
                        fontSize = 64.sp,
                        fontWeight = FontWeight.Light
                    )
                )
                Text(
                    text = "°C",
                    style = MaterialTheme.typography.headlineMedium,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
        }

        // Ligne d'info supplementaire
        if (humidity != null) {
            Divider(
                modifier = Modifier.padding(horizontal = 24.dp),
                color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.WaterDrop,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(18.dp)
                    )
                    Text(
                        text = "Humidité: $humidity%",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

private fun getWeatherIcon(condition: String): ImageVector {
    return when (condition.lowercase()) {
        "sunny", "clear-night" -> Icons.Default.WbSunny
        "cloudy", "partlycloudy" -> Icons.Default.Cloud
        "rainy", "pouring" -> Icons.Default.WaterDrop
        "snowy", "snowy-rainy" -> Icons.Default.AcUnit
        "fog" -> Icons.Default.Cloud
        "windy", "exceptional" -> Icons.Default.Air
        "lightning", "lightning-rainy" -> Icons.Default.FlashOn
        else -> Icons.Default.WbSunny
    }
}

private fun getConditionText(condition: String): String {
    return when (condition.lowercase()) {
        "sunny" -> "Ensoleillé"
        "clear-night" -> "Nuit claire"
        "cloudy" -> "Nuageux"
        "partlycloudy" -> "Partiellement nuageux"
        "rainy" -> "Pluie"
        "pouring" -> "Fortes pluies"
        "snowy" -> "Neige"
        "snowy-rainy" -> "Neige fondue"
        "fog" -> "Brouillard"
        "windy" -> "Venteux"
        "lightning" -> "Orage"
        "lightning-rainy" -> "Orage avec pluie"
        "exceptional" -> "Exceptionnel"
        else -> condition
    }
}
