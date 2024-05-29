/* @name selectOne */
SELECT 1 as one;

/* @name selectTwo */
SELECT 2 as two;

/* @name updateDocById */
UPDATE docs
SET body = :body, revision = :revision, updated_at = now()
WHERE id = :id;

/* @name dropDocTags */
DELETE FROM doc_tags
WHERE doc_id = :id;

/* @name insertDocTags */
INSERT INTO doc_tags (doc_id, doc_location, tag_name)
VALUES (:doc_id, :doc_location, :tag_name);

/* @name updateDocById */
UPDATE docs
SET body = :body, revision = :revision, updated_at = now()
WHERE id = :id;

/* @name dropDocTags */
DELETE FROM doc_tags
WHERE doc_id = :id;

/* @name insertDocTags */
INSERT INTO doc_tags (doc_id, doc_location, tag_name)
VALUES (:doc_id, :doc_location, :tag_name);

