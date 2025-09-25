<?php
header('Content-Type: application/json');
session_start();

$action = $_REQUEST['action'] ?? '';
$baseDir = 'C:/xampp/htdocs'; // Ajustez selon votre répertoire racine

// Activer les logs d'erreurs
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', 'C:/xampp/php/logs/php_error_log');

// ---------------- UTILITAIRES ----------------
function sanitizePath($path) {
    $path = str_replace(['..', '\\'], '', $path);
    $path = preg_replace('/\/+/', '/', $path);
    return trim($path, '/');
}

function fullPath($path) {
    global $baseDir;
    return $baseDir . '/' . sanitizePath($path);
}

function rrmdir($dir) {
    try {
        foreach (array_diff(scandir($dir), ['.', '..']) as $f) {
            $p = "$dir/$f";
            is_dir($p) ? rrmdir($p) : unlink($p);
        }
        return rmdir($dir);
    } catch (Exception $e) {
        error_log("rrmdir error: " . $e->getMessage());
        return false;
    }
}

function rrcopy($src, $dst) {
    try {
        if (is_dir($src)) {
            mkdir($dst, 0777, true);
            foreach (array_diff(scandir($src), ['.', '..']) as $f) {
                rrcopy("$src/$f", "$dst/$f");
            }
        } else {
            copy($src, $dst);
        }
    } catch (Exception $e) {
        error_log("rrcopy error: " . $e->getMessage());
        return false;
    }
}

// ---------------- ACTIONS ----------------
if ($action === 'list') {
    $path = $_GET['path'] ?? '';
    $dir = fullPath($path);
    error_log("List action called for path: $dir");
    if (!is_dir($dir)) {
        error_log("List error: Directory not found - $dir");
        echo json_encode(['error' => 'Dossier non trouvé']);
        exit;
    }
    $items = [];
    foreach (scandir($dir) as $f) {
        if ($f === '.' || $f === '..') continue;
        $p = $dir . '/' . $f;
        $items[] = [
            'name' => $f,
            'isDir' => is_dir($p),
            'size' => is_file($p) ? filesize($p) : null,
            'modified' => filemtime($p)
        ];
    }
    echo json_encode($items);
}

elseif ($action === 'read') {
    $path = $_GET['path'] ?? '';
    $file = $_GET['file'] ?? '';
    $full = fullPath(($path ? $path . '/' : '') . $file);
    error_log("Read action called for file: $full");
    if (!file_exists($full) || is_dir($full)) {
        error_log("Read error: File not found - $full");
        echo json_encode(['error' => 'Fichier non trouvé']);
        exit;
    }
    echo json_encode(['name' => $file, 'content' => file_get_contents($full)]);
}

elseif ($action === 'write') {
    $path = $_POST['path'] ?? '';
    $file = $_POST['file'] ?? '';
    $content = $_POST['content'] ?? '';
    $full = fullPath(($path ? $path . '/' : '') . $file);
    error_log("Write action called for file: $full");
    try {
        if (!file_exists($full)) {
            $dir = dirname($full);
            if (!is_dir($dir)) mkdir($dir, 0777, true);
            file_put_contents($full, '');
        }
        $result = file_put_contents($full, $content);
        if ($result === false) throw new Exception('Write failed');
        echo json_encode(['ok' => true]);
    } catch (Exception $e) {
        error_log("Write error: " . $e->getMessage() . " - $full");
        echo json_encode(['error' => 'Erreur lors de l\'écriture du fichier']);
        exit;
    }
}

elseif ($action === 'mkdir') {
    $path = $_POST['path'] ?? '';
    $name = $_POST['name'] ?? '';
    $full = fullPath(($path ? $path . '/' : '') . $name);
    error_log("Mkdir action called for: $full");
    if (file_exists($full)) {
        error_log("Mkdir error: Directory already exists - $full");
        echo json_encode(['error' => 'Dossier existe déjà']);
        exit;
    }
    try {
        $result = mkdir($full, 0777, true);
        if (!$result) throw new Exception('Mkdir failed');
        echo json_encode(['ok' => true]);
    } catch (Exception $e) {
        error_log("Mkdir error: " . $e->getMessage() . " - $full");
        echo json_encode(['error' => 'Erreur lors de la création du dossier']);
        exit;
    }
}

