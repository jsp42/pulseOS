<?php
header('Content-Type: application/json');

// --- Dossier de la corbeille ---
$trashDir = "C:/xampp/htdocs/site/win3/trash";
$restoreFile = __DIR__ . "/restore_paths.json";

// --- Créer restore_paths.json s'il n'existe pas ---
if (!file_exists($restoreFile)) {
    file_put_contents($restoreFile, json_encode([]));
}

// --- Charger les chemins existants ---
$restorePaths = json_decode(file_get_contents($restoreFile), true);

// --- Action demandée ---
$action = $_REQUEST['action'] ?? '';

/* ------------------- LISTER LES FICHIERS ------------------- */
if ($action === "list") {
    $path = $_GET['path'] ?? __DIR__;
    $files = [];
    if (is_dir($path)) {
        foreach (scandir($path) as $file) {
            if ($file !== "." && $file !== "..") {
                $files[] = $file;
            }
        }
    }
    echo json_encode($files);
    exit;
}

/* ------------------- LISTER LA CORBEILLE ------------------- */
if ($action === "listTrash") {
    $files = [];
    foreach (scandir($trashDir) as $file) {
        if ($file !== "." && $file !== "..") {
            $files[] = $file;
        }
    }
    echo json_encode($files);
    exit;
}

/* ------------------- UPLOAD ------------------- */
if ($action === "upload") {
    $path = $_POST['path'] ?? __DIR__;
    if (!isset($_FILES['file'])) {
        echo json_encode(["success"=>false, "error"=>"Aucun fichier sélectionné"]);
        exit;
    }
    $tmp = $_FILES['file']['tmp_name'];
    $name = $_FILES['file']['name'];
    $dest = $path . "/" . $name;
    if (move_uploaded_file($tmp, $dest)) {
        echo json_encode(["success"=>true]);
    } else {
        echo json_encode(["success"=>false,"error"=>"Impossible d'uploader le fichier"]);
    }
    exit;
}

/* ------------------- SUPPRIMER VERS CORBEILLE ------------------- */
if ($action === "deleteToTrash") {
    $file = $_POST['file'] ?? '';
    $path = $_POST['path'] ?? '';
    if (!$file || !$path) { echo json_encode(["status"=>"error","message"=>"Fichier ou chemin manquant"]); exit; }

    $originalFilePath = $path . "/" . $file;
    $trashFilePath = $trashDir . "/" . $file;

    if (!is_dir($trashDir)) mkdir($trashDir, 0777, true);

    if (rename($originalFilePath, $trashFilePath)) {
        $restorePaths[$file] = $originalFilePath; // enregistrer le chemin original
        file_put_contents($restoreFile, json_encode($restorePaths, JSON_PRETTY_PRINT));
        echo json_encode(["status"=>"success","message"=>"Fichier envoyé à la corbeille"]);
    } else {
        echo json_encode(["status"=>"error","message"=>"Impossible de déplacer le fichier"]);
    }
    exit;
}

/* ------------------- RESTAURER ------------------- */
if ($action === "restore") {
    $file = $_POST['file'] ?? '';
    if (!$file) { echo json_encode(["status"=>"error","message"=>"Aucun fichier sélectionné"]); exit; }

    $filePath = $trashDir . "/" . $file;
    if (!isset($restorePaths[$file])) {
        echo json_encode(["status"=>"error","message"=>"Chemin original introuvable"]);
        exit;
    }
    $originalPath = $restorePaths[$file];

    if (!is_dir(dirname($originalPath))) mkdir(dirname($originalPath), 0777, true);

    if (rename($filePath, $originalPath)) {
        unset($restorePaths[$file]);
        file_put_contents($restoreFile, json_encode($restorePaths, JSON_PRETTY_PRINT));
        echo json_encode(["status"=>"success","message"=>"Fichier restauré"]);
    } else {
        echo json_encode(["status"=>"error","message"=>"Impossible de restaurer le fichier"]);
    }
    exit;
}

/* ------------------- SUPPRIMER DÉFINITIVEMENT ------------------- */
if ($action === "deletePermanent") {
    $file = $_POST['file'] ?? '';
    if (!$file) { echo json_encode(["status"=>"error","message"=>"Aucun fichier sélectionné"]); exit; }

    $filePath = $trashDir . "/" . $file;

    if (is_dir($filePath)) {
        $it = new RecursiveDirectoryIterator($filePath, RecursiveDirectoryIterator::SKIP_DOTS);
        $files = new RecursiveIteratorIterator($it, RecursiveIteratorIterator::CHILD_FIRST);
        foreach($files as $f) { $f->isDir() ? rmdir($f->getRealPath()) : unlink($f->getRealPath()); }
        rmdir($filePath);
    } else {
        unlink($filePath);
    }

    unset($restorePaths[$file]);
    file_put_contents($restoreFile, json_encode($restorePaths, JSON_PRETTY_PRINT));

    echo json_encode(["status"=>"success","message"=>"Fichier supprimé définitivement"]);
    exit;
}

echo json_encode(["status"=>"error","message"=>"Action inconnue"]);
exit;
?>
