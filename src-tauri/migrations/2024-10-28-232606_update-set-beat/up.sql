PRAGMA foreign_keys = ON;

-- Create new table with desired structure including order_in_collection
CREATE TABLE set_beat_new (
    beat_collection_id INTEGER NOT NULL,
    beat_id INTEGER NOT NULL,
    order_in_collection INTEGER NOT NULL DEFAULT 0,  -- Added DEFAULT 0
    PRIMARY KEY (beat_collection_id, beat_id),
    FOREIGN KEY (beat_collection_id)
        REFERENCES beat_collection(id)
        ON DELETE CASCADE,
    FOREIGN KEY (beat_id)
        REFERENCES beats(id)
        ON DELETE CASCADE
);

-- Copy data from old table to new table
INSERT INTO set_beat_new (beat_collection_id, beat_id, order_in_collection)
SELECT
    beat_collection_id,
    beat_id,
    ROW_NUMBER() OVER (PARTITION BY beat_collection_id ORDER BY beat_id) as order_in_collection
FROM set_beat;

-- Drop old table
DROP TABLE set_beat;

-- Rename new table to original name
ALTER TABLE set_beat_new RENAME TO set_beat;

-- Create a trigger to automatically set order_in_collection for new rows
CREATE TRIGGER set_beat_order_insert
AFTER INSERT ON set_beat
FOR EACH ROW
BEGIN
    UPDATE set_beat
    SET order_in_collection = (
        SELECT COUNT(*)
        FROM set_beat
        WHERE beat_collection_id = NEW.beat_collection_id
    )
    WHERE beat_collection_id = NEW.beat_collection_id
    AND beat_id = NEW.beat_id;
END;