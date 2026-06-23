android {
    compileSdk = 35

    defaultConfig {
        minSdk = 23
        targetSdk = 35
        versionCode = 42
        versionName = "4.2.0"
        vectorDrawables.useSupportLibrary = true
    }

    lintOptions {
        isAbortOnError = false
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
        isCoreLibraryDesugaringEnabled = true
    }

    useLibrary("org.apache.http.legacy")
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.7.0")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
}
