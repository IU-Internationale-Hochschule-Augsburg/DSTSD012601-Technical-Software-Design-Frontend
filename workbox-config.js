module.exports = {
	globDirectory: 'dist',
	globPatterns: [
		'**/*.{json,html,ico,css,png,js}'
	],
	swDest: 'dist/sw.js',
	ignoreURLParametersMatching: [
		/^utm_/,
		/^fbclid$/
	],
	// Neuer Service Worker übernimmt sofort und ersetzt den alten Cache, damit
	// ein Deploy auch in einer installierten PWA beim nächsten Laden ankommt
	// (sonst bleibt die alte Version bis zum kompletten Schließen der App aktiv).
	skipWaiting: true,
	clientsClaim: true,
	cleanupOutdatedCaches: true,
	// Das Haupt-JS-Bundle ist > 2 MB (Workbox-Default) und würde sonst NICHT
	// mit-precached/-versioniert – dann kann eine alte index.html auf ein altes
	// Bundle zeigen. Limit anheben, damit Bundle + index.html atomar zusammen
	// aktualisiert werden (und die App offline lauffähig bleibt).
	maximumFileSizeToCacheInBytes: 6 * 1024 * 1024
};
