<?php
header('Content-Type: application/json');

// 🔹 Racine du serveur XAMPP
define('ROOT_DIR', 'C:/xampp/htdocs');

// 🔹 Récupération du chemin demandé (sécurisé)
$path = isset($_GET['path']) ? $_GET['path'] : '';
$fullPath = realpath(ROOT_DIR . '/' . $path);

// 🔹 Sécurité : on reste dans la racine
if(strpos($fullPath, realpath(ROOT_DIR)) !== 0){
    echo json_encode(['error'=>'Accès refusé']);
    exit;
}

// 🔹 Actions
$action = isset($_GET['action']) ? $_GET['action'] : 'list';

switch($action){
    case 'list':
        $items = [];
        if(is_dir($fullPath)){
            foreach(scandir($fullPath) as $f){
                if($f === '.' || $f === '..') continue;
                $filePath = $fullPath.'/'.$f;
                $items[] = [
                    'name' => $f,
                    'type' => is_dir($filePath)?'folder':'file',
                    'size' => is_file($filePath)?filesize($filePath):null,
                    'modified' => date('Y-m-d H:i', filemtime($filePath))
                ];
            }
        }
        echo json_encode(['path'=>$path, 'items'=>$items]);
        break;

    case 'createFolder':
        $name = isset($_GET['name']) ? $_GET['name'] : 'Nouveau dossier';
        $target = $fullPath.'/'.$name;
        if(!file_exists($target)) mkdir($target);
        echo json_encode(['ok'=>true]);
        break;

    case 'createFile':
        $name = isset($_GET['name']) ? $_GET['name'] : 'nouveau.txt';
        $target = $fullPath.'/'.$name;
        if(!file_exists($target)) file_put_contents($target,'');
        echo json_encode(['ok'=>true]);
        break;

    case 'delete':
        $input = json_decode(file_get_contents('php://input'), true);
        if(isset($input['items'])){
            foreach($input['items'] as $item){
                $p = $fullPath.'/'.$item;
                if(is_file($p)) unlink($p);
                elseif(is_dir($p)) rrmdir($p);
            }
        }
        echo json_encode(['ok'=>true]);
        break;

    case 'rename':
        $input = json_decode(file_get_contents('php://input'), true);
        $old = $fullPath.'/'.$input['oldName'];
        $new = $fullPath.'/'.$input['newName'];
        if(file_exists($old)) rename($old,$new);
        echo json_encode(['ok'=>true]);
        break;

    case 'upload':
        $uploadPath = $fullPath.'/';
        foreach($_FILES['files']['tmp_name'] as $index => $tmp){
            $name = basename($_FILES['files']['name'][$index]);
            move_uploaded_file($tmp, $uploadPath.$name);
        }
        echo json_encode(['ok'=>true]);
        break;

    case 'preview':
        $file = $fullPath.'/'.$_GET['file'];
        if(file_exists($file)){
            echo json_encode([
                'name'=>basename($file),
                'type'=>mime_content_type($file),
                'content'=>base64_encode(file_get_contents($file))
            ]);
        }
        break;

    case 'save':
        $input = json_decode(file_get_contents('php://input'), true);
        $file = $fullPath.'/'.$input['file'];
        if(isset($input['content'])){
            file_put_contents($file, $input['content']);
            echo json_encode(['ok'=>true]);
        }
        break;

    default:
        echo json_encode(['error'=>'Action inconnue']);
        break;
}

// 🔹 Fonction récursive pour supprimer un dossier
function rrmdir($dir){
    if(!is_dir($dir)) return;
    foreach(scandir($dir) as $item){
        if($item=='.'||$item=='..') continue;
        $p = $dir.'/'.$item;
        if(is_dir($p)) rrmdir($p);
        else unlink($p);
    }
    rmdir($dir);
}
?>
