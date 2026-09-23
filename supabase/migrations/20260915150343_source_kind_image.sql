-- An image is a third kind of source, alongside a file and a link.
--
-- On its own in a migration on purpose. Postgres will not let a new enum
-- value be added and then used inside the same transaction, so adding it
-- here and using it in the next migration is not tidiness, it is the only
-- order that works.
alter type source_kind add value if not exists 'image';
