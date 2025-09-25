<?php
header('Content-Type: application/json');

$path = $_GET['path'] ?? '';
$trashDir = 'C:/xampp/htdocs/site/win3/trash';

if(!$path || !file_exists($path)) {
    echo json_encode(['success'=>false,'error'=>'Fichier introuvable']);
    exit;
}

$filename = basename($path);
$dest = $trashDir . '/' . $filename;

if(rename($path, $dest)) {
    echo json_encode(['success'=>true]);
} else {
    echo json_encode(['success'=>false,'error'=>'Impossible de déplacer le fichier']);
}