elseif ($action === 'delete') {
    $path = $_POST['path'] ?? '';
    $name = $_POST['name'] ?? '';
    $full = fullPath(($path ? $path . '/' : '') . $name);
    error_log("Delete action called for: $full");
    if (!file_exists($full)) {
        error_log("Delete error: File/directory not found - $full");
        echo json_encode(['error' => 'Fichier/dossier non trouvé']);
        exit;
    }
    try {
        $ok = is_dir($full) ? rrmdir($full) : unlink($full);
        if (!$ok) throw new Exception('Delete failed');
        echo json_encode(['ok' => true]);
    } catch (Exception $e) {
        error_log("Delete error: " . $e->getMessage() . " - $full");
        echo json_encode(['error' => 'Erreur lors de la suppression']);
        exit;
    }
}

elseif ($action === 'rename') {
    $path = $_POST['path'] ?? '';
    $old = $_POST['oldName'] ?? '';
    $new = $_POST['newName'] ?? '';
    $oldPath = fullPath(($path ? $path . '/' : '') . $old);
    $newPath = fullPath(($path ? $path . '/' : '') . $new);
    error_log("Rename action called: $oldPath to $newPath");
    if (!file_exists($oldPath)) {
        error_log("Rename error: Source not found - $oldPath");
        echo json_encode(['error' => 'Fichier/dossier non trouvé']);
        exit;
    }
    if (file_exists($newPath)) {
        error_log("Rename error: Destination already exists - $newPath");
        echo json_encode(['error' => 'Nom déjà utilisé']);
        exit;
    }
    try {
        $ok = rename($oldPath, $newPath);
        if (!$ok) throw new Exception('Rename failed');
        echo json_encode(['ok' => true]);
    } catch (Exception $e) {
        error_log("Rename error: " . $e->getMessage() . " - $oldPath to $newPath");
        echo json_encode(['error' => 'Erreur lors du renommage']);
        exit;
    }
}

elseif ($action === 'copy') {
    $path = $_POST['path'] ?? '';
    $name = $_POST['name'] ?? '';
    $full = fullPath(($path ? $path . '/' : '') . $name);
    error_log("Copy action called for: $full");
    if (!file_exists($full)) {
        error_log("Copy error: Source not found - $full");
        echo json_encode(['error' => 'Fichier/dossier non trouvé']);
        exit;
    }
    try {
        $_SESSION['clipboard'] = ['action' => 'copy', 'path' => $full];
        echo json_encode(['ok' => true]);
    } catch (Exception $e) {
        error_log("Copy error: " . $e->getMessage() . " - $full");
        echo json_encode(['error' => 'Erreur lors de la copie']);
        exit;
    }
}

elseif ($action === 'cut') {
    $path = $_POST['path'] ?? '';
    $name = $_POST['name'] ?? '';
    $full = fullPath(($path ? $path . '/' : '') . $name);
    error_log("Cut action called for: $full");
    if (!file_exists($full)) {
        error_log("Cut error: Source not found - $full");
        echo json_encode(['error' => 'Fichier/dossier non trouvé']);
        exit;
    }
    try {
        $_SESSION['clipboard'] = ['action' => 'cut', 'path' => $full];
        echo json_encode(['ok' => true]);
    } catch (Exception $e) {
        error_log("Cut error: " . $e->getMessage() . " - $full");
        echo json_encode(['error' => 'Erreur lors du couper']);
        exit;
    }
}

elseif ($action === 'paste') {
    $path = $_POST['path'] ?? '';
    $destDir = fullPath($path);
    error_log("Paste action called for destination: $destDir");
    if (!is_dir($destDir)) {
        error_log("Paste error: Destination directory not found - $destDir");
        echo json_encode(['error' => 'Dossier de destination non trouvé']);
        exit;
    }
    if (!isset($_SESSION['clipboard'])) {
        error_log("Paste error: No clipboard data");
        echo json_encode(['error' => 'Aucun élément à coller']);
        exit;
    }
    try {
        $clip = $_SESSION['clipboard'];
        $name = basename($clip['path']);
        $dest = $destDir . '/' . $name;
        if (file_exists($dest)) {
            error_log("Paste error: Destination already exists - $dest");
            echo json_encode(['error' => 'Le fichier/dossier existe déjà à la destination']);
            exit;
        }
        if ($clip['action'] === 'copy') {
            rrcopy($clip['path'], $dest);
        } elseif ($clip['action'] === 'cut') {
            rename($clip['path'], $dest);
            unset($_SESSION['clipboard']);
        }
        echo json_encode(['ok' => true]);
    } catch (Exception $e) {
        error_log("Paste error: " . $e->getMessage() . " - $dest");
        echo json_encode(['error' => 'Erreur lors du collage']);
        exit;
    }
}

else {
    error_log("Invalid action: $action");
    echo json_encode(['error' => 'Action invalide']);
}
?>