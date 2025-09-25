<?php
$dir='recycle';
if(!is_dir($dir)) mkdir($dir);
$files=array_diff(scandir($dir),['.','..']);
echo json_encode(array_values($files));
