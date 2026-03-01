import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.GEMINI_API_KEY;

async function run() {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    console.log("Fetching models...");
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Fetch failed:", res.status, res.statusText);
      console.error(await res.text());
      return;
    }
    const data = await res.json();
    console.log("Available models:");
    data.models.forEach((m: any) => {
      console.log(`- ${m.name}`);
    });
  } catch (err) {
    console.error(err);
  }
}

run();
