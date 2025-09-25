<?php
header('Content-Type: application/json');

// Chemin du JSON
$restoreFile = __DIR__ . "/trash/restore_paths.json";

// Créer le fichier s'il n'existe pas
if(!file_exists($restoreFile)){
    file_put_contents($restoreFile, json_encode([]));
}

$action = $_GET['action'] ?? '';

if($action === 'read'){
    $data = file_get_contents($restoreFile);
    if($data === false){
        echo json_encode(['status'=>'error','message'=>'Impossible de lire restore_paths.json']);
    } else {
        echo $data;
    }
    exit;
}

if($action === 'save'){
    $input = file_get_contents('php://input');
    if(!$input){
        echo json_encode(['status'=>'error','message'=>'Aucun contenu reçu']);
        exit;
    }
    if(file_put_contents($restoreFile, $input)){
        echo json_encode(['status'=>'success','message'=>'Chemins sauvegardés']);
    } else {
        echo json_encode(['status'=>'error','message'=>'Impossible de sauvegarder']);
    }
    exit;
}

echo json_encode(['status'=>'error','message'=>'Action inconnue']);
