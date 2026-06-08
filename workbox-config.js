module.exports = {
	globDirectory: 'dist',
	globPatterns: [
		'**/*.{json,html,ico,css,png,js}'
	],
	swDest: 'dist/sw.js',
	ignoreURLParametersMatching: [
		/^utm_/,
		/^fbclid$/
	]
};