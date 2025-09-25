<?php
$files=array_diff(scandir('.'),['.','..','index.html','fileList.php','readFile.php','saveFile.php','recycleList.php','restoreFile.php']);
echo json_encode(array_values($files));
