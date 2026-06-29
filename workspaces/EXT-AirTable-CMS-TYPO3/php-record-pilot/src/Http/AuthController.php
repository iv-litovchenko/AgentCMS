<?php

declare(strict_types=1);

namespace RecordPilot\Http;

use RecordPilot\Config\PanelConfig;

final class AuthController
{
    public function __construct(
        private readonly string $basePath,
        private readonly PanelConfig $panel,
    ) {
    }

    public function showLogin(Request $request): Response
    {
        if (Auth::check()) {
            return Response::redirect('/');
        }
        $error = ($request->getQuery()['error'] ?? '') === '1';
        $csrf = CsrfToken::getToken();
        $content = View::render($this->basePath, 'auth/login', [
            'csrfToken' => $csrf,
            'error' => $error,
        ]);
        $html = View::render($this->basePath, 'layout', [
            'title' => 'Вход в панель',
            'content' => $content,
            'panelUser' => null,
        ]);

        return Response::html($html);
    }

    public function login(Request $request): Response
    {
        if (! CsrfToken::validate($request->getPost()['csrf_token'] ?? null)) {
            return Response::serverError('<p>CSRF token invalid.</p>');
        }
        $username = trim((string) ($request->getPost()['username'] ?? ''));
        $password = (string) ($request->getPost()['password'] ?? '');

        if ($username === '' || ! $this->panel->verifySuperAdmin($username, $password)) {
            return Response::redirect('/login?error=1');
        }

        Auth::loginAsSuperAdmin($username);

        return Response::redirect('/');
    }

    public function logout(Request $request): Response
    {
        if (! CsrfToken::validate($request->getPost()['csrf_token'] ?? null)) {
            return Response::serverError('<p>CSRF token invalid.</p>');
        }
        Auth::logout();

        return Response::redirect('/login');
    }
}
