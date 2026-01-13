package com.neolia.panel.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Couleurs Neolia
val NeoliaBlue = Color(0xFF2196F3)
val NeoliaDarkBlue = Color(0xFF1565C0)
val NeoliaLightBlue = Color(0xFF64B5F6)
val NeoliaGreen = Color(0xFF4CAF50)
val NeoliaOrange = Color(0xFFFF9800)
val NeoliaRed = Color(0xFFE53935)

// Palette sombre
private val DarkColorScheme = darkColorScheme(
    primary = NeoliaBlue,
    onPrimary = Color.White,
    primaryContainer = NeoliaDarkBlue,
    secondary = NeoliaLightBlue,
    background = Color(0xFF121212),
    surface = Color(0xFF1E1E1E),
    onBackground = Color.White,
    onSurface = Color.White,
    error = NeoliaRed
)

// Palette claire
private val LightColorScheme = lightColorScheme(
    primary = NeoliaBlue,
    onPrimary = Color.White,
    primaryContainer = NeoliaLightBlue,
    secondary = NeoliaDarkBlue,
    background = Color(0xFFF5F5F5),
    surface = Color.White,
    onBackground = Color(0xFF1C1B1F),
    onSurface = Color(0xFF1C1B1F),
    error = NeoliaRed
)

@Composable
fun NeoliaTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography(),
        content = content
    )
}
