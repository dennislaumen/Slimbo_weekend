// Draait de web-app lokaal met de gestubde Firebase uit de rooktest (vaste testdata, schrijven wordt genegeerd).
const http = require("http"), fs = require("fs"), path = require("path");
const { FB, stubs } = require("./firebase-stub");
const root = path.resolve(__dirname, "../../web");
const types = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".webmanifest": "application/manifest+json" };
http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  if (url === "/config.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(`window.FIREBASE_CONFIG={apiKey:"x",projectId:"p"};`);
  if (url.startsWith("/__fb/")) return res.writeHead(200, { "content-type": "text/javascript" }).end(stubs[url.slice(6)] || "");
  let f = path.join(root, url.endsWith("/") ? url + "index.html" : url);
  if (!f.startsWith(root) || !fs.existsSync(f)) return res.writeHead(404).end();
  let body = fs.readFileSync(f);
  if (f.endsWith("index.html")) body = body.toString().replaceAll(FB, "/__fb/").replace("</head>", `<script>try{localStorage.getItem("app_eventId")||(localStorage.setItem("app_eventId","e1"),localStorage.setItem("app_tab","spellen"))}catch{}</script></head>`);
  res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }).end(body);
}).listen(process.env.PORT || 4173);
