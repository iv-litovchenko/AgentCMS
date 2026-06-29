<?php

declare(strict_types=1);

namespace RecordPilot\Application;

use RuntimeException;

final class ValidationException extends RuntimeException
{
    /**
     * @param list<string> $errors
     */
    public function __construct(
        public readonly array $errors,
    ) {
        parent::__construct(implode('; ', $errors));
    }
}
