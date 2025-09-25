<?php
header('Content-Type: application/json');

// Vérification du fichier ZIP uploadé
if (!isset($_FILES['zip_file']) || $_FILES['zip_file']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'message' => 'Aucun fichier ZIP uploadé.']);
    exit;
}

// Dossier racine des applications
$appsDir = 'C:/xampp/htdocs/site/win3/apps';
if (!is_dir($appsDir)) {
    mkdir($appsDir, 0777, true);
}

// Nom de l'application d'après le ZIP
$zipTmpPath = $_FILES['zip_file']['tmp_name'];
$zipName = pathinfo($_FILES['zip_file']['name'], PATHINFO_FILENAME);
$appFolder = $appsDir . '/' . $zipName;

// Vérifie si le dossier existe déjà
if (is_dir($appFolder)) {
    echo json_encode(['success' => false, 'message' => 'Cette application existe déjà !']);
    exit;
}

// Création du dossier de l'application
mkdir($appFolder, 0777, true);

// Décompression directe dans le dossier de l'application
$zip = new ZipArchive;
if ($zip->open($zipTmpPath) === TRUE) {
    $zip->extractTo($appFolder);
    $zip->close();
} else {
    echo json_encode(['success' => false, 'message' => 'Impossible de décompresser le ZIP.']);
    exit;
}

// Cherche une icône PNG ou JPG dans le dossier de l'application
$iconPath = '';
$rii = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($appFolder));

foreach ($rii as $file) {
    if (!$file->isDir() && preg_match('/\.(png|jpg|jpeg)$/i', $file->getFilename())) {
        // Crée un chemin relatif pour le navigateur
        $iconPath = 'apps/' . $zipName . '/' . str_replace($appFolder.'/', '', $file->getPathname());
        $iconPath = str_replace('\\','/',$iconPath); // sécurité pour Windows
        break;
    }
}

// Réponse finale
echo json_encode([
    'success' => true,
    'message' => 'Application installée avec succès !',
    'appName' => $zipName,
    'iconPath' => $iconPath
]);
?>
