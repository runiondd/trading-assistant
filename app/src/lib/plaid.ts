import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";

function getPlaidClient(): PlaidApi | null {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = process.env.PLAID_ENV || "sandbox";

  if (!clientId || !secret) return null;

  const configuration = new Configuration({
    basePath: PlaidEnvironments[env],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });

  return new PlaidApi(configuration);
}

export const plaidClient = getPlaidClient();
export const isPlaidConfigured = () => plaidClient !== null;

export async function createLinkToken(): Promise<string> {
  if (!plaidClient) throw new Error("Plaid not configured");

  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: "trading-helper-user" },
    client_name: "Trading Helper",
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: "en",
  });

  return response.data.link_token;
}

export async function exchangePublicToken(publicToken: string) {
  if (!plaidClient) throw new Error("Plaid not configured");

  const exchangeResponse = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });

  const accessToken = exchangeResponse.data.access_token;

  const accountsResponse = await plaidClient.accountsGet({
    access_token: accessToken,
  });

  return {
    accessToken,
    accounts: accountsResponse.data.accounts,
  };
}

export async function refreshBalances(accessToken: string) {
  if (!plaidClient) throw new Error("Plaid not configured");

  const response = await plaidClient.accountsGet({
    access_token: accessToken,
  });

  return response.data.accounts;
}
