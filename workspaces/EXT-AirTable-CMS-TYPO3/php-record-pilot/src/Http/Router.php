<?php

declare(strict_types=1);

namespace RecordPilot\Http;

/**
 * Минимальный роутер: сопоставление path + method с обработчиком.
 *
 * @phpstan-type RouteHandler callable(Request, array<string, string>): Response
 */
final class Router
{
    /** @var list<array{methods: list<string>, pattern: string, handler: RouteHandler}> */
    private array $routes = [];

    /**
     * @param RouteHandler $handler
     */
    public function add(array $methods, string $pattern, callable $handler): void
    {
        $methods = array_map(strtoupper(...), $methods);
        $this->routes[] = ['methods' => $methods, 'pattern' => $pattern, 'handler' => $handler];
    }

    public function dispatch(Request $request): ?Response
    {
        $path = $request->getPath();
        $method = $request->getMethod();

        foreach ($this->routes as $route) {
            if (! in_array($method, $route['methods'], true)) {
                continue;
            }
            $params = $this->match($route['pattern'], $path);
            if ($params !== null) {
                return ($route['handler'])($request, $params);
            }
        }

        return null;
    }

    /**
     * @return array<string, string>|null
     */
    private function match(string $pattern, string $path): ?array
    {
        $regex = preg_replace('#\{([a-zA-Z_]+)\}#', '(?P<$1>[^/]+)', $pattern);
        if ($regex === null) {
            return null;
        }
        $regex = '#^' . $regex . '$#';
        if (! preg_match($regex, $path, $m)) {
            return null;
        }
        $params = [];
        foreach ($m as $k => $v) {
            if (is_string($k) && ! is_int($k)) {
                $params[$k] = $v;
            }
        }

        return $params;
    }
}
