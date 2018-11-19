<?php

$container = $app->getContainer();

$container['validator'] = function($c) {
    class Validator {
        // TODO actually validate anything
        public function validate($collection, $reqBody) {
            $fields = [];
            if ($collection === 'msgs') {
                $fields['type'] = $reqBody['type'];
                if ($fields['type'] === 'image') {
                    $fields['url'] = $reqBody['url'];
                }
                else {
                    $fields['content'] = $reqBody['content'];
                    if ($fields['type'] === 'chara') $fields['charaId'] = $reqBody['charaId'];
                }
            }
            else if ($collection === 'charas') {
                $fields['name'] = $reqBody['name'];
                $fields['color'] = $reqBody['color'];
            }
            else if ($collection === 'meta') {
                throw new Exception('Not implemented');
            }
            else {
                throw new Exception('Invalid collection');
            }
            return $fields;
        }
    }
    return new Validator();
};
