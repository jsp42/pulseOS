<?php
$data=json_decode(file_get_contents('php://input'),true);
$file=$data['file']??'';
$dir='recycle';
if(file_exists("$dir/$file")){
  rename("$dir/$file","$file");
}
