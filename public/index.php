<?php
/**
 * Front controller.
 *
 * Serves the home page for "/" and the error page for everything else.
 */

$templates = __DIR__ . '/../templates';

/*
 * The path the visitor asked for, without the query string. Works behind the
 * PHP built-in server, Apache and nginx alike.
 */
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = '/' . ltrim(rawurldecode($path ?? '/'), '/');

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
