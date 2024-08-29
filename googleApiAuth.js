const { google } = require('googleapis');
const sheets = google.sheets('v4');
const path = require('path');

// Cargar las credenciales del archivo JSON
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, '/etc/secrets/itinerarios-urls-credentials.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// ID de la hoja de cálculo (puedes obtenerlo de la URL de la hoja)
const SPREADSHEET_ID = '1osM_6IRcq1oqYz9ObNazzHDDUDcp_rHkKr2k2VzxXaI';

async function getSheetData(range) {
  const client = await auth.getClient();
  const response = await sheets.spreadsheets.values.get({
    auth: client,
    spreadsheetId: SPREADSHEET_ID,
    range: range,
  });

  return response.data.values;
}

// Exportar la función usando CommonJS
module.exports = {
  getSheetData
};