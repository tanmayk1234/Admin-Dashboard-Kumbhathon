import { google } from "googleapis";

function getSheetsClient() {
  // Use separate credentials for Vercel, fallback to keyFile for local Windows dev
  const authOptions: any = {
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  };

  if (process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_CLIENT_EMAIL) {
    authOptions.credentials = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      // Handle escaped newlines in the private key from Vercel env
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  } else {
    authOptions.keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  const auth = new google.auth.GoogleAuth(authOptions);
  return google.sheets({ version: "v4", auth });
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

// ── Simple in-memory cache to reduce Google Sheets API calls ──

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache: Record<string, CacheEntry<unknown>> = {};
const CACHE_TTL_MS = 15_000; // 15 seconds

function getCached<T>(key: string): T | null {
  const entry = cache[key] as CacheEntry<T> | undefined;
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data;
  }
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache[key] = { data, timestamp: Date.now() };
}

function invalidateCache(prefix: string): void {
  for (const key of Object.keys(cache)) {
    if (key.startsWith(prefix)) {
      delete cache[key];
    }
  }
}

// ── Interns Tab ──

export async function getInterns(): Promise<string[][]> {
  const cached = getCached<string[][]>("interns");
  if (cached) return cached;

  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Interns!A:I",
  });
  const data = response.data.values || [];
  setCache("interns", data);
  return data;
}

export async function getInternById(
  internId: string
): Promise<string[] | null> {
  const rows = await getInterns();
  // Skip header row (index 0)
  const intern = rows.find((row, index) => index > 0 && row[0] === internId);
  return intern || null;
}

export async function getInternCount(): Promise<number> {
  const rows = await getInterns();
  // Subtract 1 for header row
  return Math.max(0, rows.length - 1);
}

export async function appendIntern(values: string[]): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "Interns!A:I",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [values],
    },
  });
  // Invalidate cache after write
  invalidateCache("interns");
}

// ── Intern Specific Tabs ──

export async function createInternTab(fullName: string, internId: string): Promise<void> {
  const sheets = getSheetsClient();
  const title = `${fullName} (${internId})`;

  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: title,
              },
            },
          },
        ],
      },
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${title}'!A1:F1`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          ["Date", "Check In Time", "Check Out Time", "Total Hours", "Check In GPS", "Check Out GPS"],
        ],
      },
    });
  } catch (error: any) {
    console.error("Error creating intern tab. It may already exist:", error.message);
  }
}

export async function getInternAttendance(internTabName: string): Promise<string[][]> {
  const sheets = getSheetsClient();
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${internTabName}'!A:F`,
    });
    return response.data.values || [];
  } catch (e) {
    return [];
  }
}

export async function logCheckIn(
  internTabName: string, 
  date: string, 
  time: string, 
  gps: string
): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${internTabName}'!A:F`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[date, time, "", "", gps, ""]],
    },
  });
}

export async function logCheckOut(
  internTabName: string,
  date: string,
  time: string,
  gps: string,
  totalHours: string
): Promise<void> {
  const rows = await getInternAttendance(internTabName);
  const rowIndex = rows.findIndex((row) => row[0] === date);
  
  if (rowIndex === -1) {
    throw new Error("No check-in found for today");
  }

  const sheetRow = rowIndex + 1;
  const sheets = getSheetsClient();

  const rowToUpdate = [...rows[rowIndex]];
  rowToUpdate[2] = time; // Check Out Time
  rowToUpdate[3] = totalHours; // Total Hours
  rowToUpdate[5] = gps; // Check Out GPS

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${internTabName}'!A${sheetRow}:F${sheetRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [rowToUpdate],
    },
  });
}

export async function getTodayActions(
  intern: string[] // [internId, fullName, ...]
): Promise<{ type: string; time: string; date: string }[]> {
  if (!intern || intern.length < 2) return [];
  const tabName = `${intern[1]} (${intern[0]})`;

  const rows = await getInternAttendance(tabName);
  if (rows.length === 0) return [];

  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  const today = istDate.toISOString().split("T")[0];

  const todayRow = rows.find((row) => row[0] === today);
  if (!todayRow) return [];

  const actions = [];
  if (todayRow[1]) {
    actions.push({ type: "CHECK_IN", time: todayRow[1], date: today });
  }
  if (todayRow[2]) {
    actions.push({ type: "CHECK_OUT", time: todayRow[2], date: today });
  }
  return actions;
}

// ── Stats Helpers ──

export async function getDashboardStats() {
  const interns = await getInterns();
  const internRows = interns.slice(1); // Skip header

  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  const today = istDate.toISOString().split("T")[0];

  let todayCheckIns = 0;
  let currentlyInside = 0;
  const allRecentAttendance: string[][] = [];

  // Fetch all intern tabs concurrently
  await Promise.all(
    internRows.map(async (intern) => {
      const tabName = `${intern[1]} (${intern[0]})`;
      const rows = await getInternAttendance(tabName);
      
      if (rows.length > 1) { // has data beyond header
        const todayRow = rows.find(r => r[0] === today);
        if (todayRow && todayRow[1]) {
          todayCheckIns++;
          if (!todayRow[2]) {
            // Checked in but not checked out
            currentlyInside++;
          }
        }

        // Add recent rows to a unified list (last 10 rows per intern)
        // Format them like the old attendance sheet for the dashboard display
        // Old Format: [Log ID, Intern ID, Full Name, Type, Date, Time, Lat, Lng, Dist, Fingerprint]
        const recentRows = rows.slice(-10).reverse();
        for (const r of recentRows) {
          if (r[0] === "Date") continue; // Skip header
          
          if (r[2]) {
             allRecentAttendance.push([
               `LOG-${r[0]}-OUT`, intern[0], intern[1], "CHECK_OUT", r[0], r[2], "", "", "", ""
             ]);
          }
          if (r[1]) {
             allRecentAttendance.push([
               `LOG-${r[0]}-IN`, intern[0], intern[1], "CHECK_IN", r[0], r[1], r[4] || "", "", "", ""
             ]);
          }
        }
      }
    })
  );

  // Sort unified attendance by date/time descending
  allRecentAttendance.sort((a, b) => {
    // combine date and time string
    const timeA = new Date(`${a[4]} ${a[5]}`).getTime();
    const timeB = new Date(`${b[4]} ${b[5]}`).getTime();
    return timeB - timeA;
  });

  return {
    totalInterns: internRows.length,
    todayCheckIns,
    currentlyInside,
    interns: internRows,
    attendance: allRecentAttendance.slice(0, 100), // Send last 100 events
    internHeaders: interns[0] || [],
    attendanceHeaders: [
      "Log ID", "Intern ID", "Full Name", "Type", "Date", "Time", 
      "Latitude", "Longitude", "Distance from Office", "Device Fingerprint"
    ],
  };
}
