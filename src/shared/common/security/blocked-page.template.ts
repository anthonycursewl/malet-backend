/**
 * Blocked Page HTML Template
 * Separated for easy customization and maintenance
 */

export interface BlockedPageParams {
  statusCode: number;
  reason: string;
  ip: string;
  path: string;
  requestId: string;
  timestamp: string;
  method?: string;
}

export function generateBlockedPageHtml(params: BlockedPageParams): string {
  const { statusCode, reason, ip, path, requestId, timestamp, method } = params;
  const truncatedPath = path.length > 40 ? `${path.substring(0, 40)}...` : path;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>Access Denied | ${statusCode}</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#e0e0e0 0%,#e7e7e7 50%,#e2e2e2 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
        .c{background:rgba(255,255,255,.95);border-radius:16px;box-shadow:0 25px 50px -12px rgba(0,0,0,.25);max-width:580px;width:100%;overflow:hidden}
        .h{background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);padding:40px 30px;text-align:center;position:relative}
        .sc{font-size:48px;font-weight:800;color:white;opacity:.3;position:absolute;top:10px;right:20px}
        .i{width:80px;height:80px;background:white;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;box-shadow:0 10px 30px rgba(0,0,0,.2)}
        .i svg{width:40px;height:40px;fill:#dc2626}
        .h h1{color:white;font-size:28px;font-weight:700;margin-bottom:8px}
        .h p{color:rgba(255,255,255,.9);font-size:16px}
        .ct{padding:30px}
        .rb{background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #dc2626;border-radius:8px;padding:16px 20px;margin-bottom:24px}
        .rb h3{color:#991b1b;font-size:14px;font-weight:600;margin-bottom:4px}
        .rb p{color:#b91c1c;font-size:15px;font-weight:500}
        .ig{display:grid;gap:12px}
        .ii{display:flex;justify-content:space-between;padding:12px 16px;background:#f8fafc;border-radius:8px;font-size:14px}
        .ii .l{color:#64748b;font-weight:500}
        .ii .v{color:#1e293b;font-weight:600;font-family:Monaco,Menlo,monospace;font-size:13px}
        .f{padding:20px 30px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center}
        .f p{color:#94a3b8;font-size:13px}
    </style>
</head>
<body>
    <div class="c">
        <div class="h">
            <span class="sc">${statusCode}</span>
            <div class="i">
                <svg viewBox="0 0 24 24"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z"/></svg>
            </div>
            <h1>Access Denied</h1>
            <p>Your request has been blocked</p>
        </div>
        <div class="ct">
            <div class="rb">
                <h3>Block Reason</h3>
                <p>${reason}</p>
            </div>
            <div class="ig">
                <div class="ii"><span class="l">Your IP</span><span class="v">${ip}</span></div>
                <div class="ii"><span class="l">Request ID</span><span class="v">${requestId}</span></div>
                ${method ? `<div class="ii"><span class="l">Method</span><span class="v">${method}</span></div>` : ''}
                <div class="ii"><span class="l">Timestamp</span><span class="v">${timestamp}</span></div>
                <div class="ii"><span class="l">Blocked Path</span><span class="v">${truncatedPath}</span></div>
            </div>
        </div>
        <div class="f">
            <p>Protected by Malet Security • ${requestId}</p>
        </div>
    </div>
</body>
</html>`;
}
