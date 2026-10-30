import { writeFile } from "node:fs/promises";

export async function getToken(
  authority: string,
  audience: string,
  clientId: string,
  clientSecret: string,
  scope: string,
): Promise<string> {
  const tokenUrl = `${authority}/oauth/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      audience,
      scope,
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Dohvat tokena nije uspio: HTTP ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as { access_token?: string };

  if (!data.access_token) {
    throw new Error("Dohvat tokena nije uspio: odgovor ne sadrži access_token");
  }

  return data.access_token;
}

export async function issuePass(
  url: string,
  token: string,
  name: string,
  document: string,
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ name, document }),
  });

  if (!response.ok) {
    throw new Error(
      `Izdavanje propusnice nije uspjelo: HTTP ${response.status} ${response.statusText}`,
    );
  }

  const location = response.headers.get("location");
  if (!location) {
    throw new Error(
      "Izdavanje propusnice nije uspjelo: nedostaje Location zaglavlje",
    );
  }

  const id = location.split("/").pop();
  if (!id) {
    throw new Error(
      "Izdavanje propusnice nije uspjelo: iz Location zaglavlja nije moguće izdvojiti identifikator.",
    );
  }

  const pngBytes = await response.arrayBuffer();
  const png = Buffer.from(pngBytes);

  await writeFile(`${id}.png`, png);
}
