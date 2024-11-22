// src-tauri/src/lib.rs
use tokio::sync::watch;
pub mod benchmarks;
pub mod audio_analysis;
pub mod db;
pub mod models;
pub mod schema;
pub mod store;



#[derive(Clone)]
pub struct CancellationToken {
    sender: watch::Sender<bool>,
    receiver: watch::Receiver<bool>,
}

impl CancellationToken {
    pub fn new() -> Self {
        let (sender, receiver) = watch::channel(false);
        Self { sender, receiver }
    }

    pub fn cancel(&self) {
        let _ = self.sender.send(true);
    }

    pub fn is_cancelled(&self) -> bool {
        *self.receiver.borrow()
    }
}


// Re-export commonly used items
pub use audio_analysis::AnalysisError;
pub use models::{Beat, BeatCollection, BeatChangeset, CollOrder, CollectionChangeset};
pub use schema::*;

