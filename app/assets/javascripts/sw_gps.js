var CACHE_VERSION = 'v1';

this.addEventListener('install', function (event) {
	event.waitUntil(
		caches.open(CACHE_VERSION).then(function (cache) {
			return cache.addAll([
				'/jeopardy/category_report',
				'styles/app.css',
				'scripts/app.js'
			]).catch(function (error) {
				console.error('Error in install handler:', error);
			});
		})
	);
});

this.addEventListener('activate', function (event) {
	event.waitUntil(
		caches.keys().then(function (cacheNames) {
			return Promise.all(
				// Go through and delete all other versions
				cacheNames.map(function (cacheName) {
					if (cacheName !== CACHE_VERSION)
						return caches.delete(cacheName);
				})
			);
		})
	);
});

this.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      return response || fetch(event.request);
    })
  );
});
function fetchAndCache(event, cache) {
  return fetch(event.request.clone()).then(function (response) {
    if (response.status < 400) {
      cache.put(event.request, response.clone());
    }
    return response;
  });
}

this.addEventListener('sync', function(event) {
  if (event.tag == 'myFirstSync') {
    // event.waitUntil(
	   //  function () {
	   //  	console.log("YOWSERS!  GPS goes here?");
	   //  }();
    // );
  }
});
