Gradle Kotlin DSL converter
=================

Welcome! After a lot of pain trying to migrate from Gradle's Groovy to Kotlin DSL on Android Studio, I developed this tool to solve most migration issues and reduce the amount of work you need in order to make things ready.

Please see this tool as a helper, a first resource like Android Studio's Java converter to Kotlin: it won't make a _perfect_ conversion, but it helps a lot in reducing the time you would spend on repetitive tasks.


💻 Getting Started
---------------

The tool was developed using [kscript](https://github.com/holgerbrandl/kscript). You can find how to install it [here](https://github.com/holgerbrandl/kscript#installation). 
Gradle 5 is [currently incompatible](https://github.com/holgerbrandl/kscript/issues/197) with the tool that packages it, so I'm afraid you will need to [install kscript](https://github.com/holgerbrandl/kscript#installation) before running this tool. It should be really easy, however. After that, you can run the script by calling:

```
./gradlekotlinconverter.kts build.gradle
```
or 
```
kscript gradlekotlinconverter.kts build.gradle
```

**Motivation**: on my own apps, I've used apostrophes \' instead of quotation marks \" since forever, so it wasn't fun when I discovered I would need to modify more than 100 lines of code to make Kotlin DSL work. Besides this, the tool also solves a few common issues that might appear, like the ```task clean(type: Delete)``` that becomes a completely different thing.


😱 Things it can do
---------------

<table>
    <th>Description</th>
    <th>Before</th>
    <th>After</th>
    <tr>
        <td>Replace all ' with "</td>
        <td>'kotlin-android'</td>
        <td>"kotlin-android"</td>
    </tr>
    <tr>
        <td>Replace "def " with "val "</td>
        <td>def appcompat = "1.0.0"</td>
        <td>val appcompat = "1.0.0"</td>
    </tr>
    <tr>
        <td>Convert plugins</td>
        <td>apply plugin: "kotlin-kapt"</td>
        <td>apply(plugin = "kotlin-kapt")</td>
    </tr>
    <tr>
        <td>Add ( ) to dependencies</td>
        <td>implementation ":epoxy"</td>
        <td>implementation(":epoxy")</td>
    </tr>
    <tr>
        <td>Convert Maven</td>
        <td>maven { url "https://jitpack.io" }</td>
        <td>maven("https://jitpack.io")</td>
    </tr>
    <tr>
        <td>Convert Sdk Version</td>
        <td>compileSdkVersion 28</td>
        <td>compileSdkVersion(28)</td>
    </tr>
    <tr>
        <td>Convert Version Code</td>
        <td>versionCode 4</td>
        <td>versionCode = 4</td>
    </tr>
    <tr>
        <td>Convert Build Types</td>
        <td>debuggable true</td>
        <td>isDebuggable = true</td>
    </tr>
    <tr>
        <td>Convert proguardFiles</td>
        <td>proguardFiles getDef..., "..."</td>
        <td>setProguardFiles(listOf(getDef..., "...")</td>
    </tr>
    <tr>
        <td>Convert sourceCompatibility</td>
        <td>sourceCompatibility = "1.8"</td>
        <td>sourceCompatibility = JavaVersion.VERSION_1_8</td>
    </tr>
     <tr>
          <td>Convert AndroidExtensions</td>
          <td>androidExtensions { experimental = true }</td>
          <td>androidExtensions { isExperimental = true }</td>
     </tr>
     <tr>
          <td>Convert include</td>
          <td>include ":app", ":diffutils"</td>
          <td>include(":app", ":diffutils")</td>
     </tr>
     <tr>
            <td>Convert signingConfigs</td>
            <td>buildTypes { debug { ... } }</td>
            <td>buildTypes { register("debug") { ... } })</td>
      </tr>
     <tr>
           <td>Convert buildTypes</td>
           <td>buildTypes { debug { ... } }</td>
           <td>buildTypes { named("debug") { ... } })</td>
      </tr>
</table>

You can find all the details on the source code.

😨 Things it still can't do
-------
- Dealing with _testInstrumentationRunner_
- To avoid bugs, all plugins should be in one block ([3th law of SUPERCILEX](https://twitter.com/SUPERCILEX/status/1079832024456749059))
- If you find anything else, just tell me.


Issue Tracking
-------
Found a bug? Have an idea for an improvement? Feel free to [add an issue](../../issues).

License
-------

Copyright 2018 Bernardo Ferrari.

Licensed to the Apache Software Foundation (ASF) under one or more contributor
license agreements.  See the NOTICE file distributed with this work for
additional information regarding copyright ownership.  The ASF licenses this
file to you under the Apache License, Version 2.0 (the "License"); you may not
use this file except in compliance with the License.  You may obtain a copy of
the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
License for the specific language governing permissions and limitations under
the License.