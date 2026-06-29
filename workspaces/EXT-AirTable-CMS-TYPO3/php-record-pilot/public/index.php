<?php

declare(strict_types=1);

$vendorAutoload = __DIR__ . '/../vendor/autoload.php';
if (is_file($vendorAutoload)) {
    require $vendorAutoload;
} else {
    require __DIR__ . '/../bootstrap/autoload.php';
}

use RecordPilot\Http\Kernel;
use RecordPilot\Http\Request;

$kernel = new Kernel(dirname(__DIR__));
$kernel->handle(Request::fromGlobals())->send();
