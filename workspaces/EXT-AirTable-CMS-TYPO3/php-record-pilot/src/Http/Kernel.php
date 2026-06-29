<?php

declare(strict_types=1);

namespace RecordPilot\Http;

use PDOException;
use RecordPilot\Application\RecordApplicationService;
use RecordPilot\Config\PanelConfig;
use RecordPilot\Infrastructure\PdoMysqlAdapter;
use RecordPilot\Infrastructure\RecordRepository;
use RecordPilot\Metadata\MetadataLoader;

final class Kernel
{
    public function __construct(
        private readonly string $basePath,
    ) {
    }

    public function handle(Request $request): Response
    {
        try {
            $panel = PanelConfig::load($this->basePath);
        } catch (\Throwable $e) {
            return Response::serverError(
                '<p>Ошибка конфигурации панели (<code>config/panel.php</code>).</p><pre>'
                . htmlspecialchars($e->getMessage(), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')
                . '</pre>'
            );
        }

        if ($request->getMethod() === 'GET' && $request->getPath() === '/health') {
            return Response::json([
                'status' => 'ok',
                'service' => 'php-record-pilot',
                'time' => gmdate('c'),
            ]);
        }

        CsrfToken::ensureSessionStarted();

        $authController = new AuthController($this->basePath, $panel);
        if ($request->getMethod() === 'GET' && $request->getPath() === '/login') {
            return $authController->showLogin($request);
        }
        if ($request->getMethod() === 'POST' && $request->getPath() === '/login') {
            return $authController->login($request);
        }
        if ($request->getMethod() === 'POST' && $request->getPath() === '/logout') {
            return $authController->logout($request);
        }

        if (! Auth::check()) {
            return Response::redirect('/login');
        }

        $homeController = new HomeController($this->basePath, $panel);
        if ($request->getMethod() === 'GET' && $request->getPath() === '/') {
            return $homeController->index();
        }
        if ($request->getMethod() === 'GET' && $request->getPath() === '/dashboard') {
            return $homeController->dashboard();
        }

        $settingsController = new SettingsController($this->basePath, $panel);
        if ($request->getMethod() === 'GET' && $request->getPath() === '/settings') {
            return $settingsController->index();
        }

        $exportController = new ExportController($this->basePath);
        if ($request->getMethod() === 'GET' && $request->getPath() === '/export') {
            return $exportController->index();
        }

        $importController = new ImportController($this->basePath);
        if ($request->getMethod() === 'GET' && $request->getPath() === '/import') {
            return $importController->index();
        }

        $migrationController = new MigrationController($this->basePath);
        if ($request->getMethod() === 'GET' && $request->getPath() === '/migrations') {
            return $migrationController->index();
        }

        $docsController = new DocsController($this->basePath);
        if ($request->getMethod() === 'GET' && $request->getPath() === '/docs') {
            return $docsController->index();
        }
        if ($request->getMethod() === 'GET' && $request->getPath() === '/docs/mockups') {
            return $docsController->mockups();
        }

        $filesController = new FilesController($this->basePath);
        if ($request->getMethod() === 'GET' && $request->getPath() === '/files') {
            return $filesController->index();
        }

        $checkController = new CheckController($this->basePath);
        if ($request->getMethod() === 'GET' && $request->getPath() === '/check') {
            return $checkController->index();
        }

        $aiChatController = new AiChatController($this->basePath);
        if ($request->getMethod() === 'GET' && $request->getPath() === '/ai-chat') {
            return $aiChatController->index();
        }

        $slice = require $this->basePath . '/config/vertical_slice.php';
        if (! is_array($slice)) {
            return Response::serverError('<p>Invalid vertical_slice config.</p>');
        }
        $entity = (string) ($slice['entity'] ?? 'services');
        $connectionId = (string) ($slice['connection_id'] ?? 'default');

        try {
            $dbConfig = $panel->getPdoConfigForConnection($connectionId);
            $adapter = PdoMysqlAdapter::fromConfig($dbConfig);
        } catch (PDOException $e) {
            $msg = $e->getMessage();
            $hint = '';
            if (str_contains($msg, '2002') || str_contains($msg, 'Connection refused')) {
                $hint =
                    '<p><strong>SQLSTATE[2002] / Connection refused</strong> — на указанном в DSN хосте и порту '
                    . 'нет слушающего MySQL/MariaDB (сервер не запущен, неверный <code>host</code> или <code>port</code>).</p>'
                    . '<ul style="margin:0 0 1em 1.2em;">'
                    . '<li>Убедитесь, что СУБД запущена и порт совпадает с DSN (часто <code>3306</code>).</li>'
                    . '<li>Проверка с хоста: <code>mysql -h127.0.0.1 -P3306 -uroot -e "SELECT 1"</code> (или ваши user/host).</li>'
                    . '<li>PHP в Docker, а MySQL в другом контейнере — в DSN укажите <strong>имя сервиса</strong> из docker-compose, не <code>127.0.0.1</code>.</li>'
                    . '<li>Настройка без env: файл <code>config/database.local.php</code> (шаблон: <code>database.local.example.php</code>), см. README §12.</li>'
                    . '</ul>';
            }

            return Response::serverError(
                '<p>Ошибка подключения к БД. Проверьте подключение <code>'
                . htmlspecialchars($connectionId, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')
                . '</code> в <code>config/panel.php</code> (оно берёт DSN из <code>config/database.php</code>) '
                . 'и переменные <code>DB_*</code> / <code>database.local.php</code>.</p>'
                . $hint
                . '<pre>' . htmlspecialchars($msg, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</pre>'
            );
        } catch (\Throwable $e) {
            return Response::serverError(
                '<p>Ошибка конфигурации БД.</p><pre>'
                . htmlspecialchars($e->getMessage(), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')
                . '</pre>'
            );
        }

        $loader = new MetadataLoader();
        $schemaPath = $this->basePath . '/metadata/' . ($slice['schemaFile'] ?? '');
        try {
            $schema = $loader->loadFile($schemaPath);
        } catch (\Throwable $e) {
            return Response::serverError(
                '<p>Ошибка метаданных.</p><pre>'
                . htmlspecialchars($e->getMessage(), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')
                . '</pre>'
            );
        }

        $repo = new RecordRepository($adapter, $schema, $slice);
        $service = new RecordApplicationService($repo, $schema, $slice);
        $controller = new RecordController($service, $this->basePath, $slice);

        $router = new Router();

        $router->add(['GET'], '/records/{entity}', function (Request $req, array $params) use ($controller, $entity): Response {
            if (($params['entity'] ?? '') !== $entity) {
                return Response::notFound('<p>Неизвестная сущность.</p>');
            }

            return $controller->list($req);
        });

        $router->add(['GET'], '/records/{entity}/{id}/edit', function (Request $req, array $params) use ($controller, $entity): Response {
            if (($params['entity'] ?? '') !== $entity) {
                return Response::notFound('<p>Неизвестная сущность.</p>');
            }

            return $controller->edit($req, $params);
        });

        $router->add(['POST'], '/records/{entity}/{id}', function (Request $req, array $params) use ($controller, $entity): Response {
            if (($params['entity'] ?? '') !== $entity) {
                return Response::notFound('<p>Неизвестная сущность.</p>');
            }

            return $controller->update($req, $params);
        });

        $response = $router->dispatch($request);

        return $response ?? Response::notFound(
            '<p>404 — маршрут не найден.</p><p><a href="/">На главную</a></p>'
        );
    }
}
