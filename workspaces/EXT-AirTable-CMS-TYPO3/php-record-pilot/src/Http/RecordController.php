<?php

declare(strict_types=1);

namespace RecordPilot\Http;

use RecordPilot\Application\Dto\ListRecordsQuery;
use RecordPilot\Application\RecordApplicationService;
use RecordPilot\Application\ValidationException;

final class RecordController
{
    /**
     * @param array<string, mixed> $verticalSlice
     */
    public function __construct(
        private readonly RecordApplicationService $service,
        private readonly string $basePath,
        private readonly array $verticalSlice,
    ) {
    }

    public function list(Request $request): Response
    {
        $entity = $this->verticalSlice['entity'] ?? '';
        $page = max(1, (int) ($request->getQuery()['page'] ?? 1));
        $result = $this->service->listRecords(new ListRecordsQuery($page, 20));
        $content = View::render($this->basePath, 'records/list', [
            'entity' => $entity,
            'rows' => $result['rows'],
            'total' => $result['total'],
            'page' => $page,
            'perPage' => 20,
        ]);
        $html = View::render($this->basePath, 'layout', [
            'title' => 'Записи: ' . $entity,
            'content' => $content,
            'panelUser' => Auth::user(),
        ]);

        return Response::html($html);
    }

    public function edit(Request $request, array $params): Response
    {
        $id = $params['id'] ?? '';
        $record = $this->service->getRecordForEdit($id);
        if ($record === null) {
            return Response::notFound('<p>Запись не найдена.</p>');
        }
        $csrf = CsrfToken::getToken();
        $content = View::render($this->basePath, 'records/edit', [
            'entity' => $this->verticalSlice['entity'] ?? '',
            'record' => $record,
            'csrfToken' => $csrf,
            'errors' => [],
        ]);
        $html = View::render($this->basePath, 'layout', [
            'title' => 'Редактирование #' . (string) $id,
            'content' => $content,
            'panelUser' => Auth::user(),
        ]);

        return Response::html($html);
    }

    public function update(Request $request, array $params): Response
    {
        if (! CsrfToken::validate($request->getPost()['csrf_token'] ?? null)) {
            return Response::serverError('<p>CSRF token invalid.</p>');
        }
        $id = $params['id'] ?? '';
        try {
            $this->service->updateFromPost($id, $request->getPost());
        } catch (ValidationException $e) {
            $record = $this->service->getRecordForEdit($id);
            if ($record === null) {
                return Response::notFound('<p>Запись не найдена.</p>');
            }
            $content = View::render($this->basePath, 'records/edit', [
                'entity' => $this->verticalSlice['entity'] ?? '',
                'record' => array_merge($record, $request->getPost()),
                'csrfToken' => CsrfToken::getToken(),
                'errors' => $e->errors,
            ]);
            $html = View::render($this->basePath, 'layout', [
                'title' => 'Ошибка валидации',
                'content' => $content,
                'panelUser' => Auth::user(),
            ]);

            return Response::html($html, 422);
        }

        $entity = $this->verticalSlice['entity'] ?? 'services';

        return Response::redirect('/records/' . rawurlencode((string) $entity) . '/' . rawurlencode((string) $id) . '/edit');
    }
}
