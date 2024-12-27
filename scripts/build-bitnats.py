import pandas as pd
import json
import os
import shutil

# Define the folder paths
data_folder = '../csv'
output_folder = '../build'

# Clear the output folder by removing all files within it
if os.path.exists(output_folder):
    # Remove all files and folders within the output folder
    for filename in os.listdir(output_folder):
        file_path = os.path.join(output_folder, filename)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)  # Remove file or symbolic link
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)  # Remove directory
        except Exception as e:
            print(f'Failed to delete {file_path}. Reason: {e}')
else:
    os.makedirs(output_folder)  # Create the output directory if it doesn't exist

# Specify the correct column headers as per the CSV file (modify as needed)
column_headers = ['inscription_id', 'meta_name', 'meta_trait', 'high_res_img_url', 'low_res_img_url']

# Loop through each CSV file in the data folder
for file_name in sorted(os.listdir(data_folder)):  # Sort to ensure files are processed in order
    if file_name.endswith('.csv'):
        # Construct the full path for the CSV file
        csv_file = os.path.join(data_folder, file_name)
        
        # Load the CSV file into a pandas DataFrame, skipping the first row (CSV headers)
        df = pd.read_csv(csv_file, header=0, names=column_headers)
        
        # Create a function to transform each row to the desired format
        def row_to_json(row):
            return {
                "id": row['inscription_id'],
                "meta": {
                    "name": row['meta_name'],
                    "high_res_img_url": row['high_res_img_url'],
                    "collection_page_img_url": row['low_res_img_url'],
                    "attributes": [
                        {
                            "trait_type": "Trait",
                            "value": row['meta_trait']
                        }
                    ]                    
                }
            }
        
        # Apply the transformation to each row in the DataFrame
        json_data = df.apply(row_to_json, axis=1).tolist()
        
        # Prepare the output filename based on the input CSV filename and appending '_inscriptions'
        base_name = file_name.replace('.csv', '_inscriptions')
        json_output_file = os.path.join(output_folder, f"{base_name}.json")
        
        # Write the JSON data to an uncompressed JSON file
        with open(json_output_file, 'w') as json_file:
            json.dump(json_data, json_file, indent=2)
        
        print(f"Processed and exported {file_name} to {base_name}.json.")
