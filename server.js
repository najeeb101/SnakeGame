const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const publicRoot = path.join(__dirname, "public");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

function isInsideRoot(basePath, targetPath) {
  const relativePath = path.relative(basePath, targetPath);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

function sendFile(filePath, res) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Server error");
      return;
    }

    const contentType =
      mimeTypes[path.extname(filePath).toLowerCase()] ||
      "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method Not Allowed");
    return;
  }

  let pathname;

  try {
    const requestUrl = new URL(
      req.url,
      `http://${req.headers.host || "localhost"}`,
    );
    pathname = decodeURIComponent(requestUrl.pathname);
  } catch (error) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad Request");
    return;
  }

  if (pathname === "/") {
    pathname = "/index.html";
  } else if (pathname.endsWith("/")) {
    pathname = `${pathname}index.html`;
  }

  const filePath = path.resolve(publicRoot, `.${pathname}`);
  if (!isInsideRoot(publicRoot, filePath)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (!statError && stats.isFile()) {
      if (req.method === "HEAD") {
        const contentType =
          mimeTypes[path.extname(filePath).toLowerCase()] ||
          "application/octet-stream";
        res.writeHead(200, {
          "Content-Type": contentType,
          "Cache-Control": "no-cache",
          "X-Content-Type-Options": "nosniff",
        });
        res.end();
        return;
      }

      sendFile(filePath, res);
      return;
    }

    if (path.extname(pathname) === "") {
      const fallbackPath = path.join(publicRoot, "index.html");
      if (req.method === "HEAD") {
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache",
          "X-Content-Type-Options": "nosniff",
        });
        res.end();
        return;
      }

      sendFile(fallbackPath, res);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
  });
});

const port = Number(process.env.PORT) || 3002;
server.listen(port, "0.0.0.0", () => {
  const address = server.address();
  const actualPort =
    typeof address === "object" && address ? address.port : port;
  console.log(`Snake Game server running at http://localhost:${actualPort}/`);
});
