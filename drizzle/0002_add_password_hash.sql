-- Migration: add passwordHash column and make email unique
ALTER TABLE `users`
  ADD COLUMN `passwordHash` varchar(255) DEFAULT NULL AFTER `email`;

ALTER TABLE `users`
  ADD UNIQUE INDEX `users_email_unique` (`email`);
