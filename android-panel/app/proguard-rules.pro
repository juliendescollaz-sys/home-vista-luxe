# Proguard rules for Neolia Panel

# Keep Linphone SDK
-keep class org.linphone.** { *; }
-keepclassmembers class org.linphone.** { *; }

# Keep OkHttp
-dontwarn okhttp3.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Keep ExoPlayer
-keep class com.google.android.exoplayer2.** { *; }
-keep class androidx.media3.** { *; }

# Keep data classes for JSON serialization
-keepclassmembers class com.neolia.panel.ha.HAEntity { *; }
