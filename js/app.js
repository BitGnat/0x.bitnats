// List of JSON files
const files = [
    'data/0-1_valid-bitnats.json', 
    'data/1-2_valid-bitnats.json',
    'data/2-3_valid-bitnats.json',
    'data/3-4_valid-bitnats.json',
    'data/4-5_valid-bitnats.json',
    'data/5-6_valid-bitnats.json',
    'data/6-7_valid-bitnats.json',
    'data/7-8_valid-bitnats.json',
    'data/8-9_valid-bitnats.json',
];

// Function to search for a specific block and display data
async function searchBlock() {
    const blockInput = document.getElementById('blockInput').value.trim();  // Get user input
    const jsonContainer = document.getElementById('jsonContainer');
    let found = false;  // Track if the block is found

    // Clear previous results
    jsonContainer.innerHTML = '';

    if (!blockInput) {
        jsonContainer.innerHTML = `<p>Please enter a valid block number.</p>`;
        return;
    }

    // Loop through each JSON file
    for (const file of files) {
        try {
            const response = await fetch(file);  // Fetch each JSON file
            const jsonData = await response.json();  // Parse the JSON data

            // Loop through each item in the JSON data array
            for (const item of jsonData) {
                const baseBlock = item['base-bitnats-block'].split('.')[0];  // Extract block number from 'base-bitnats-block'

                // If block number matches user input, display the data
                if (baseBlock === blockInput) {
                    jsonContainer.innerHTML = `
                        <p><strong>base-bitnats-block:</strong> ${item['base-bitnats-block']}</p>
                        <p><strong>inscription_num:</strong> ${item['inscription_num']}</p>
                        <p><strong>inscription-id_i0:</strong> ${item['inscription-id_0']}</p>
                        <p><strong>block-trait:</strong> ${item['block-trait']}</p>
                        <p><strong>block-trait-image:</strong><br> 
                        <img src="${item['url-image']}" alt="Image for ${item['block-trait']}" width="200"></p>
                    `;
                    found = true;
                    break;  // Stop searching once the block is found
                }
            }

            if (found) break;  // Stop searching through files if the block is found

        } catch (error) {
            console.error('Error fetching or parsing JSON:', error);
        }
    }

    // If the block was not found
    if (!found) {
        jsonContainer.innerHTML = `<p>Block number ${blockInput} not found.</p>`;
    }
}

// Trigger search when Enter key is pressed
document.getElementById('blockInput').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        searchBlock();
    }
}); 
