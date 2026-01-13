package com.neolia.panel.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.ui.graphics.vector.ImageVector

/**
 * Routes de navigation du Panel
 */
enum class NavRoute(
    val route: String,
    val label: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
) {
    HOME(
        route = "home",
        label = "Accueil",
        selectedIcon = Icons.Filled.Home,
        unselectedIcon = Icons.Outlined.Home
    ),
    ROOMS(
        route = "rooms",
        label = "Pièces",
        selectedIcon = Icons.Filled.Home, // TODO: Icone MeetingRoom
        unselectedIcon = Icons.Outlined.Home
    ),
    FAVORITES(
        route = "favorites",
        label = "Favoris",
        selectedIcon = Icons.Filled.Favorite,
        unselectedIcon = Icons.Outlined.FavoriteBorder
    ),
    SETTINGS(
        route = "settings",
        label = "Paramètres",
        selectedIcon = Icons.Filled.Settings,
        unselectedIcon = Icons.Outlined.Settings
    );

    companion object {
        fun fromRoute(route: String): NavRoute {
            return values().find { it.route == route } ?: HOME
        }
    }
}
