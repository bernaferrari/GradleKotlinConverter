dependencies {
    implementation("com.example:with-transitives:1.0") {
        exclude(group = "com.unwanted", module = "legacy")
    }
    api(project(path = ":shared:api", configuration = "default"))
    compileOnly(group = "javax.annotation", name = "javax.annotation-api", version = "1.3.2")
}

configurations.classpath {
    exclude(group = "com.android.tools.external.lombok")
}
