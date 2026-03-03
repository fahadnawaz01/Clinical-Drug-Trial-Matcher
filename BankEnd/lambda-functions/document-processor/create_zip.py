import zipfile
import os

print("Creating deployment package...")

with zipfile.ZipFile('lambda-deploy.zip', 'w', zipfile.ZIP_DEFLATED) as zipf:
    # Add src
    print("Adding src/...")
    for root, dirs, files in os.walk('src'):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, '.')
            zipf.write(file_path, arcname)
    
    # Add package.json
    print("Adding package.json...")
    zipf.write('package.json', 'package.json')
    
    # Add node_modules
    print("Adding node_modules... (this may take a while)")
    count = 0
    for root, dirs, files in os.walk('node_modules'):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, '.')
            try:
                zipf.write(file_path, arcname)
                count += 1
                if count % 100 == 0:
                    print(f"  Added {count} files...")
            except Exception as e:
                print(f"  Skipping {file_path}: {e}")

print(f"Zip created successfully with {count} files from node_modules")
