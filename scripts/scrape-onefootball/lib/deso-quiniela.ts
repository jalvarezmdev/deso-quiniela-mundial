const API_BASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const SCRAPE_SECRET = process.env.SCRAPE_SECRET ?? "";

export class DesoQuiniela {
  private getAPIInstance(path: string, payload: Record<string, unknown>) {
    return {
      url: `${API_BASE_URL}/functions/v1/${path}`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_KEY}`,
        "x-scrape-secret": SCRAPE_SECRET,
      },
      body: JSON.stringify(payload),
    };
  }

  async getMatches() {
    try {
        const config = this.getAPIInstance('quinielas', {
            action: "list_matches",
        })
        const response = await fetch(config.url, {
            ...config,
            method: "POST"
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.log('[error] Failure resolving "quinielas"', error);
    }
  }
  async storeMatches(payload: Record<string, unknown>) {
     try {
        const config = this.getAPIInstance('scrape-onefootball', payload);
        const response = await fetch(config.url, {
            ...config,
            method: "POST"
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.log('[error] Failure resolving "scrape-onefootball"', error);
    }
  }
}
