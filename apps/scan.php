<?php
header('Content-Type: application/json; charset=utf-8');

$rootDir = realpath(__DIR__);
$allowedExt = ['html'];
$defaultIcon = 'https://img.icons8.com/fluency/48/document.png';

// Convertit chemin absolu -> relatif au dossier scan.php
function toRel($path){
    global $rootDir;
    return str_replace('\\','/',str_replace($rootDir,'',$path));
}

// Scan récursif
function scanDirectory($dir){
    global $allowedExt,$defaultIcon;
    $items = [];
    foreach(scandir($dir) as $file){
        if($file==='.'||$file==='..') continue;
        $fullPath = $dir.DIRECTORY_SEPARATOR.$file;
        $relativePath = toRel($fullPath);
        if(is_dir($fullPath)){
            $items = array_merge($items, scanDirectory($fullPath));
            continue;
        }
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if(!in_array($ext,$allowedExt)) continue;
        $images = glob(dirname($fullPath).'/*.{png,jpg,jpeg}',GLOB_BRACE);
        $icon = count($images) ? toRel($images[0]) : $defaultIcon;
        $items[] = [
            'name'=>pathinfo($file,PATHINFO_FILENAME),
            'path'=>$relativePath,
            'icon'=>$icon
        ];
    }
    return $items;
}

echo json_encode(scanDirectory($rootDir), JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
exit;
