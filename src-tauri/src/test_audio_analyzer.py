import subprocess

# Path to your audio file
audio_file_path = 'C:/Users/total/Downloads/magnum opus.wav'  # Update with a valid audio file path

# Path to the executable
exe_path = 'C:/Users/total/OneDrive/Documents/beatbank-senior-project/src-tauri/dist/audio_analyzer-x86_64-pc-windows-msvc.exe'

try:
    # Run the executable with the audio file path as an argument
    result = subprocess.run([exe_path, audio_file_path], capture_output=True, text=True)
    
    # Print the output from the executable
    print("Output:", result.stdout)
    print("Errors:", result.stderr)

    if result.returncode != 0:
        print("The executable did not run successfully.")
except Exception as e:
    print(f"An error occurred: {e}")
