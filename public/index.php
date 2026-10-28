<?php
/**
 * Front controller.
 *
 * Serves the home page for "/" and the error page for everything else.
 */

$templates = __DIR__ . '/../templates';

/*
 * The translation API's base URL, handed to the template as $api_base.
 *
 * It defaults to the production API and is overridden on a development host
 * by setting TRANSLATE_API_BASE (in the vhost, or a shell export before
 * `php -S`), so the local dev API is never deployed by accident. The card
 * carries it as data-api-base; see src/translator/app.ts.
 */
$api_base = getenv('TRANSLATE_API_BASE') ?: 'https://ai.hellyer.kiwi';

/*
 * The path the visitor asked for, without the query string. Works behind the
 * PHP built-in server, Apache and nginx alike.
 */
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = '/' . ltrim(rawurldecode($path ?? '/'), '/');

/*
 * Static assets sit on disk beside this file; let the web server hand them
 * back untouched instead of treating them as a miss.
 */
if ($path !== '/' && is_file(__DIR__ . $path)) {
	return false;
}

if ($path === '/') {
	require $templates . '/home.php';
	return;
}

/*
 * Anything else is a miss. The status code is sent in the response, and the
 * error template picks it up client-side (see public/scripts.js) so the right
 * copy is drawn for the code.
 */
http_response_code(404);
require $templates . '/error_page.php';
