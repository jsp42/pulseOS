<?php
$file=$_GET['file']??'';
if(file_exists($file)) echo file_get_contents($file);
else echo 'Fichier introuvable';
