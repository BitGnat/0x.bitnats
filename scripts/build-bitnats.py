import pandas as pd
import json
import os
import gzip  # Import the gzip module

# Define the folder path containing the CSV files
data_folder = '../data'

# Initialize an empty list to store data from all CSV files
all_data = []

# Specify the correct column headers as per the CSV file (modify as needed)
column_headers = ['inscription_id', 'meta_name', 'meta_trait', 'high_res_img_url', 'collection_page_img_url']

# Loop through each CSV file in the folder
for file_name in sorted(os.listdir(data_folder)):  # Sort to ensure files are processed in order
    if file_name.endswith('.csv'):
        # Construct the full file path
        csv_file = os.path.join(data_folder, file_name)
        
        # Load the CSV file into a pandas DataFrame, skip the first row (CSV headers)
        df = pd.read_csv(csv_file, header=0, names=column_headers)
        
        # Create a function to transform each row to the desired format
        def row_to_json(row):
            return {
                "id": row['inscription_id'],
                "meta": {
                    "name": row['meta_name'],
                    "attributes": [
                        {
                            "trait_type": "Trait",
                            "value": row['meta_trait']
                        }
                    ]
                },
                "high_res_img_url": row['high_res_img_url'],
                "collection_page_img_url": row['collection_page_img_url']
            }
        
        # Apply the transformation to each row in the DataFrame
        json_data = df.apply(row_to_json, axis=1).tolist()
        
        # Append the JSON data from this CSV file to the all_data list
        all_data.extend(json_data)

# Define the output folder and filenames
output_folder = '../build'
json_output_file = os.path.join(output_folder, 'inscriptions.json')
gzip_output_file = os.path.join(output_folder, 'inscriptions.json.gz')

# Create the output directory if it doesn't exist
os.makedirs(output_folder, exist_ok=True)

# Write the JSON data to an uncompressed JSON file
with open(json_output_file, 'w') as json_file:
    json.dump(all_data, json_file, indent=2)

# Write the JSON data to a Gzip-compressed JSON file
with gzip.open(gzip_output_file, 'wt', encoding='utf-8') as gz_file:
    json.dump(all_data, gz_file, separators=(',', ':'))

print("All CSV data successfully combined and exported to both JSON and Gzip-compressed JSON!")
