// Google Apps Script for XO Game using Sheets as database

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('XO Game')
    .setWidth(400)
    .setHeight(500);
}

function getSheet() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = 'GameBoard';
  var sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    // Create the sheet if it doesn't exist
    sheet = spreadsheet.insertSheet(sheetName);
  }
  
  return sheet;
}

function initializeBoard() {
  var sheet = getSheet();
  sheet.clear();
  sheet.getRange(1,1,3,3).setValues([
    ['','',''],
    ['','',''],
    ['','','']
  ]);
  sheet.getRange(4,1).setValue('Current Player: X');
  sheet.getRange(5,1).setValue('Status: Ongoing');
}

function makeMove(row, col) {
  var sheet = getSheet();
  // Batch read all data at once
  var data = sheet.getRange(1,1,5,1).getValues();
  var board = [data[0], data[1], data[2]];
  var currentPlayerValue = data[3][0].toString().trim();
  var statusValue = data[4][0].toString().trim();
  
  var currentPlayer = currentPlayerValue.split(': ')[1];
  var status = statusValue.split(': ')[1];

  if (board[row][col] !== '' || status !== 'Ongoing') {
    return {success: false, message: 'Invalid move'};
  }

  board[row][col] = currentPlayer;
  
  var winner = checkWinner(board);
  var updates = [];
  
  if (winner) {
    updates.push(['']);
    updates.push(['']);
    updates.push(['']);
    updates.push([currentPlayerValue]);
    updates.push(['Status: ' + winner + ' wins!']);
    sheet.getRange(1,1,5,1).setValues(updates);
    return {success: true, message: winner + ' wins!', board: board, status: winner + ' wins!'};
  } else if (isDraw(board)) {
    updates.push(['']);
    updates.push(['']);
    updates.push(['']);
    updates.push([currentPlayerValue]);
    updates.push(['Status: Draw']);
    sheet.getRange(1,1,5,1).setValues(updates);
    return {success: true, message: 'Draw', board: board, status: 'Draw'};
  } else {
    var nextPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updates = [board[0], board[1], board[2], ['Current Player: ' + nextPlayer], [statusValue]];
    sheet.getRange(1,1,5,1).setValues(updates);
    return {success: true, message: 'Move made', board: board, status: 'Ongoing', currentPlayer: nextPlayer};
  }
}

function checkWinner(board) {
  // Check rows, columns, diagonals
  for (var i = 0; i < 3; i++) {
    if (board[i][0] === board[i][1] && board[i][1] === board[i][2] && board[i][0] !== '') return board[i][0];
    if (board[0][i] === board[1][i] && board[1][i] === board[2][i] && board[0][i] !== '') return board[0][i];
  }
  if (board[0][0] === board[1][1] && board[1][1] === board[2][2] && board[0][0] !== '') return board[0][0];
  if (board[0][2] === board[1][1] && board[1][1] === board[2][0] && board[0][2] !== '') return board[0][2];
  return null;
}

function isDraw(board) {
  for (var i = 0; i < 3; i++) {
    for (var j = 0; j < 3; j++) {
      if (board[i][j] === '') return false;
    }
  }
  return true;
}

function getBoard() {
  var sheet = getSheet();
  // Batch read all data at once instead of separate calls
  var data = sheet.getRange(1,1,5,1).getValues();
  var board = [data[0], data[1], data[2]];
  var currentPlayerValue = data[3][0].toString().trim();
  var currentPlayer = currentPlayerValue.split(': ')[1] || 'X';
  var statusValue = data[4][0].toString().trim();
  var status = statusValue.split(': ')[1] || 'Ongoing';
  return {board: board, currentPlayer: currentPlayer, status: status};
}
