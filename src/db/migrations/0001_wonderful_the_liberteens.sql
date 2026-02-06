ALTER TABLE `messages` ADD `language_code` text;
UPDATE `messages` SET `language_code` = 'ru' WHERE `language_code` IS NULL;