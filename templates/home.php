<!DOCTYPE html>
<!-- v3: the translator now calls the AI API over AJAX as you type.
     data-api-base on the translator card sets the API origin; the front
     controller fills it from $api_base (production by default, overridable
     with TRANSLATE_API_BASE on a dev host). -->
<html lang="en-NZ">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="canonical" href="https://translate.hellyer.kiwi">
<meta name="description" content="Translate. That's it. That's the page.">
<meta name="color-scheme" content="light dark">
<meta property="og:locale" content="en_NZ">
<meta property="og:type" content="website">
<meta property="og:title" content="Translate — translate.hellyer.kiwi">
<meta property="og:description" content="Translate. That's it. That's the page.">
<meta property="og:url" content="https://translate.hellyer.kiwi">
<meta name="theme-color" content="#e5122e">

<script>
	/* Use the browser's theme by default; an explicit choice wins afterwards. */
	(function () {
		var stored = null;
		try { stored = localStorage.getItem('translate-theme'); } catch (e) {}
		if (stored !== 'light' && stored !== 'dark') {
			stored = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		}
		document.documentElement.dataset.theme = stored;
	})();
</script>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">

<title>Translate &mdash; translate.hellyer.kiwi</title>

<script type="application/ld+json">
{
	"@context": "https://schema.org",
	"@type": "WebSite",
	"url": "https://translate.hellyer.kiwi",
	"name": "Translate",
	"inLanguage": "en_NZ",
	"author": {
		"@type": "Person",
		"name": "Ryan Hellyer",
		"url": "https://ryan.hellyer.kiwi"
	}
}
</script>

<link rel="stylesheet" href="/style.css">
</head>

<body>

<header id="site-header">
	<div class="wrapper">
		<h1 class="logo">
			<a href="/">
				<span class="logo-mark" aria-hidden="true">
					<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false">
						<path d="m5 8 6 6"></path>
						<path d="m4 14 6-6 2-3"></path>
						<path d="M2 5h12"></path>
						<path d="M7 2h1"></path>
						<path d="m22 22-5-10-5 10"></path>
						<path d="M14 18h6"></path>
					</svg>
				</span>
				<span class="wordmark">Translate<span class="name-last">.hellyer.kiwi</span></span>
			</a>
		</h1>
		<button type="button" class="theme-toggle" id="theme-toggle" aria-label="Switch to dark theme">
			<svg class="icon-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
				<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
			</svg>
			<svg class="icon-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
				<circle cx="12" cy="12" r="4"></circle>
				<path d="M12 2v2"></path><path d="M12 20v2"></path>
				<path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path>
				<path d="M2 12h2"></path><path d="M20 12h2"></path>
				<path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>
			</svg>
		</button>
	</div>
</header>

<main>
	<div class="translator-card" data-api-base="<?= htmlspecialchars($api_base ?? 'https://ai.hellyer.kiwi', ENT_QUOTES) ?>">
		<div class="lang-bar">
			<div class="lang-group" role="group" aria-label="Source language">
				<span class="lang-tabs" id="source-tabs" aria-label="Current language pair">
					<button type="button" class="lang-tab from" aria-label="Swap to translate into this language">English</button>
					<button type="button" class="lang-tab into" aria-label="Swap to translate from this language">German</button>
				</span>
				<button type="button" class="lang-select" id="source-select" aria-haspopup="true" aria-expanded="false" aria-controls="source-menu" aria-label="Choose source language">
					<svg class="chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
						<path d="m6 9 6 6 6-6"></path>
					</svg>
				</button>
			</div>
			<div class="lang-group" role="group" aria-label="Target language">
				<span class="lang-tabs" id="target-tabs" aria-label="Current language pair">
					<button type="button" class="lang-tab from" aria-label="Swap to translate into this language">English</button>
					<button type="button" class="lang-tab into" aria-label="Swap to translate from this language">German</button>
				</span>
				<button type="button" class="lang-select" id="target-select" aria-haspopup="true" aria-expanded="false" aria-controls="target-menu" aria-label="Choose target language">
					<svg class="chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
						<path d="m6 9 6 6 6-6"></path>
					</svg>
				</button>
			</div>
			<button type="button" class="swap-btn" id="swap-btn" aria-label="Swap languages">
				<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
					<path d="M3 8h14"></path>
					<path d="m13 4 4 4-4 4"></path>
					<path d="M21 16H7"></path>
					<path d="m11 12-4 4 4 4"></path>
				</svg>
			</button>
			<div class="lang-menu" id="source-menu" aria-label="Choose source language" hidden></div>
			<div class="lang-menu" id="target-menu" aria-label="Choose target language" hidden></div>
		</div>

		<div class="panels">
			<div class="panel source">
				<textarea aria-label="Source text" placeholder="Enter text" spellcheck="false" maxlength="5000">One man. One camera. Many exciting adventures.</textarea>
				<div class="panel-footer">
					<span class="char-count">46 / 5,000</span>
					<div class="panel-actions">
						<button type="button" class="icon-btn" id="clear-btn" aria-label="Clear text" hidden>
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
								<path d="M18 6 6 18"></path>
								<path d="m6 6 12 12"></path>
							</svg>
						</button>
					</div>
				</div>
			</div>
			<div class="panel target">
				<p class="translation">Ein Mann. Eine Kamera. Viele aufregende Abenteuer.</p>
				<div class="panel-footer">
					<div class="panel-actions">
						<button type="button" class="icon-btn" id="copy-btn" aria-label="Copy translation">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
								<rect x="9" y="9" width="12" height="12" rx="2"></rect>
								<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
							</svg>
						</button>
						<button type="button" class="icon-btn" id="listen-btn" aria-label="Listen to translation" aria-pressed="false">
							<svg class="icon-listen" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
								<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
								<path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
								<path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
							</svg>
							<svg class="icon-stop" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
								<rect x="6" y="6" width="12" height="12" rx="1"></rect>
							</svg>
						</button>
					</div>
				</div>
			</div>
		</div>

		<div class="style-bar">
			<span class="style-label" id="style-label">Style</span>
			<div class="style-options" role="group" aria-labelledby="style-label">
				<button type="button" class="style-option" data-style="formal" aria-pressed="false" title="Polished and proper">Formal</button>
				<button type="button" class="style-option" data-style="informal" aria-pressed="false" title="Relaxed, everyday language">Informal</button>
				<button type="button" class="style-option" data-style="simple" aria-pressed="false" title="Plain, easy-to-understand language for non-native speakers">Simple</button>
				<button type="button" class="style-option" data-style="kitten" aria-pressed="false" title="Sounds like a kitten wrote it">Kitten</button>
			</div>
		</div>
	</div>
</main>

<footer id="footer">
	<p>translate.hellyer.kiwi &mdash; translations by <a href="https://ai.hellyer.kiwi">ai.hellyer.kiwi</a> &mdash; <a href="https://ryan.hellyer.kiwi/">ryan.hellyer.kiwi</a></p>
</footer>

<div class="toast" id="toast" role="status" aria-live="polite"></div>

<script type="module" src="/js/main.js"></script>

</body>
</html>
