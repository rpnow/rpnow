<?php

$container = $app->getContainer();

$container['validate'] = function($c) {
    return function($collection, $reqBody) {
        $fields = [];
        if ($collection === 'message') {
            $fields['content'] = $reqBody['content'];
            $fields['type'] = $reqBody['type'];
            if ($fields['type'] === 'chara') $fields['charaId'] = $reqBody['charaId'];
        }
        else if ($collection === 'chara') {
            $fields['name'] = $reqBody['name'];
            $fields['color'] = $reqBody['color'];
        }
        else if ($collection === 'image') {
            $fields['url'] = $reqBody['url'];
        }
        else if ($collection === 'meta') {
            throw new Exception('Not implemented');
        }
        else {
            throw new Exception('Invalid collection');
        }
        return $fields;
    };
};
