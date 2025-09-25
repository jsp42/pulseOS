<?php
header('Content-Type: application/json');

$appsDir = __DIR__ . '/apps'; // dossier des applications
$apps = [];

// fonction récursive pour scanner les sous-dossiers
function scanFolder($folderPath, $relativePath = '') {
    global $apps;
    foreach(scandir($folderPath) as $item) {
        if($item === '.' || $item === '..') continue;
        $fullPath = $folderPath.'/'.$item;
        $relPath = $relativePath ? $relativePath.'/'.$item : $item;

        if(is_dir($fullPath)) {
            scanFolder($fullPath, $relPath);
        } else {
            // Chercher les fichiers HTML
            if(preg_match('/\.html$/i', $item)) {
                $appName = basename($relativePath);
                // Chercher une icône dans le dossier parent
                $iconFile = '';
                foreach(scandir(dirname($fullPath)) as $f) {
                    if(preg_match('/\.(png|jpg|jpeg)$/i', $f)) {
                        $iconFile = dirname($relPath).'/'.$f;
                        break;
                    }
                }
                if(!$iconFile) $iconFile = 'default_icon.png';

                $apps[] = [
                    'name' => $appName,
                    'path' => 'apps/'.$relPath,
                    'icon' => 'apps/'.$iconFile
                ];
            }
        }
    }
}

if(is_dir($appsDir)) scanFolder($appsDir);
echo json_encode($apps);
