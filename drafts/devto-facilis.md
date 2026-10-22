---
title: "Facilis: Android camera, storage, permissions and notifications in one line each"
published: false
description: "I got tired of writing the same Android boilerplate in every app, so I built four small open-source Kotlin libraries that turn it into one line."
tags: android, kotlin, opensource, jetpackcompose
cover_image: https://raw.githubusercontent.com/al3j4ndrolm/FacilisCam/main/docs/social-preview.png
---

Every Android app I build needs the same four things: take a photo, save some data, ask for a permission, show a notification.

And every time, it's the same ritual. `registerForActivityResult`. A `FileProvider`. A notification channel. A `PendingIntent` with the right flags. A `DataStore` that wants everything `suspend`. An `if (Build.VERSION.SDK_INT >= ...)` for every Android release since 2019.

None of it is hard. It's just a lot, and it's the same every time. So I pulled it out into four small libraries and called the family **Facilis** (Latin for *easy*).

```kotlin
camera.open { photo -> }                                   // FacilisCam
storage.save("name", "Ale")                                // FacilisStorage
permissions.request(Permission.Location) { granted -> }    // FacilisPermission
notify("Coffee is ready ☕")                                 // FacilisNotification
```

That's the whole pitch. The rest of this post shows what each one does, and the rules they all follow.

## The rules

All four libraries share the same design rules:

1. **One line for the common case.** Options exist, but you never need them to get started.
2. **No `Context`, no `init()`.** Call them from an Activity, Fragment, Compose or a ViewModel.
3. **Compose and Views.** Each library ships a core artifact plus a `-compose` artifact with `remember*` helpers.
4. **Handle the edge cases you forget.** "Don't ask again", rotation, process death, reboots, Android 13/14 changes.
5. **Fail loudly when it's your bug.** Forgot a manifest line? You get an error telling you exactly what to add, not a silent "denied".

---

## 📸 FacilisCam: the camera in one line

{% github al3j4ndrolm/FacilisCam %}

```kotlin
camera.open { photo ->
    imageView.setImageURI(photo.uri)
}
```

No permission code, no CameraX setup, no manifest edits. You get a full camera screen with tap-to-focus, pinch-to-zoom, flash and front/back switching (shown only when the device has them), and photos that come back **upright**, with front-camera shots mirrored to match the preview.

For comparison, the shortest working CameraX photo screen in Compose is about 50 lines, and it *still* has no flash, no camera switch, no "don't ask again" handling, no `FileProvider` and no EXIF rotation fix.

In Compose it's a component:

```kotlin
PhotoBox(Modifier.size(240.dp))                                   // tap, shoot, see it
PhotoBox(Modifier.size(60.dp), shape = CircleShape)               // avatar picker
PhotoBox(Modifier.size(240.dp)) { photo -> upload(photo.uri) }    // get the result
```

Or bring your own button:

```kotlin
val photo = rememberPhoto()

Button(onClick = { photo.take() }) { Text("Take photo") }
PhotoImage(photo, Modifier.fillMaxWidth())
```

It survives rotation, even while the camera is open. Prefer coroutines? `val photo = camera.capture() ?: return`.

---

## 💾 FacilisStorage: local storage in one line

{% github al3j4ndrolm/FacilisStorage %}

```kotlin
storage.save("name", "Ale")
val name = storage.get<String>("name")
```

No DataStore setup, no Room boilerplate, no `suspend`. Reads are instant (each drawer lives in memory) and writes go to disk in the background.

The Compose version is my favorite part. It's `remember { mutableStateOf() }`, except it's still there after the app is closed:

```kotlin
var name by rememberStorage("name", default = "")

TextField(value = name, onValueChange = { name = it })
```

It handles objects and lists through kotlinx.serialization:

```kotlin
@Serializable
data class Note(val text: String, val done: Boolean = false)

val notes = storage.list<Note>("notes")
notes.add(Note("Buy milk"))
notes.all()                         // List<Note>

// Compose
val items by notes.collectAsState()
```

And **drawers** keep unrelated data apart, each in its own file:

```kotlin
storage.drawer("settings").save("darkMode", true)
storage.drawer("session").clear()    // wipes only that drawer
```

To be clear about scope: this is for settings, small objects and lists up to a few thousand items. For large or searchable datasets, Room is still the right tool. And it's plain JSON in your app's private folder, so don't put tokens or passwords in it.

---

## 🔐 FacilisPermission: runtime permissions in one line

{% github al3j4ndrolm/FacilisPermission %}

```kotlin
permissions.request(Permission.Location) { granted -> }

if (permissions.check(Permission.Camera)) { ... }
```

No `registerForActivityResult`, no version checks, no "don't ask again" bookkeeping. And because there's no launcher to register up front, you can call it straight from a click handler or a ViewModel.

