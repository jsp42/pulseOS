<?php
$trashDir = __DIR__.'/trash';
$trashJson = $trashDir.'/trash.json';

if(!is_dir($trashDir)) mkdir($trashDir,0777,true);
if(!file_exists($trashJson)) file_put_contents($trashJson,json_encode([]));

$trashData = json_decode(file_get_contents($trashJson),true);

// Restaurer
if(isset($_GET['restore'])){
    $index=intval($_GET['restore']);
    if(isset($trashData[$index])){
        $source=$trashDir.'/'.$trashData[$index]['filename'];
        $dest=$trashData[$index]['originalPath'];
        if(!is_dir(dirname($dest))) mkdir(dirname($dest),0777,true);
        rename($source,$dest);
        array_splice($trashData,$index,1);
        file_put_contents($trashJson,json_encode($trashData));
    }
    header('Location: corbeille.php'); exit;
}

// Supprimer définitivement
if(isset($_GET['delete'])){
    $index=intval($_GET['delete']);
    if(isset($trashData[$index])){
        $source=$trashDir.'/'.$trashData[$index]['filename'];
        if(file_exists($source)) unlink($source);
        array_splice($trashData,$index,1);
        file_put_contents($trashJson,json_encode($trashData));
    }
    header('Location: corbeille.php'); exit;
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Corbeille</title>
<style>
body{font-family:sans-serif;background:#1e1e2e;color:white;padding:20px;}
h2{text-align:center;color:#00ffcc;}
table{width:90%;margin:auto;border-collapse:collapse;}
th,td{padding:10px;border-bottom:1px solid #444;text-align:left;}
.btn{padding:5px 10px;border:none;border-radius:3px;color:white;cursor:pointer;}
.btn-restore{background:#28a745;}
.btn-restore:hover{background:#218838;}
.btn-delete{background:#dc3545;}
.btn-delete:hover{background:#c82333;}
</style>
</head>
<body>
<h2>Corbeille</h2>
<?php if(empty($trashData)): ?>
<p style="text-align:center;">La corbeille est vide 🗑️</p>
<?php else: ?>
<table>
<tr><th>Nom</th><th>Chemin original</th><th>Date suppression</th><th>Actions</th></tr>
<?php foreach($trashData as $i=>$f): ?>
<tr>
<td><?php echo htmlspecialchars($f['filename']); ?></td>
<td><?php echo htmlspecialchars($f['originalPath']); ?></td>
<td><?php echo date("d/m/Y H:i:s",$f['deletedAt']); ?></td>
<td>
<a href="?restore=<?php echo $i ?>"><button class="btn btn-restore">Restaurer</button></a>
<a href="?delete=<?php echo $i ?>" onclick="return confirm('Supprimer définitivement ?');"><button class="btn btn-delete">Supprimer</button></a>
</td>
</tr>
<?php endforeach; ?>
</table>
<?php endif; ?>
</body>
</html>
