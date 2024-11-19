use std::env;
use std::fs;
use std::path::Path;

fn main() {
    // First, run the Tauri build - this is essential!
    tauri_build::build();

    // Get the output directory where cargo will put our built binary
    let profile = env::var("PROFILE").unwrap();

    // Only do this for release builds
    if profile == "release" {
        println!("Setting up Python binary for release build...");
        
        // Get the target directory where Tauri will create the final bundle
        let target_dir = Path::new("src-tauri")
            .join("target")
            .join(profile)
            .join("bundle")
            .join("resources");

        // Create the resources directory if it doesn't exist
        fs::create_dir_all(&target_dir).unwrap_or_else(|e| {
            println!("Failed to create resources directory: {}", e);
        });

        // Source path of your Python binary
        let src_path = Path::new("src-tauri").join("dist");
        
        #[cfg(target_os = "windows")]
        {
            let binary_name = "audio_analyzer.exe";
            println!("Copying {} to resources directory...", binary_name);
            fs::copy(
                src_path.join(binary_name),
                target_dir.join(binary_name)
            ).unwrap_or_else(|e| {
                println!("Failed to copy Windows binary: {}", e);
                0
            });
        }

        #[cfg(target_os = "macos")]
        {
            let binary_name = "audio_analyzer";
            println!("Copying {} to resources directory...", binary_name);
            fs::copy(
                src_path.join(binary_name),
                target_dir.join(binary_name)
            ).unwrap_or_else(|e| {
                println!("Failed to copy macOS binary: {}", e);
                0
            });
            
            // Make sure the binary is executable on macOS
            use std::os::unix::fs::PermissionsExt;
            let dest_file = target_dir.join(binary_name);
            if let Ok(mut perms) = fs::metadata(&dest_file).map(|m| m.permissions()) {
                perms.set_mode(0o755);
                fs::set_permissions(&dest_file, perms).unwrap_or_else(|e| {
                    println!("Failed to set permissions: {}", e);
                });
            }
        }
    }
}