Each `Permission` maps to the right Android permissions for the device's version: `Notifications` is only asked on 13+, `Bluetooth` on 12+, and `Photos` knows about Android 14's "select some photos".

You get a real status instead of a boolean when you need it:

```kotlin
when (permissions.status(Permission.Location)) {
    PermissionStatus.Granted -> { }
    PermissionStatus.Limited -> { }             // approximate location, or only some photos
    PermissionStatus.Denied -> { }
    PermissionStatus.PermanentlyDenied -> permissions.openSettings()
}
```

Pass a `reason` and it follows the flow Google recommends: system dialog first, your explanation after a denial, and an **Open settings** button once the user has blocked it. The result comes back when they return from Settings.

```kotlin
val location = rememberPermission(Permission.Location, reason = "To find classes near you")

if (location.granted) Map() else Button(onClick = { location.request() }) { Text("Allow location") }
```

Several at once, with coroutines:

```kotlin
val granted = permissions.request(Permission.Camera, Permission.Microphone)
```

---

## 🔔 FacilisNotification: notifications in one line

{% github al3j4ndrolm/FacilisNotification %}

```kotlin
notify("Coffee is ready ☕")
notify.after(10.minutes, "Time to stretch")
```

No channels, no `PendingIntent`s, no receivers, no AlarmManager, and no manifest changes. The Android 13+ permission is asked for you the first time (it's built on FacilisPermission).

Buttons, replies and taps, with your own data handed back to each handler:

```kotlin
notify(
    title = "CS 149 starts in 15 minutes",
    text = "Room MQH 225",
    data = mapOf("classId" to "cs149"),
    actions = listOf(
        Action("Snooze"),                          // runs in the background
        Action("Directions", opensApp = true),     // opens your app
        Action("Reply", input = "Message"),        // text box
    ),
)

notify.onAction("Snooze") { data -> notify.after(10.minutes, "Class soon", data = data) }
notify.onReply("Reply") { data, text -> send(data["classId"], text) }
notify.onTap { data -> openClass(data["classId"]) }
```

Handlers are matched by name, so they keep working after Android kills your app.

Scheduling that survives restarts, reboots and time-zone changes:

```kotlin
notify.at(LocalTime.of(9, 0), "Daily check-in")
notify.every(at = LocalTime.of(9, 30), days = setOf(MONDAY, WEDNESDAY), title = "CS 149 soon", key = "cs149")
notify.every(2.hours, "Drink water")
notify.cancelScheduled("cs149")
```

And progress notifications:

```kotlin
val upload = notify.progress("Uploading photo…")
upload.progress = 0.5f
upload.done("Photo uploaded ✓")
```

One honest trade-off: by default, scheduled notifications show within about 10 minutes of their time, because exact alarms need `SCHEDULE_EXACT_ALARM`, which Google Play only allows for alarm and calendar apps. Pass `exact = true` if you are one.

---

## All four together

Here's a profile screen using the whole family:

```kotlin
@Composable
fun ProfileScreen() {
    var name by rememberStorage("name", default = "")
    val location = rememberPermission(Permission.Location, reason = "To show classes near you")

    Column {
        PhotoBox(Modifier.size(96.dp), shape = CircleShape)
        TextField(value = name, onValueChange = { name = it })

        if (!location.granted) {
            Button(onClick = { location.request() }) { Text("Allow location") }
        }

        Button(onClick = { notify.after(1.hours, "Finish setting up your profile, $name") }) {
            Text("Remind me later")
        }
    }
}
```

No `Context`, no launchers, no channels, no setup in `Application`.

## Install

All four are on JitPack, MIT-licensed, and built and tested with GitHub Actions. Add JitPack once in `settings.gradle.kts`:

```kotlin
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven("https://jitpack.io")
    }
}
```

Then pick what you need:

```kotlin
implementation("com.github.al3j4ndrolm.FacilisCam:faciliscam-compose:1.1.1")
implementation("com.github.al3j4ndrolm.FacilisStorage:storage-compose:1.1.0")
implementation("com.github.al3j4ndrolm.FacilisPermission:permission-compose:1.0.0")
implementation("com.github.al3j4ndrolm:FacilisNotification:1.0.0")
```

Using Views instead of Compose? Drop the `-compose` suffix (`faciliscam`, `storage`, `permission`). Min SDK is 23, or 26 for FacilisNotification.

## What's next

I'm building Facilis alongside my own apps, so each library exists because I hit the problem for real. If there's a piece of Android boilerplate you rewrite in every project, tell me in the comments. It might be the next one.

Issues, PRs and ⭐s are all welcome:

- [FacilisCam](https://github.com/al3j4ndrolm/FacilisCam)
- [FacilisStorage](https://github.com/al3j4ndrolm/FacilisStorage)
- [FacilisPermission](https://github.com/al3j4ndrolm/FacilisPermission)
- [FacilisNotification](https://github.com/al3j4ndrolm/FacilisNotification)
