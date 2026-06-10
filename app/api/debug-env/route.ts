import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

function cleanEnvValue(val?: string, jsonKey?: string) {
  if (!val) return "";
  let clean = val.trim();
  
  if (clean.startsWith("{")) {
    try {
      const parsed = JSON.parse(clean);
      if (jsonKey && parsed[jsonKey]) {
        clean = parsed[jsonKey].trim();
      } else if (parsed.client_email) {
        clean = parsed.client_email.trim();
      }
    } catch (e) {
      // ignore
    }
  }

  if (clean.startsWith('"') && clean.endsWith('"')) {
    clean = clean.slice(1, -1);
  }
  if (clean.startsWith("'") && clean.endsWith("'")) {
    clean = clean.slice(1, -1);
  }
  return clean;
}

function cleanPrivateKey(key?: string) {
  if (!key) return undefined;
  let cleanKey = key.trim();
  
  if (cleanKey.startsWith("{")) {
    try {
      const parsed = JSON.parse(cleanKey);
      if (parsed.private_key) {
        cleanKey = parsed.private_key.trim();
      }
    } catch (e) {
      // ignore
    }
  }
  
  const cleaned = cleanEnvValue(cleanKey);
  if (!cleaned) return undefined;
  
  return cleaned.replace(/\\n/g, "\n");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pass = searchParams.get("pass");

  if (pass !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: any = {
    GOOGLE_PRIVATE_KEY: {
      exists: !!process.env.GOOGLE_PRIVATE_KEY,
      length: process.env.GOOGLE_PRIVATE_KEY?.length || 0,
      startsWith: process.env.GOOGLE_PRIVATE_KEY?.substring(0, 30),
      endsWith: process.env.GOOGLE_PRIVATE_KEY?.substring((process.env.GOOGLE_PRIVATE_KEY?.length || 0) - 30),
      containsNewlines: process.env.GOOGLE_PRIVATE_KEY?.includes("\n"),
      containsEscapedNewlines: process.env.GOOGLE_PRIVATE_KEY?.includes("\\n"),
      startsWithBrace: process.env.GOOGLE_PRIVATE_KEY?.trim().startsWith("{"),
    },
    GOOGLE_CLIENT_EMAIL: {
      exists: !!process.env.GOOGLE_CLIENT_EMAIL,
      value: process.env.GOOGLE_CLIENT_EMAIL,
    },
    GOOGLE_SHEETS_SPREADSHEET_ID: {
      exists: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      value: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    },
    GOOGLE_APPLICATION_CREDENTIALS: {
      exists: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      value: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    },
  };

  // Try cleaning
  try {
    const cleanedKey = cleanPrivateKey(process.env.GOOGLE_PRIVATE_KEY);
    const cleanedEmail = cleanEnvValue(process.env.GOOGLE_CLIENT_EMAIL, "client_email");
    const cleanedSheetId = cleanEnvValue(process.env.GOOGLE_SHEETS_SPREADSHEET_ID);

    results.cleaned = {
      keyLength: cleanedKey?.length || 0,
      keyStartsWith: cleanedKey?.substring(0, 30),
      keyEndsWith: cleanedKey?.substring((cleanedKey?.length || 0) - 30),
      keyHasNewlines: cleanedKey?.includes("\n"),
      email: cleanedEmail,
      sheetId: cleanedSheetId,
    };

    // Try Google Auth init
    const authOptions: any = {
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    };

    if (cleanedKey && cleanedEmail) {
      authOptions.credentials = {
        client_email: cleanedEmail,
        private_key: cleanedKey,
      };
    } else {
      authOptions.keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }

    const auth = new google.auth.GoogleAuth(authOptions);
    results.authInit = "Success";

    const sheets = google.sheets({ version: "v4", auth });
    results.sheetsInit = "Success";

    // Try fetching sheet headers
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: cleanedSheetId,
      range: "Interns!A1:B1",
    });
    results.sheetsFetch = {
      success: true,
      values: response.data.values,
    };
  } catch (err: any) {
    results.error = {
      message: err.message,
      stack: err.stack,
    };
  }

  return NextResponse.json(results);
}
