<?php
header('Content-Type: application/json');

$appName = $_GET['app'] ?? '';
$appsDir = 'C:/xampp/htdocs/site/win3/apps';
$trashDir = 'C:/xampp/htdocs/site/win3/trash';

if(!$appName) { echo json_encode(['success'=>false,'error'=>'Application non spécifiée']); exit; }

$source=$appsDir.'/'.$appName;
$destination=$trashDir.'/'.$appName;

if(!is_dir($source)) { echo json_encode(['success'=>false,'error'=>'Application introuvable']); exit; }

if(!is_dir($trashDir)) mkdir($trashDir,0755,true);

if(rename($source,$destination)) echo json_encode(['success'=>true,'message'=>'Application déplacée dans la corbeille']);
else echo json_encode(['success'=>false,'error'=>'Impossible de déplacer l’application']);
?>
