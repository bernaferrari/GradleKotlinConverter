plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.example.feature"
    compileSdk = 36
    flavorDimensions("tier", "api")

    productFlavors {
        create("free") {
            dimension = "tier"
            resValue("string", "flavor_name", "Free")
            manifestPlaceholders.putAll(mapOf("appLabel" to "@string/free_app_name"))
        }
        create("paid") {
            dimension = "tier"
            resValue("string", "flavor_name", "Paid")
        }
    }

    sourceSets {
        getByName("main") {
            java.srcDir("src/main/kotlin")
        }
    }
}
