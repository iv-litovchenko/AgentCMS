<?php

declare(strict_types=1);

namespace RecordPilot\Application\Dto;

final readonly class ListRecordsQuery
{
    public function __construct(
        public int $page = 1,
        public int $perPage = 20,
    ) {
    }
}
