<?php
header('Content-Type: application/json');
error_reporting(0); // pour éviter les warnings

$appName = $_GET['app'] ?? '';
$appsDir = 'C:/xampp/htdocs/site/win3/apps';
$trashDir = 'C:/xampp/htdocs/site/win3/trash';

if(!$appName){
    echo json_encode(['success'=>false, 'error'=>'Aucun nom d\'application fourni']);
    exit;
}

$source = $appsDir.'/'.$appName;
$destination = $trashDir.'/'.$appName;

if(!is_dir($source)){
    echo json_encode(['success'=>false, 'error'=>'Dossier application introuvable']);
    exit;
}

// Créer le dossier trash s'il n'existe pas
if(!is_dir($trashDir)){
    mkdir($trashDir, 0777, true);
}

// Déplacer le dossier
if(rename($source, $destination)){
    echo json_encode(['success'=>true]);
} else {
    echo json_encode(['success'=>false, 'error'=>'Impossible de déplacer le dossier']);
}
