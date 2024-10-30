-- This file should undo anything in `up.sql`
PRAGMA foreign_keys = ON;

-- Drop the trigger first
DROP TRIGGER IF EXISTS set_beat_order_insert;

-- Create new table without the order_in_collection column
CREATE TABLE set_beat_new (
    beat_collection_id INTEGER NOT NULL,
    beat_id INTEGER NOT NULL,
    PRIMARY KEY (beat_collection_id, beat_id),
    FOREIGN KEY (beat_collection_id)
        REFERENCES beat_collection(id)
        ON DELETE CASCADE,
    FOREIGN KEY (beat_id)
        REFERENCES beats(id)
        ON DELETE CASCADE
);

-- Copy data back, excluding the order_in_collection column
INSERT INTO set_beat_new (beat_collection_id, beat_id)
SELECT beat_collection_id, beat_id
FROM set_beat;

-- Drop the modified table
DROP TABLE set_beat;

-- Rename new table back to original name
ALTER TABLE set_beat_new RENAME TO set_beat;