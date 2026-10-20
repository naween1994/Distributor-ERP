/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-3d8c9f1b'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "c747426ee2cba0795d770f51253e16e9"
  }, {
    "url": "pwa-512x512.png",
    "revision": "59d326bbcd8e93e10442b1d6f06d7363"
  }, {
    "url": "pwa-192x192.png",
    "revision": "fae15d638aa2011a71bafa1b1b43c0e4"
  }, {
    "url": "index.html",
    "revision": "6734d95824502207bed3a27452bed345"
  }, {
    "url": "favicon.svg",
    "revision": "a0b3c9f2f53d5a3a6a73b5806afd39f5"
  }, {
    "url": "favicon.ico",
    "revision": "6f868449b7dca873b0ee5ccb6dea2de1"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "ad308451c51f2b2eb6722956a43ca70f"
  }, {
    "url": "assets/purify.es-BZxk_wWO.js",
    "revision": null
  }, {
    "url": "assets/index.es-DfG1cN6i.js",
    "revision": null
  }, {
    "url": "assets/index-rjYv7wlu.js",
    "revision": null
  }, {
    "url": "assets/index-DoNjvJTN.css",
    "revision": null
  }, {
    "url": "assets/html2canvas-DH8fIdPw.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "ad308451c51f2b2eb6722956a43ca70f"
  }, {
    "url": "favicon.ico",
    "revision": "6f868449b7dca873b0ee5ccb6dea2de1"
  }, {
    "url": "favicon.svg",
    "revision": "a0b3c9f2f53d5a3a6a73b5806afd39f5"
  }, {
    "url": "pwa-192x192.png",
    "revision": "fae15d638aa2011a71bafa1b1b43c0e4"
  }, {
    "url": "pwa-512x512.png",
    "revision": "59d326bbcd8e93e10442b1d6f06d7363"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "c747426ee2cba0795d770f51253e16e9"
  }, {
    "url": "manifest.webmanifest",
    "revision": "79ac43b4f28f6d592fd7e3a8691eb048"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(/^\/api\/products/i, new workbox.NetworkFirst({
    "cacheName": "api-products-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 86400
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^\/api\/customers/i, new workbox.NetworkFirst({
    "cacheName": "api-customers-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 200,
      maxAgeSeconds: 86400
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^\/api\/orders/i, new workbox.NetworkFirst({
    "cacheName": "api-orders-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 200,
      maxAgeSeconds: 86400
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
