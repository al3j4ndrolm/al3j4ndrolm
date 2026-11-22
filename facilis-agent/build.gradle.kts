plugins {
    kotlin("jvm") version "2.0.21"
    `maven-publish`
}

group = "com.github.al3j4ndrolm"
version = "0.1.0"

repositories { mavenCentral() }

dependencies {
    // Only runtime dependency. Android apps already ship it.
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.1")
    // org.json is part of the Android platform: compile against it, never bundle it.
    compileOnly("org.json:json:20240303")

    testImplementation(kotlin("test"))
    testImplementation("org.json:json:20240303")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")
}

kotlin {
    jvmToolchain(17)
    explicitApi()
}

java { withSourcesJar() }

publishing {
    publications {
        create<MavenPublication>("release") {
            from(components["java"])
            artifactId = "FacilisAgent"
        }
    }
}

tasks.test { useJUnitPlatform() }
