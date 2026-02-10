export class SimpleCookieJar {
  private cookies: Map<string, string> = new Map();

  public addFromHeaders(setCookieHeaders?: string[]) {
    if (!setCookieHeaders) return;

    setCookieHeaders.forEach((cookieStr) => {
      const mainPart = cookieStr.split(';')[0];
      const [key, ...valParts] = mainPart.split('=');
      const value = valParts.join('=');
      if (key && value) {
        this.cookies.set(key.trim(), value.trim());
      }
    });
  }

  public get(name: string): string | undefined {
    return this.cookies.get(name);
  }

  public getCookieString(): string {
    const parts: string[] = [];
    this.cookies.forEach((value, key) => {
      parts.push(`${key}=${value}`);
    });
    return parts.join('; ');
  }
}
