# XO Game - Google Apps Script with Sheets Database

This is a simple Tic-Tac-Toe (XO) game implemented as a Google Apps Script Web App, using Google Sheets as the database to store the game state.

## Setup Instructions

1. **Create a Google Sheet:**
   - Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet.
   - Note the Spreadsheet ID from the URL (the long string between `/d/` and `/edit`).

2. **Create a Google Apps Script Project:**
   - Go to [Google Apps Script](https://script.google.com).
   - Create a new project.
   - Copy the contents of `Code.gs` into the script editor.
   - Replace `'YOUR_SPREADSHEET_ID'` with your actual Spreadsheet ID.
   - Create a new HTML file named `index.html` and copy the contents from `index.html`.

3. **Set Up the Sheet:**
   - In your Google Sheet, create a sheet named `GameBoard` (or change the name in the code if needed).
   - The script will initialize the board when you start a new game.

4. **Deploy as Web App:**
   - In the Apps Script editor, click "Deploy" > "New deployment".
   - Select type "Web app".
   - Set "Execute as" to "Me" and "Who has access" to "Anyone" (for testing; restrict for production).
   - Deploy and copy the web app URL.

5. **Play the Game:**
   - Open the web app URL in a browser.
   - Click "New Game" to initialize.
   - Click on cells to make moves.
   - The game alternates between X and O, checks for wins/draws, and updates the Sheet.

## Features

- 3x3 Tic-Tac-Toe board.
- Alternating turns between X and O.
- Win and draw detection.
- Game state stored in Google Sheets.
- Simple web UI.

## Notes

- This is a basic implementation. For production, add authentication, error handling, and security measures.
- The Sheet acts as the database, storing the current board, current player, and status.