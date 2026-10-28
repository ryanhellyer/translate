<!DOCTYPE html>
<html lang="en-NZ">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="light dark">
<meta property="og:locale" content="en_NZ">
<meta property="og:type" content="website">
<meta property="og:title" content="Error — translate.hellyer.kiwi">
<meta property="og:description" content="Something went wrong. There's a support group for that.">
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

<title>Error — translate.hellyer.kiwi</title>

<link rel="stylesheet" href="/style.css">
</head>

<body class="page-error">

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
	<div class="error-card">
		<div id="status-code">404</div>
		<p id="status-category">Not Found</p>
		<h2 id="status-title">This page is lost in translation.</h2>
		<p id="status-joke">The address you asked for doesn't exist here. We looked. We even checked behind the sofa.</p>
		<p id="status-advice">It may have been moved, renamed, or never existed in the first place &mdash; which, in fairness, is a lot to expect from a design mock-up.</p>
		<p aria-hidden="true">¯\_(ツ)_/¯</p>

		<div>
			<a href="/">Take me home</a>
			<button type="button" id="retry-btn">Try that address again</button>
		</div>
		<details>
			<summary>What actually happened?</summary>
			<dl>
				<dt>Status</dt>
				<dd id="meta-status">404 Not Found</dd>
				<dt>Requested</dt>
				<dd id="meta-url">&mdash;</dd>
				<dt>Referred from</dt>
				<dd id="meta-referrer">Nothing. You arrived alone.</dd>
				<dt>Time</dt>
				<dd id="meta-time">&mdash;</dd>
			</dl>
		</details>
	</div>
</main>

<footer id="footer">
	<p>translate.hellyer.kiwi &mdash; a design mock-up, nothing translates yet &mdash; <a href="https://ryan.hellyer.kiwi/">ryan.hellyer.kiwi</a></p>
</footer>

<script src="/scripts.js"></script>

</body>
</html>
