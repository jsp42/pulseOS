<?php
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';
$baseDir = __DIR__;
$trashDir = $baseDir.'/trash';
$trashJson = $trashDir.'/trash.json';

if(!is_dir($trashDir)) mkdir($trashDir,0777,true);
if(!file_exists($trashJson)) file_put_contents($trashJson,json_encode([]));

function sanitizePath($path){
    $path = str_replace('..','',$path);
    $path = preg_replace('/\/+/','/',$path);
    return trim($path,'/');
}

if($action==='list'){
    $path = $_GET['path'] ?? '';
    $fullPath = $baseDir.'/'.sanitizePath($path);
    if(!is_dir($fullPath)) { echo json_encode(['error'=>'Dossier non trouvé']); exit; }
    $files=[];
    foreach(scandir($fullPath) as $file){
        if($file=='.'||$file=='..') continue;
        $files[]= ['name'=>$file,'isDir'=>is_dir($fullPath.'/'.$file)];
    }
    echo json_encode($files);
}

elseif($action==='delete'){
    $path = $_POST['path'] ?? '';
    $file = $_POST['file'] ?? '';
    $fullPath = $baseDir.'/'.sanitizePath($path).'/'.$file;
    if(!file_exists($fullPath)) { echo json_encode(['error'=>'Fichier non trouvé']); exit; }

    // Déplacer dans trash
    $trashFile = $trashDir.'/'.$file;
    $trashData = json_decode(file_get_contents($trashJson),true);
    rename($fullPath,$trashFile);
    $trashData[] = [
        'filename'=>$file,
        'originalPath'=>$fullPath,
        'deletedAt'=>time()
    ];
    file_put_contents($trashJson,json_encode($trashData));
    echo json_encode(['success'=>true]);
}

elseif($action==='upload'){
    $path = $_POST['path'] ?? '';
    if(!empty($_FILES['file'])){
        $dest = $baseDir.'/'.sanitizePath($path).'/'.basename($_FILES['file']['name']);
        move_uploaded_file($_FILES['file']['tmp_name'],$dest);
        echo json_encode(['success'=>true]);
    }
}

else{
    echo json_encode(['error'=>'Action non valide']);
}
?>
